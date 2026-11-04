import { useMemo } from 'react';
import * as echarts from 'echarts/core';
import { EChart } from './EChart';

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const option = useMemo(
    () => ({
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      tooltip: { show: false },
      legend: { show: false },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
      yAxis: { type: 'value', show: false, min: 'dataMin' },
      series: [
        {
          type: 'line',
          data,
          smooth: 0.4,
          showSymbol: false,
          silent: true,
          lineStyle: { width: 1.5, color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '1F' },
              { offset: 1, color: color + '00' },
            ]),
          },
        },
      ],
    }),
    [data, color]
  );
  return <EChart option={option} />;
}
