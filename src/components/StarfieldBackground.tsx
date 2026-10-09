import { useEffect, useRef } from 'react';

/**
 * 赛博星空背景（#10）
 * - 远景星点（200+）正弦闪烁
 * - 中景流星（金色拖尾，每 8~15 秒随机）
 * - 近景星尘缓慢漂移
 * - 顶部极光带 + 暗角渐变
 * - 性能：DPR 限制、页面隐藏自动暂停、低端机降级为静态
 */
interface Props {
  density?: 'auto' | 'low' | 'high';
  zIndex?: number;
}

const colors = {
  bg: '#05070D',
  star1: '#FFFFFF',
  star2: '#FFD866',
  star3: '#9DD7FF',
  aurora: '#4A9EFF',
  dust: '#F0B90B',
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const isLowEnd = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (dm !== undefined && dm <= 4) return true;
  if (cores !== undefined && cores <= 4) return true;
  return false;
};

export default function StarfieldBackground({ density = 'auto', zIndex = -1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());
  const lastMeteorRef = useRef<number>(0);
  const nextMeteorDelayRef = useRef<number>(8000);
  const lowEndRef = useRef<boolean>(false);
  const reducedRef = useRef<boolean>(false);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    lowEndRef.current = isLowEnd() || density === 'low';
    const finalDensity = density === 'auto' ? (lowEndRef.current ? 'low' : 'high') : density;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, finalDensity === 'low' ? 1.25 : 1.5);
    let w = window.innerWidth;
    let h = window.innerHeight;

    // 初始化星点
    const starCount = finalDensity === 'low' ? 80 : 220;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      baseAlpha: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      color: Math.random() < 0.7 ? colors.star1 : Math.random() < 0.5 ? colors.star2 : colors.star3,
    }));

    // 流星
    const meteors: { x: number; y: number; vx: number; vy: number; life: number; max: number; len: number }[] = [];
    const spawnMeteor = (now: number) => {
      if (finalDensity === 'low') return;
      if (now - lastMeteorRef.current < nextMeteorDelayRef.current) return;
      lastMeteorRef.current = now;
      nextMeteorDelayRef.current = 6000 + Math.random() * 12000;
      const fromLeft = Math.random() < 0.6;
      const startX = fromLeft ? -50 : w * (0.3 + Math.random() * 0.5);
      const startY = Math.random() * h * 0.4;
      const ang = (Math.PI / 6) + (Math.random() - 0.5) * 0.4;
      const speed = 0.45;
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 0,
        max: 1400,
        len: 80,
      });
    };

    // 顶部极光
    const aurora = {
      y: h * 0.12,
      amp: 24,
      phase: 0,
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      aurora.y = h * 0.12;
      // 重置星点位置
      for (const s of stars) {
        s.x = Math.random() * w;
        s.y = Math.random() * h;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (t: number) => {
      const dt = t - startRef.current;
      ctx.clearRect(0, 0, w, h);

      // 1) 背景径向渐变
      const grad = ctx.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.5, Math.max(w, h));
      grad.addColorStop(0, '#0B1426');
      grad.addColorStop(0.5, '#060B1A');
      grad.addColorStop(1, colors.bg);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 2) 顶部极光
      if (!reducedRef.current) {
        aurora.phase = dt / 3000;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(0, aurora.y + Math.sin(aurora.phase) * aurora.amp);
        const ag = ctx.createLinearGradient(0, 0, w, 0);
        ag.addColorStop(0, 'rgba(74,158,255,0)');
        ag.addColorStop(0.4, 'rgba(74,158,255,0.12)');
        ag.addColorStop(0.5, 'rgba(240,185,11,0.18)');
        ag.addColorStop(0.6, 'rgba(74,158,255,0.12)');
        ag.addColorStop(1, 'rgba(74,158,255,0)');
        ctx.fillStyle = ag;
        ctx.fillRect(0, -40, w, 80);
        ctx.restore();
      }

      // 3) 星点
      for (const s of stars) {
        if (!reducedRef.current) {
          const a = s.baseAlpha * (0.5 + 0.5 * Math.sin(dt / 1000 * s.speed + s.phase));
          ctx.fillStyle = hexWithAlpha(s.color, a);
        } else {
          ctx.fillStyle = hexWithAlpha(s.color, s.baseAlpha);
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4) 流星
      if (!reducedRef.current) spawnMeteor(t);
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += 16;
        if (m.life > m.max) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * 16;
        m.y += m.vy * 16;
        const k = 1 - m.life / m.max;
        const tailX = m.x - m.vx * m.len;
        const tailY = m.y - m.vy * m.len;
        const g = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        g.addColorStop(0, `rgba(255,216,102,${0.9 * k})`);
        g.addColorStop(0.6, `rgba(240,185,11,${0.4 * k})`);
        g.addColorStop(1, 'rgba(240,185,11,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        // 头部
        ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5) 顶部暗角
      const vg = ctx.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(5,7,13,0.4)');
      vg.addColorStop(0.4, 'rgba(5,7,13,0)');
      vg.addColorStop(1, 'rgba(5,7,13,0.6)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!rafRef.current) {
        startRef.current = performance.now();
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [density]);

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

function hexWithAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
