import type { EChartsOption } from 'echarts';
import type { Framework, Subcategory, TimeRecord } from '../types';

export function buildSankeyOption(
  records: TimeRecord[],
  frameworks: Framework[],
  subcategories: Subcategory[],
): EChartsOption {
  const fwById = new Map(frameworks.map((f) => [f.id, f]));
  const nodes: { name: string; itemStyle: { color: string } }[] = [
    { name: '你', itemStyle: { color: '#F0B90B' } },
  ];
  for (const f of frameworks) nodes.push({ name: f.name, itemStyle: { color: f.color } });
  for (const s of subcategories) {
    const fw = fwById.get(s.frameworkId);
    nodes.push({ name: s.name, itemStyle: { color: (fw?.color ?? '#848E9C') + 'CC' } });
  }

  const links: { source: string; target: string; value: number }[] = [];
  for (const f of frameworks) {
    const v = records.filter((r) => r.frameworkId === f.id).reduce((a, r) => a + r.durationMin, 0);
    if (v > 0) links.push({ source: '你', target: f.name, value: v });
  }
  for (const s of subcategories) {
    const v = records.filter((r) => r.subcategoryId === s.id).reduce((a, r) => a + r.durationMin, 0);
    if (v > 0) {
      const fw = fwById.get(s.frameworkId);
      links.push({ source: fw?.name ?? '你', target: s.name, value: v });
    }
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) =>
        p.data && p.data.source ? `${p.data.source} → ${p.data.target}<br/>${p.data.value} 分钟` : `${p.name}`,
    },
    series: [
      {
        type: 'sankey',
        left: 12,
        right: 60,
        top: 20,
        bottom: 20,
        data: nodes,
        links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
        itemStyle: { borderWidth: 0 },
        label: { color: '#EAECEF', fontSize: 11 },
      },
    ],
  };
}

export function buildDonutOption(items: { name: string; value: number; color: string }[]): EChartsOption {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 分钟 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#848E9C' }, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '42%'],
        itemStyle: { borderColor: '#0B0E11', borderWidth: 2 },
        label: { show: false },
        data: items.map((i) => ({ name: i.name, value: i.value, itemStyle: { color: i.color } })),
      },
    ],
  };
}

export function buildStreamOption(
  dates: string[],
  seriesData: { name: string; color: string; data: number[] }[],
): EChartsOption {
  const n = dates.length;
  const total = dates.map((_, i) => seriesData.reduce((s, d) => s + (d.data[i] || 0), 0));
  const streamSeries = seriesData.map((sd, si) => {
    const tops: number[] = [];
    const bottoms: number[] = [];
    for (let i = 0; i < n; i++) {
      let top = -total[i] / 2;
      for (let k = 0; k < si; k++) top += seriesData[k].data[i] || 0;
      tops.push(top);
      bottoms.push(top + (sd.data[i] || 0));
    }
    return { name: sd.name, color: sd.color, tops, bottoms };
  });

  let yMin = 0;
  let yMax = 0;
  for (const s of streamSeries) {
    for (let i = 0; i < n; i++) {
      yMin = Math.min(yMin, s.tops[i]);
      yMax = Math.max(yMax, s.bottoms[i]);
    }
  }
  const pad = (yMax - yMin) * 0.1 || 10;

  return {
    legend: {
      top: 0,
      textStyle: { color: '#848E9C', fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
      data: seriesData.map((s) => s.name),
    },
    grid: { left: 8, right: 8, top: 30, bottom: 24 },
    xAxis: {
      type: 'value',
      min: -0.5,
      max: n - 0.5,
      interval: 1,
      axisLabel: {
        color: '#848E9C',
        fontSize: 10,
        formatter: (v: number) => dates[Math.round(v)] ?? '',
      },
      axisLine: { lineStyle: { color: '#2B3139' } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: { type: 'value', show: false, min: yMin - pad, max: yMax + pad },
    series: streamSeries.map((s) => ({
      type: 'custom',
      name: s.name,
      data: s.tops.map((_, i) => i),
      renderItem: (params: any, api: any) => {
        const X = (idx: number) => api.coord([idx, 0])[0];
        const Y = (v: number) => api.coord([0, v])[1];
        const pts: number[][] = [];
        for (let k = 0; k < n; k++) pts.push([X(k), Y(s.tops[k])]);
        for (let k = n - 1; k >= 0; k--) pts.push([X(k), Y(s.bottoms[k])]);
        return { type: 'polygon', shape: { points: pts }, style: { fill: s.color, opacity: 0.85 } } as any;
      },
    })),
  };
}

export function buildHeatmapOption(days: { date: string; value: number }[], year: number): EChartsOption {
  const max = Math.max(1, ...days.map((d) => d.value));
  return {
    tooltip: { formatter: (p: any) => `${p.value[0]}：${p.value[1]} 分钟` },
    visualMap: {
      min: 0,
      max,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#1E2329', '#F0B90B'] },
      textStyle: { color: '#848E9C' },
      show: max > 0,
      itemWidth: 12,
      itemHeight: 90,
    },
    calendar: {
      top: 40,
      left: 36,
      right: 8,
      bottom: 24,
      range: String(year),
      cellSize: ['auto', 14],
      itemStyle: { color: '#1E2329', borderColor: '#0B0E11', borderWidth: 2 },
      yearLabel: { show: false },
      dayLabel: { color: '#848E9C', nameMap: 'ZH' },
      monthLabel: { color: '#848E9C', nameMap: 'ZH' },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: days.map((d) => [d.date, d.value]),
      },
    ],
  };
}
