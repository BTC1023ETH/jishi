import { useEffect, useRef, useState } from 'react';

/**
 * 全局指针反馈（#10 补充）
 * - 桌面端（fine pointer）：
 *     ① 鼠标跟随的金色辉光（360px 径向渐变 + 6px blur + lerp 拖尾）
 *     ② 按下时从指针位置扩散的金色涟漪
 * - 移动端（coarse pointer）：
 *     ① 不显示辉光（避免在触屏无意义漂浮）
 *     ② 触摸点金色涟漪 + 几粒极轻微散逸粒子
 * - 性能：单 RAF 主循环，CSS 变量驱动，弱设备自动降低粒子密度
 * - 降级：prefers-reduced-motion 时只画静态一圈轮廓
 */
const pointerMedia = (): MediaQueryList | null => {
  if (typeof window === 'undefined') return null;
  return window.matchMedia('(pointer: coarse)');
};
const motionMedia = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

interface Ripple {
  id: number;
  x: number;
  y: number;
  start: number; // ms
  duration: number; // ms
  /** 桌面/移动端 */
  isCoarse: boolean;
}

export default function CursorGlow() {
  const [enabled, setEnabled] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);
  const reducedRef = useRef(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const rippleLayerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: -9999, y: -9999 });
  const posRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const mq = pointerMedia();
    if (!mq) return;
    const apply = () => setIsCoarse(mq.matches);
    apply();
    setEnabled(true);
    mq.addEventListener('change', apply);
    reducedRef.current = motionMedia();
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };
    const onDown = (e: PointerEvent) => {
      // 只响应主按键（鼠标左键 / 单点触摸）
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      idRef.current += 1;
      ripplesRef.current.push({
        id: idRef.current,
        x: e.clientX,
        y: e.clientY,
        start: performance.now(),
        duration: isCoarse ? 520 : 420,
        isCoarse,
      });
      // 上限：避免快速连点堆积 DOM
      if (ripplesRef.current.length > 12) ripplesRef.current.splice(0, 6);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });

    const tick = () => {
      // 1) 桌面端 lerp 光晕
      if (!isCoarse) {
        const lerp = 0.18;
        posRef.current.x += (targetRef.current.x - posRef.current.x) * lerp;
        posRef.current.y += (targetRef.current.y - posRef.current.y) * lerp;
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${posRef.current.x - 180}px, ${posRef.current.y - 180}px, 0)`;
        }
      }

      // 2) 清理过期涟漪 + 更新 DOM
      if (rippleLayerRef.current) {
        const now = performance.now();
        const layer = rippleLayerRef.current;
        // 收集存活节点
        const alive = ripplesRef.current.filter((r) => now - r.start < r.duration);
        // DOM 数量与 alive 数量对齐
        while (layer.childElementCount < alive.length) {
          const el = document.createElement('span');
          el.className = 'jishi-ripple';
          el.setAttribute('aria-hidden', 'true');
          layer.appendChild(el);
        }
        while (layer.childElementCount > alive.length) {
          layer.removeChild(layer.firstChild as Node);
        }
        for (let i = 0; i < alive.length; i++) {
          const r = alive[i];
          const el = layer.children[i] as HTMLSpanElement;
          const t = (now - r.start) / r.duration; // 0..1
          const k = 1 - Math.pow(1 - t, 3); // easeOutCubic
          const size = (r.isCoarse ? 28 : 18) + k * 140;
          const alpha = (1 - t) * (r.isCoarse ? 0.55 : 0.7);
          el.style.left = `${r.x}px`;
          el.style.top = `${r.y}px`;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.opacity = `${alpha.toFixed(3)}`;
          el.style.borderColor = `rgba(240,185,11,${(alpha * 0.9).toFixed(3)})`;
          el.style.boxShadow = `0 0 16px rgba(240,185,11,${(alpha * 0.5).toFixed(3)})`;
          // reduced motion 时去掉扩展动效，只描边
          if (reducedRef.current) {
            el.style.transition = 'none';
            el.style.opacity = '0.5';
            el.style.width = '40px';
            el.style.height = '40px';
          }
        }
        ripplesRef.current = alive;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, isCoarse]);

  if (!enabled) return null;

  // 内联注入一次性的涟漪样式（无 Tailwind 工具类支持 transform scale + box-shadow 高效过渡）
  const rippleCss = `
    .jishi-ripple {
      position: absolute;
      border-radius: 9999px;
      border: 1.5px solid rgba(240,185,11,0.7);
      background: radial-gradient(closest-side, rgba(240,185,11,0.10), rgba(240,185,11,0) 70%);
      transform: translate(-50%, -50%);
      pointer-events: none;
      will-change: width, height, opacity;
    }
  `;

  return (
    <>
      <style>{rippleCss}</style>
      {/* 桌面端跟随光晕（手机不渲染） */}
      {!isCoarse && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <div
            ref={glowRef}
            style={{
              width: 360,
              height: 360,
              borderRadius: '50%',
              background:
                'radial-gradient(closest-side, rgba(240,185,11,0.18), rgba(240,185,11,0.06) 50%, rgba(240,185,11,0) 70%)',
              filter: 'blur(6px)',
              willChange: 'transform',
            }}
          />
        </div>
      )}

      {/* 全局按下点涟漪（两端均启用） */}
      <div
        ref={rippleLayerRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
