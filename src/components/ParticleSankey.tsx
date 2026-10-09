import { useEffect, useMemo, useRef, useState } from 'react';
import type { Framework, Subcategory, TimeRecord } from '../types';

interface Props {
  records: TimeRecord[];
  frameworks: Framework[];
  subcategories: Subcategory[];
  height?: number;
}

interface Link {
  from: { x: number; y: number; name: string };
  to: { x: number; y: number; name: string; color: string };
  value: number; // 分钟
  speed: number; // 0..1
}

interface Particle {
  t: number; // 0..1 沿路径
  linkIdx: number;
  size: number;
  alpha: number;
  hue: string;
  /** 子粒子（在拐点分裂后从框架飞到细分） */
  child?: boolean;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function ParticleSankey({ records, frameworks, subcategories, height = 320 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const linksRef = useRef<Link[]>([]);
  const reducedRef = useRef<boolean>(false);
  const dprRef = useRef<number>(1);
  const lastSpawnRef = useRef<number>(0);

  const { fwMap, subMap, totals } = useMemo(() => {
    const fwMap = new Map(frameworks.map((f) => [f.id, f]));
    const subMap = new Map(subcategories.map((s) => [s.id, s]));
    const totals = new Map<string, number>();
    for (const r of records) {
      const fw = fwMap.get(r.frameworkId);
      if (fw) totals.set(fw.id, (totals.get(fw.id) || 0) + r.durationMin);
    }
    return { fwMap, subMap, totals };
  }, [records, frameworks, subcategories]);

  // 仅在支持 canvas 时才进行粒子渲染；否则显示降级图
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
  }, []);

  // 计算布局 & 链接
  const layout = (width: number) => {
    const padTop = 24;
    const padBottom = 24;
    const padLeft = 16;
    const padRight = 16;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const sourceX = padLeft + 4;
    const midX = padLeft + innerW * 0.45;
    const rightX = padLeft + innerW * 0.95;

    // 1) 左侧源点
    const sourceY = padTop + innerH / 2;
    const source = { x: sourceX, y: sourceY, name: '你', color: '#F0B90B' };

    // 2) 中间 framework 节点：按总时长分布
    const fws = frameworks.filter((f) => (totals.get(f.id) || 0) > 0);
    const totalFw = fws.reduce((s, f) => s + (totals.get(f.id) || 0), 0);
    let cy = padTop;
    const fwNodes: { x: number; y: number; name: string; color: string }[] = [];
    for (const f of fws) {
      const ratio = (totals.get(f.id) || 0) / (totalFw || 1);
      const h = ratio * innerH;
      const y = cy + h / 2;
      fwNodes.push({ x: midX, y, name: f.name, color: f.color });
      cy += h;
    }

    // 3) 右侧 subcategory 节点
    const subs = subcategories.filter((s) => {
      const fw = fwMap.get(s.frameworkId);
      return fw && (totals.get(fw.id) || 0) > 0;
    });
    const totalSub = subs.reduce((s, sub) => {
      const v = records
        .filter((r) => r.subcategoryId === sub.id)
        .reduce((a, r) => a + r.durationMin, 0);
      return s + v;
    }, 0);
    let sy = padTop;
    const subNodes: { x: number; y: number; name: string; color: string; subId: string }[] = [];
    for (const sub of subs) {
      const v = records
        .filter((r) => r.subcategoryId === sub.id)
        .reduce((a, r) => a + r.durationMin, 0);
      if (v <= 0) continue;
      const ratio = v / (totalSub || 1);
      const h = ratio * innerH;
      const y = sy + h / 2;
      const fw = fwMap.get(sub.frameworkId);
      subNodes.push({ x: rightX, y, name: sub.name, color: fw?.color ?? '#848E9C', subId: sub.id });
      sy += h;
    }

    // 4) 构建两段链接：source→framework, framework→sub
    const links: Link[] = [];
    for (const f of fwNodes) {
      const fw = frameworks.find((fw) => fw.name === f.name);
      const v = totals.get(fw?.id ?? '') || 0;
      links.push({
        from: { ...source },
        to: { x: f.x, y: f.y, name: f.name, color: f.color },
        value: v,
        speed: 0.6 + Math.min(0.4, v / 60),
      });
    }
    for (const s of subNodes) {
      const fw = frameworks.find((f) => f.name === s.name || (subMap.get(s.subId)?.frameworkId ?? '') === f.id);
      // 用 sub 的 framework 找节点
      const sub = subMap.get(s.subId);
      const fwId = sub?.frameworkId;
      const fwNode = fwNodes.find((f) => f.name === frameworks.find((x) => x.id === fwId)?.name);
      if (!fwNode) continue;
      const v = records.filter((r) => r.subcategoryId === s.subId).reduce((a, r) => a + r.durationMin, 0);
      links.push({
        from: { x: fwNode.x, y: fwNode.y, name: fwNode.name },
        to: { x: s.x, y: s.y, name: s.name, color: s.color },
        value: v,
        speed: 0.5 + Math.min(0.4, v / 90),
      });
    }

    return { links, fwNodes, subNodes, source };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    if (!supported) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setSupported(false);
      return;
    }

