import { useEffect, useMemo, useState } from 'react';

/**
 * 赛博指挥舱·全息时钟 开场动画
 *
 * 阶段（总时长 ≈ 4.8s）：
 *  t0 0.0s   ─ 启动：中心金色光点出现，HUD 网格 + 同心圆刻度从中心向外扩散
 *  t1 1.0s   ─ 罗盘成型：刻度盘静止，乱码 ticker 启动横向流动
 *  t2 2.4s   ─ "你无法管理时间。" Glitch 闪烁出现后被数据流冲散
 *  t3 3.3s   ─ "但你可以决定它流向哪里。" 金色扇区扫描呈现
 *  t4 4.0s   ─ HUD 收缩回中心，金属质感 Slogan "让时间流向..." 砸下
 *  t5 4.6s   ─ 淡出，切入首页
 *
 *  性能降级：低端机（hardwareConcurrency ≤ 4 或 deviceMemory ≤ 4）
 *   ├─ 关闭 Glitch 效果
 *   ├─ 关闭 ticker 数字滚动
 *   ├─ 减少同心圆 / 径向线 / 刻度数
 *   └─ 取消 Slogan 的 3D 立体动效
 */

// -------- 性能检测（只在首次渲染时跑一次） --------
function detectLowEnd(): boolean {
  if (typeof window === 'undefined') return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  // 连接事件：低电量/省电模式（部分浏览器支持）
  // @ts-expect-error non-standard
  const saveData = navigator.connection?.saveData === true;
  return cores <= 4 || mem <= 4 || saveData;
}

// -------- 阶段定义 --------
type Phase = 'boot' | 'ro' | 'glitch' | 'scan' | 'slogan' | 'done';

interface PhaseSpec {
  next: Phase;
  at: number; // ms 进入
}
const SCHEDULE: PhaseSpec[] = [
  { at: 0, next: 'boot' },
  { at: 1000, next: 'ro' },
  { at: 2400, next: 'glitch' },
  { at: 3300, next: 'scan' },
  { at: 4000, next: 'slogan' },
  { at: 4600, next: 'done' },
];

