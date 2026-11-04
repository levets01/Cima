import { useMemo } from 'react';
import { EChart, PALETTE, baseOption } from './EChart';
import { compact, money } from './MonthlyChart';

interface Item { name: string; value: number; color: string }

/** Barras simples; horizontal = lista de indicadores, vertical = comparativo de totales. */
export function RankBars({ data, horizontal = false }: { data: Item[]; horizontal?: boolean }) {
  const option = useMemo(() => {
    const cat = { type: 'category' as const, data: data.map((d) => d.name), axisTick: { show: false }, axisLine: { lineStyle: { color: PALETTE.grid } }, axisLabel: { color: PALETTE.muted, fontSize: 12 }, inverse: horizontal };
    const val = { type: 'value' as const, axisLabel: { color: PALETTE.muted, fontSize: 12, formatter: compact }, splitLine: { lineStyle: { color: PALETTE.grid } } };
    return {
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...baseOption.tooltip, trigger: 'item', valueFormatter: (v: number) => money(v) },
      xAxis: horizontal ? val : cat,
      yAxis: horizontal ? cat : val,
      series: [
        {
          type: 'bar' as const,
          barMaxWidth: horizontal ? 18 : 44,
          itemStyle: { borderRadius: horizontal ? [0, 6, 6, 0] : [8, 8, 0, 0] },
          data: data.map((d) => ({ value: d.value, itemStyle: { color: d.color } })),
        },
      ],
    };
  }, [data, horizontal]);
  return <EChart option={option} />;
}
