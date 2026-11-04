import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, GraphicComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, GraphicComponent, CanvasRenderer]);

/** Paleta de gráficos (colores del sistema Apple). */
export const PALETTE = {
  wine: '#6B1A45',
  pink: '#E58AAE',
  blush: '#F3C4D5',
  plum: '#8E3B7A',
  gold: '#D2A23A',
  text: '#2A1B24',
  muted: '#6E6168',
  grid: '#F0E4E8',
} as const;

export const SERIES_COLORS = [PALETTE.wine, PALETTE.pink, PALETTE.gold, PALETTE.plum, PALETTE.blush];

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", sans-serif';

export const baseOption = {
  color: SERIES_COLORS,
  textStyle: { fontFamily: FONT, color: PALETTE.muted },
  animationDuration: 600,
  animationEasing: 'cubicOut',
  tooltip: {
    backgroundColor: 'rgba(255,252,250,0.95)',
    borderWidth: 0,
    padding: [10, 12],
    textStyle: { color: PALETTE.text, fontFamily: FONT, fontSize: 12 },
    extraCssText: 'box-shadow:0 8px 30px rgba(0,0,0,.12);border-radius:12px;backdrop-filter:blur(12px);',
  },
  legend: {
    bottom: 0,
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 18,
    textStyle: { color: PALETTE.muted, fontSize: 12, fontFamily: FONT },
  },
} as const;

interface Props {
  option: EChartsCoreOption;
  className?: string;
}

export function EChart({ option, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption({ ...baseOption, ...option }, true);
  }, [option]);

  return <div ref={ref} className={className ?? 'h-full w-full'} role="img" />;
}