    dprRef.current = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = wrap.clientWidth;
      const dpr = dprRef.current;
      canvas.width = w * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const l = layout(w);
      linksRef.current = l.links;
    };
    resize();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const handlePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let found = -1;
      for (let i = 0; i < linksRef.current.length; i++) {
        const lk = linksRef.current[i];
        // 测到中点附近 30px 内
        const mx = (lk.from.x + lk.to.x) / 2;
        const my = (lk.from.y + lk.to.y) / 2;
        const d = Math.hypot(x - mx, y - my);
        if (d < 28) {
          found = i;
          break;
        }
      }
      setHoverIdx(found);
    };
    const onLeave = () => setHoverIdx(null);
    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t) handlePointer(new PointerEvent('pointermove', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: true });

    // 主循环
    const draw = (now: number) => {
      const w = canvas.width / dprRef.current;
      ctx.clearRect(0, 0, w, height);

      const links = linksRef.current;
      if (links.length === 0) {
        ctx.fillStyle = 'rgba(132,142,156,0.6)';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', w / 2, height / 2);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // 1) 背景：画连接曲线（淡色）
      for (let i = 0; i < links.length; i++) {
        const lk = links[i];
        const isHover = hoverIdx === i || hoverIdx === null;
        const opacity = hoverIdx === null ? 0.22 : isHover ? 0.7 : 0.08;
        ctx.beginPath();
        ctx.moveTo(lk.from.x, lk.from.y);
        const cx1 = (lk.from.x + lk.to.x) / 2;
        const cy1 = lk.from.y;
        const cx2 = (lk.from.x + lk.to.x) / 2;
        const cy2 = lk.to.y;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, lk.to.x, lk.to.y);
        ctx.strokeStyle = lk.to.color + Math.round(opacity * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = Math.max(1.5, Math.min(6, lk.value / 30));
        ctx.stroke();
      }

      // 2) 发射粒子
      const spawnInterval = reducedRef.current ? 220 : 70;
      if (!reducedRef.current && now - lastSpawnRef.current > spawnInterval) {
        lastSpawnRef.current = now;
        // 按 value 比例分配发射概率
        for (let i = 0; i < links.length; i++) {
          const lk = links[i];
          if (lk.value <= 0) continue;
          const prob = Math.min(1, lk.value / 60);
          if (Math.random() < prob) {
            particlesRef.current.push({
              t: 0,
              linkIdx: i,
              size: 1.6 + Math.random() * 1.4,
              alpha: 0.8 + Math.random() * 0.2,
              hue: lk.to.color,
            });
          }
        }
      }

      // 3) 更新并绘制粒子
      const next: Particle[] = [];
      for (const p of particlesRef.current) {
        p.t += 0.012 * (links[p.linkIdx]?.speed ?? 0.6) * (reducedRef.current ? 0.4 : 1);
        if (p.t >= 1) continue;
        const lk = links[p.linkIdx];
        const x = bezierX(lk.from.x, lk.to.x, p.t);
        const y = bezierY(lk.from.y, lk.to.y, p.t);
        // 绘制粒子（圆形 + 微弱光晕）
        const isHover = hoverIdx === null || hoverIdx === p.linkIdx;
        const a = p.alpha * (isHover ? 1 : 0.25);
        ctx.beginPath();
        ctx.fillStyle = hexWithAlpha(p.hue, a);
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // 光晕
        ctx.beginPath();
        ctx.fillStyle = hexWithAlpha(p.hue, a * 0.25);
        ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
        next.push(p);
      }
      particlesRef.current = next;

      // 4) 节点圆
      const drawNode = (n: { x: number; y: number; name: string; color: string }, isRight: boolean) => {
        // 呼吸光晕
        const breath = 0.5 + 0.5 * Math.sin(now / 700);
        ctx.beginPath();
        ctx.fillStyle = hexWithAlpha(n.color, 0.18 + 0.12 * breath);
        ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
        ctx.fill();
        // 实心
        ctx.beginPath();
        ctx.fillStyle = n.color;
        ctx.arc(n.x, n.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // 标签
        ctx.fillStyle = '#EAECEF';
        ctx.font = '11px sans-serif';
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const labelX = isRight ? n.x + 10 : n.x - 10;
        ctx.fillText(truncate(ctx, n.name, isRight ? 60 : 60), labelX, n.y);
      };
      const cur = layout(w);
      drawNode(cur.source, false);
      cur.fwNodes.forEach((n) => drawNode(n, false));
      cur.subNodes.forEach((n) => drawNode(n, true));

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', handlePointer);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, frameworks, subcategories, height, supported, hoverIdx]);

  const hoverInfo = hoverIdx != null ? linksRef.current[hoverIdx] : null;
  const total = records.reduce((s, r) => s + r.durationMin, 0);

  return (
    <div ref={wrapRef} className="relative rounded-2xl border border-line bg-bg-card p-3">
      {supported ? (
        <>
          <canvas ref={canvasRef} className="block w-full touch-none" />
          {hoverInfo && (
            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md border border-binance/40 bg-bg-card/95 px-2 py-1 text-[11px] text-text shadow">
              {hoverInfo.from.name} → <span style={{ color: hoverInfo.to.color }}>{hoverInfo.to.name}</span>
              <span className="ml-1.5 text-text-secondary">· {hoverInfo.value} 分钟</span>
            </div>
          )}
          {reducedRef.current && (
            <p className="absolute bottom-2 right-3 text-[10px] text-text-secondary">降级：减少动画</p>
          )}
          {total === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-secondary">
              还没有数据
            </div>
          )}
        </>
      ) : (
        <p className="p-6 text-center text-sm text-text-secondary">当前设备不支持此视图</p>
      )}
    </div>
  );
}

function bezierX(x0: number, x1: number, t: number): number {
  const cx1 = (x0 + x1) / 2;
  const cx2 = (x0 + x1) / 2;
  const e = easeInOut(t);
  // (1-t)^3 x0 + 3(1-t)^2 t cx1 + 3(1-t) t^2 cx2 + t^3 x1
  const omt = 1 - t;
  return omt * omt * omt * x0 + 3 * omt * omt * t * cx1 + 3 * omt * t * t * cx2 + t * t * t * x1;
}
function bezierY(y0: number, y1: number, t: number): number {
  const cy1 = y0;
  const cy2 = y1;
  const omt = 1 - t;
  return omt * omt * omt * y0 + 3 * omt * omt * t * cy1 + 3 * omt * t * t * cy2 + t * t * t * y1;
}

function hexWithAlpha(hex: string, a: number): string {
  // hex 可能是 #RRGGBB 或 #RRGGBBAA
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function truncate(ctx: CanvasRenderingContext2D, s: string, maxW: number): string {
  if (ctx.measureText(s).width <= maxW) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(s.slice(0, mid) + '…').width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + '…';
}
