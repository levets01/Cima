import { useMemo } from 'react';
import { EChart, PALETTE, baseOption } from './EChart';

export function StatusDonut({
  data,
  centerText,
  centerLabel,
}: {
  data: { name: string; value: number; color: string }[];
  centerText?: string;
  centerLabel?: string;
}) {
  const option = useMemo(
    () => ({
      tooltip: { ...baseOption.tooltip, trigger: 'item' },
      legend: { show: false },
      series: [
        {
          type: 'pie' as const,
          radius: ['74%', '88%'],
          center: ['50%', '50%'],
          padAngle: 1,
          itemStyle: { borderRadius: 4, borderColor: '#FFFCFA', borderWidth: 2 },
          label: { show: false },
          emphasis: { scale: true, scaleSize: 4 },
          data: data.filter((d) => d.value > 0).map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: centerLabel ? '40%' : 'center',
          style: {
            text: centerText ?? String(data.reduce((s, d) => s + d.value, 0)),
            fill: PALETTE.text,
            fontSize: 28,
            fontWeight: 600,
            textAlign: 'center',
          },
        },
        ...(centerLabel
          ? [{ type: 'text', left: 'center', top: '58%', style: { text: centerLabel, fill: PALETTE.muted, fontSize: 12, textAlign: 'center' } }]
          : []),
      ],
    }),
    [data, centerText, centerLabel]
  );
  return <EChart option={option} />;
}