// -------- 随机种子（防止每次刷新数字完全一样） --------
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// -------- 渲染 --------
export default function OpeningAnimation({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('boot');
  const [lowEnd] = useState(() => detectLowEnd());

  // 调度阶段切换
  useEffect(() => {
    const timers: number[] = [];
    SCHEDULE.forEach((s) => {
      const id = window.setTimeout(() => setPhase(s.next), s.at);
      timers.push(id);
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // done 后回调
  useEffect(() => {
    if (phase !== 'done') return;
    const id = window.setTimeout(onDone, 350);
    return () => clearTimeout(id);
  }, [phase, onDone]);

  const skip = () => setPhase('done');

  return (
    <div
      className={`splash ${phase}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        overflow: 'hidden',
        background: '#03050A',
        color: '#eaecef',
        // 阶段切到 done 时淡出
        opacity: phase === 'done' ? 0 : 1,
        transition: 'opacity 350ms ease',
        pointerEvents: phase === 'done' ? 'none' : 'auto',
      }}
    >
      {/* 1. 背景扫描线 + 极暗渐变（纯 CSS，零运行时开销） */}
      <div className="splash-scanlines" />
      <div className="splash-vignette" />

      {/* 2. 全息罗盘（SVG + CSS 动画） */}
      <HudCompass lowEnd={lowEnd} phase={phase} />

      {/* 3. 乱码 ticker 横向流动（仅中高端机） */}
      {!lowEnd && <CodeTicker phase={phase} />}

      {/* 4. 文字层 */}
      <SplashText phase={phase} lowEnd={lowEnd} />

      {/* 5. 跳过按钮（毛玻璃） */}
      <button
        onClick={skip}
        className="splash-skip"
        style={{
          position: 'absolute',
          top: 24,
          right: 20,
          padding: '6px 14px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(240,185,11,0.3)',
          color: '#cbd0d6',
          fontSize: 12,
          letterSpacing: 1,
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        跳过 ›
      </button>

      {/* 6. 注入样式（一次性） */}
      <SplashStyles />
    </div>
  );
}

// ============================================================================
// 全息罗盘：同心圆 + 刻度 + 径向线 + 中心光点
// ============================================================================
function HudCompass({ lowEnd, phase }: { lowEnd: boolean; phase: Phase }) {
  // 静态数据（不会变）
  const ringR = [80, 120, 160, 200, 240];
  const tickCount = lowEnd ? 24 : 60; // 刻度数
  const radialCount = lowEnd ? 8 : 16; // 径向线数
  const viewSize = 600; // SVG 视口

  // 径向刻度（数字角度）
  const ticks = useMemo(() => {
    const list: { angle: number; major: boolean }[] = [];
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * 360;
      list.push({ angle, major: i % 5 === 0 });
    }
    return list;
  }, [tickCount]);

  const radials = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < radialCount; i++) list.push((i / radialCount) * 360);
    return list;
  }, [radialCount]);

  return (
    <svg
      className="splash-hud"
      viewBox={`-${viewSize / 2} -${viewSize / 2} ${viewSize} ${viewSize}`}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 'min(95vw, 700px)',
        height: 'min(95vw, 700px)',
        transform: 'translate(-50%, -50%)',
        // Slogan 阶段：HUD 收缩回中心
        animation:
          phase === 'slogan' || phase === 'done'
            ? 'hudCollapse 600ms cubic-bezier(.7,0,.3,1) forwards'
            : 'hudIn 900ms ease forwards',
        willChange: 'transform, opacity',
      }}
    >
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#F0B90B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F0B90B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* 中心光点 + 辉光 */}
      <circle r="40" fill="url(#centerGlow)" className="splash-center-pulse" />
      <circle r="6" fill="#F0B90B" className="splash-center-dot" />

      {/* 同心圆刻度盘（dasharray 让圆环断点产生科技感） */}
      {ringR.map((r, i) => (
        <circle
          key={r}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={i === 2 ? 1.5 : 0.8}
          strokeDasharray={i === 2 ? '4 6' : i % 2 === 0 ? '1 5' : '0.5 4'}
          className="splash-ring"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}

      {/* 刻度短线 */}
      {ticks.map((t, i) => {
        const rad = (t.angle * Math.PI) / 180;
        const r1 = 250;
        const r2 = t.major ? 268 : 260;
        const x1 = Math.cos(rad) * r1;
        const y1 = Math.sin(rad) * r1;
        const x2 = Math.cos(rad) * r2;
        const y2 = Math.sin(rad) * r2;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#F0B90B"
            strokeWidth={t.major ? 1.2 : 0.5}
            opacity={t.major ? 0.7 : 0.3}
            className="splash-tick"
            style={{ animationDelay: `${500 + i * 8}ms` }}
          />
        );
      })}

      {/* 径向扫描线 */}
      {radials.map((deg, i) => (
        <line
          key={i}
          x1="0"
          y1="0"
          x2="0"
          y2="-260"
          stroke="#F0B90B"
          strokeWidth="0.4"
          opacity="0.2"
          transform={`rotate(${deg})`}
          className="splash-radial"
          style={{ animationDelay: `${700 + i * 30}ms` }}
        />
      ))}

      {/* HUD 旋转外圈（缓慢自转，低端机 30s 一圈，中高端 20s） */}
      <g
        style={{
          animation: `splashRotate ${lowEnd ? 30 : 20}s linear infinite`,
          transformOrigin: 'center',
        }}
        opacity="0.5"
      >
        <circle
          r="220"
          fill="none"
          stroke="#F0B90B"
          strokeWidth="0.6"
          strokeDasharray="2 14"
        />
      </g>
    </svg>
  );
}

// ============================================================================
// 乱码 ticker 横向滚动
// ============================================================================
function CodeTicker({ phase }: { phase: Phase }) {
  // 5 行数据流，每行 24 个字符
  const [stream, setStream] = useState<string[]>(() => makeStream(5, 24, 42));

  useEffect(() => {
    // ticker 在 ro 阶段之后每 1.4s 刷新一次
    if (phase === 'boot') return;
    const id = window.setInterval(() => {
      setStream((prev) => {
        const first = prev.shift()!;
        return [...prev, makeRow(24, Math.floor(Math.random() * 9999))];
      });
    }, 1400);
    return () => clearInterval(id);
  }, [phase]);

  // ro 之后才显示
  if (phase === 'boot' || phase === 'done') return null;

  return (
    <div
      className="splash-ticker"
      style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        opacity: 0.4,
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#F0B90B',
        lineHeight: 1.6,
        textAlign: 'center',
        pointerEvents: 'none',
        animation: 'tickerFade 600ms ease forwards',
      }}
    >
      {stream.map((row, i) => (
        <div
          key={i}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'clip',
            opacity: 0.3 + (i % 3) * 0.2,
          }}
        >
          {row}
        </div>
      ))}
    </div>
  );
}

function makeStream(rows: number, cols: number, seed: number): string[] {
  return Array.from({ length: rows }, (_, i) => makeRow(cols, seed + i * 7));
}
function makeRow(cols: number, seed: number): string {
  const r = seededRand(seed);
  return Array.from({ length: cols }, () => {
    const v = r();
    if (v < 0.5) return String(Math.floor(r() * 10));
    if (v < 0.85) return Math.floor(r() * 9999).toString(16).toUpperCase();
    return Math.floor(r() * 999).toString();
  }).join(' ');
}

// ============================================================================
// 文字层：3 句文案 + Glitch / Scanline / Slogan 三种效果
// ============================================================================
function SplashText({ phase, lowEnd }: { phase: Phase; lowEnd: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '0 32px',
      }}
    >
      {/* 第一句：Glitch */}
      {phase === 'glitch' && (
        <GlitchText lowEnd={lowEnd}>你无法管理时间。</GlitchText>
      )}

      {/* 第二句：Scanline */}
      {phase === 'scan' && (
        <ScanlineText>但你可以决定它流向哪里。</ScanlineText>
      )}

      {/* 第三句：Slogan（金属落地） */}
      {(phase === 'slogan' || phase === 'done') && <SloganText lowEnd={lowEnd} />}
    </div>
  );
}

function GlitchText({ children, lowEnd }: { children: string; lowEnd: boolean }) {
  if (lowEnd) {
    return (
      <p
        style={{
          fontSize: 'clamp(20px, 5vw, 30px)',
          color: '#eaecef',
          animation: 'textFade 700ms ease forwards',
        }}
      >
        {children}
      </p>
    );
  }
  return (
    <div className="splash-glitch" data-text={children}>
      <span>{children}</span>
    </div>
  );
}

function ScanlineText({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 'clamp(20px, 5vw, 30px)',
        color: '#F0B90B',
        position: 'relative',
        animation: 'textScanIn 800ms ease forwards',
        textShadow: '0 0 12px rgba(240,185,11,0.6), 0 0 30px rgba(240,185,11,0.3)',
      }}
    >
      {children}
    </p>
  );
}

function SloganText({ lowEnd }: { lowEnd: boolean }) {
  return (
    <h1
      style={{
        fontSize: 'clamp(22px, 5.5vw, 34px)',
        fontWeight: 800,
        textAlign: 'center',
        backgroundImage:
          'linear-gradient(180deg, #FFFDF0 0%, #F0B90B 45%, #B6840A 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        letterSpacing: '0.05em',
        animation: lowEnd
          ? 'sloganDrop 600ms ease forwards'
          : 'sloganDrop3D 700ms cubic-bezier(.3,1.4,.5,1) forwards',
        textShadow: lowEnd ? 'none' : '0 0 30px rgba(240,185,11,0.5)',
        filter: lowEnd ? 'none' : 'drop-shadow(0 0 12px rgba(240,185,11,0.35))',
      }}
    >
      让时间流向，更有价值的地方。
    </h1>
  );
}

// ============================================================================
// 内联 CSS（一次性注入，避免依赖 Tailwind/全局样式）
// ============================================================================
function SplashStyles() {
  return (
    <style>{`
      /* === 背景：扫描线 + 暗角 === */
      .splash-scanlines {
        position: absolute; inset: 0;
        background-image: repeating-linear-gradient(
          0deg,
          rgba(240,185,11,0.025) 0px,
          rgba(240,185,11,0.025) 1px,
          transparent 1px,
          transparent 3px
        );
        pointer-events: none;
        animation: scanShift 6s linear infinite;
      }
      .splash-vignette {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);
        pointer-events: none;
      }
      @keyframes scanShift { from { background-position: 0 0; } to { background-position: 0 60px; } }

      /* === 中心光点呼吸 === */
      .splash-center-pulse {
        transform-origin: center;
        animation: centerPulse 2s ease-in-out infinite;
      }
      .splash-center-dot {
        transform-origin: center;
        animation: centerDot 1.6s ease-in-out infinite;
      }
      @keyframes centerPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      @keyframes centerDot { 0%,100%{opacity:.9} 50%{opacity:1} }

      /* === 罗盘入场 === */
      .splash-ring, .splash-tick, .splash-radial {
        opacity: 0;
        animation: hudElementIn 600ms ease forwards;
      }
      @keyframes hudElementIn { to { opacity: var(--target-opacity, 1); } }
      .splash-ring { stroke-dasharray: 1 5; }
      @keyframes hudIn {
        from { opacity: 0; transform: translate(-50%,-50%) scale(0.4) rotate(-30deg); }
        to   { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
      }
      @keyframes hudCollapse {
        to { opacity: 0; transform: translate(-50%,-50%) scale(0.2) rotate(180deg); }
      }
      @keyframes splashRotate { from{transform:rotate(0)} to{transform:rotate(360deg)} }

      /* === Ticker 淡入 === */
      @keyframes tickerFade { from{opacity:0} to{opacity:0.4} }

      /* === Glitch 文字（高端机） === */
      .splash-glitch {
        position: relative;
        font-size: clamp(20px, 5vw, 30px);
        color: #eaecef;
        font-weight: 500;
        letter-spacing: 0.05em;
        animation: glitchMain 600ms steps(1) forwards;
      }
      .splash-glitch::before, .splash-glitch::after {
        content: attr(data-text);
        position: absolute; left: 0; top: 0; width: 100%;
        background: #03050A; overflow: hidden;
      }
      .splash-glitch::before {
        color: #F0B90B;
        animation: glitchTop 600ms steps(1) forwards;
      }
      .splash-glitch::after {
        color: #00d4ff;
        animation: glitchBottom 600ms steps(1) forwards;
      }
      @keyframes glitchMain {
        0%   { transform: translate(0,0); }
        20%  { transform: translate(-2px, 1px); }
        40%  { transform: translate(2px, -1px); }
        60%  { transform: translate(-1px, 0); }
        80%  { transform: translate(1px, 0); }
        100% { transform: translate(0,0); }
      }
      @keyframes glitchTop {
        0%   { clip-path: inset(0 0 80% 0); transform: translate(-3px,-1px); }
        25%  { clip-path: inset(20% 0 60% 0); transform: translate(3px,1px); }
        50%  { clip-path: inset(60% 0 20% 0); transform: translate(-2px,0); }
        75%  { clip-path: inset(40% 0 40% 0); transform: translate(2px,1px); }
        100% { clip-path: inset(50% 0 50% 0); transform: translate(0,0); }
      }
      @keyframes glitchBottom {
        0%   { clip-path: inset(80% 0 0 0); transform: translate(2px,1px); }
        25%  { clip-path: inset(40% 0 20% 0); transform: translate(-2px,-1px); }
        50%  { clip-path: inset(0 0 60% 0); transform: translate(3px,0); }
        75%  { clip-path: inset(20% 0 40% 0); transform: translate(-3px,0); }
        100% { clip-path: inset(50% 0 50% 0); transform: translate(0,0); }
      }

      /* === 普通文字淡入 === */
      @keyframes textFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes textScanIn {
        0%   { opacity:0; letter-spacing:0.4em; filter:blur(6px); }
        100% { opacity:1; letter-spacing:0.05em; filter:blur(0); }
      }

      /* === Slogan 落地 === */
      @keyframes sloganDrop {
        0%   { opacity:0; transform: translateY(-40px) scale(0.9); }
        70%  { opacity:1; transform: translateY(6px) scale(1.02); }
        100% { opacity:1; transform: translateY(0) scale(1); }
      }
      @keyframes sloganDrop3D {
        0%   { opacity:0; transform: perspective(600px) translateY(-80px) rotateX(-40deg) scale(0.7); }
        60%  { opacity:1; transform: perspective(600px) translateY(10px) rotateX(8deg) scale(1.05); }
        100% { opacity:1; transform: perspective(600px) translateY(0) rotateX(0) scale(1); }
      }

      /* 减少动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .splash-scanlines, .splash-center-pulse, .splash-center-dot,
        .splash-ring, .splash-tick, .splash-radial, .splash-glitch,
        .splash-glitch::before, .splash-glitch::after {
          animation: none !important;
          opacity: 1 !important;
        }
        @keyframes hudIn {
          from { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
      }
    `}</style>
  );
}
