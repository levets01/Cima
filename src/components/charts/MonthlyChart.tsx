import { useMemo } from 'react';
import { EChart, PALETTE, baseOption } from './EChart';

interface Row {
  month: string;
  interestCollected: number;
  capitalRecovered: number;
  capitalLent: number;
}

export const compact = (v: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
export const money = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export function MonthlyChart({ data }: { data: Row[] }) {
  const option = useMemo(() => {
    const line = (name: string, key: keyof Row, color: string) => ({
      name,
      type: 'line' as const,
      smooth: 0.25,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      lineStyle: { width: 2.25, color },
      itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
      emphasis: { focus: 'series' as const, scale: true },
      data: data.map((d) => d[key]),
    });
    return {
      grid: { left: 8, right: 12, top: 16, bottom: 36, containLabel: true },
      tooltip: { ...baseOption.tooltip, trigger: 'axis', valueFormatter: (v: number) => money(v) },
      legend: baseOption.legend,
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((d) => d.month),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: PALETTE.muted, fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: PALETTE.muted, fontSize: 12, formatter: compact },
        splitLine: { lineStyle: { color: PALETTE.grid } },
      },
      series: [
        line('Réditos cobrados', 'interestCollected', PALETTE.wine),
        line('Capital recuperado', 'capitalRecovered', PALETTE.pink),
        line('Capital prestado', 'capitalLent', PALETTE.gold),
      ],
    };
  }, [data]);
  return <EChart option={option} />;
}
