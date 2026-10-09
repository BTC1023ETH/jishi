import { useMemo, useState } from 'react';
import { formatDurationMin } from '../utils/time';

export interface DonutSlice {
  name: string;
  color: string;
  value: number;
}

interface Props {
  items: DonutSlice[];
  size?: number;
}

/**
 * 全息环形图
 *  - 4 段切片，带缝隙 + 高光描边
 *  - 外围金色光点沿轨道匀速流动
 *  - 点击/悬停某段 → 段位向外弹出 + 中心浮现该段信息
 *  - 数据为 0 的段不渲染（不污染图形）
 */
export default function HologramDonut({ items, size = 240 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  // 只保留 value > 0 的段
  const data = useMemo(() => items.filter((d) => d.value > 0), [items]);
  const total = useMemo(() => data.reduce((a, d) => a + d.value, 0), [data]);

  const stroke = 22; // 环厚度
  const gapDeg = 2.5; // 段间缝隙（度）
  const radius = (size - stroke) / 2 - 6; // 留出光点轨道
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // 计算每段长度
  const segments = useMemo(() => {
    if (total === 0) return [] as { start: number; end: number; len: number; item: DonutSlice }[];
    const usable = 360 - gapDeg * data.length; // 减去缝隙
    let acc = 0;
    return data.map((item) => {
      const sweep = (item.value / total) * usable;
      const start = acc;
      const end = acc + sweep;
      acc = end + gapDeg;
      const startLen = (start / 360) * circumference;
      const len = (sweep / 360) * circumference;
      return { start, end, len, item };
    });
  }, [data, total, circumference]);

  if (total === 0) {
    return (
      <div
        style={{
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#848E9C',
          fontSize: 13,
        }}
      >
        暂无数据
      </div>
    );
  }

  // 悬停段位（用于向外弹出 + 高光描边）
  const hoveredSeg = hover !== null ? segments[hover] : null;

  // 中心信息
  const center = hoveredSeg ?? segments[0] ?? null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F0B90B" stopOpacity="0" />
              <stop offset="50%" stopColor="#F0B90B" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#F0B90B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 背景轨道（极暗） */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={stroke}
          />

          {/* 各段切片 */}
          {segments.map((s, i) => {
            const isHover = hover === i;
            // 弹出：整段沿径向偏移
            const mid = (s.start + s.end) / 2;
            const rad = ((mid - 90) * Math.PI) / 180;
            const out = isHover ? 6 : 0;
            const ox = Math.cos(rad) * out;
            const oy = Math.sin(rad) * out;
            return (
              <g
                key={i}
                style={{
                  transform: `translate(${ox}px, ${oy}px)`,
                  transition: 'transform 220ms cubic-bezier(.3,1.2,.5,1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
                onClick={() => setHover((h) => (h === i ? null : i))}
              >
                {/* 切片本体 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={s.item.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${s.len} ${circumference - s.len}`}
                  strokeDashoffset={-((s.start / 360) * circumference)}
                  strokeLinecap="butt"
                  filter="url(#donutGlow)"
                  style={{ transition: 'stroke-width 200ms ease, opacity 200ms ease' }}
                  opacity={hover !== null && !isHover ? 0.4 : 1}
                />
                {/* 高光描边（顶部 1px 亮线） */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius - stroke / 2}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1}
                  strokeDasharray={`${s.len} ${circumference - s.len}`}
                  strokeDashoffset={-((s.start / 360) * circumference)}
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {/* 外围发光轨道（静止） */}
          <circle
            cx={cx}
            cy={cy}
            r={radius + stroke / 2 + 8}
            fill="none"
            stroke="rgba(240,185,11,0.18)"
            strokeWidth={1}
            strokeDasharray="2 6"
          />

          {/* 沿轨道流动的金色光点（CSS animation rotate） */}
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: 'donutOrbit 8s linear infinite',
            }}
          >
            <circle
              cx={cx}
              cy={cy - (radius + stroke / 2 + 8)}
              r={3.2}
              fill="#F0B90B"
              filter="url(#donutGlow)"
            />
            {/* 光点拖尾 */}
            <circle
              cx={cx}
              cy={cy - (radius + stroke / 2 + 8) - 2}
              r={1.5}
              fill="#F0B90B"
              opacity={0.5}
            />
            <circle
              cx={cx}
              cy={cy - (radius + stroke / 2 + 8) - 5}
              r={1}
              fill="#F0B90B"
              opacity={0.25}
            />
          </g>
        </svg>

        {/* 中心信息层（绝对定位） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          {center && (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: '#848E9C',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                {center.item.name}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#eaecef',
                  textShadow: `0 0 10px ${center.item.color}80`,
                }}
              >
                {formatDurationMin(center.item.value)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: center.item.color,
                  marginTop: 2,
                }}
              >
                {((center.item.value / total) * 100).toFixed(1)}%
              </div>
            </>
          )}
        </div>

        {/* 内联 keyframes */}
        <style>{`
          @keyframes donutOrbit { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        `}</style>
      </div>

      {/* 图例（小圆点 + 名称 + 百分比） */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
        }}
      >
        {segments.map((s, i) => (
          <button
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover((h) => (h === i ? null : i))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background:
                hover === i ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              border:
                hover === i
                  ? `1px solid ${s.item.color}80`
                  : '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              fontSize: 11,
              color: hover === i ? '#eaecef' : '#9ba3af',
              transition: 'all 180ms ease',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: s.item.color,
                boxShadow: hover === i ? `0 0 8px ${s.item.color}` : 'none',
              }}
            />
            {s.item.name}
            <span style={{ color: '#848E9C' }}>
              {((s.item.value / total) * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
