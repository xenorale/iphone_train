import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type LineChartProps = {
  values: number[];
  height?: number;
  color?: string;
  strokeWidth?: number;
};

/** Dependency-light line chart on react-native-svg (Expo Go friendly). */
export function LineChart({ values, height = 130, color, strokeWidth = 2.5 }: LineChartProps) {
  const theme = useTheme();
  const stroke = color ?? theme.accent;
  const [w, setW] = useState(0);

  const pad = 8;
  const innerH = height - pad * 2;
  const innerW = w - pad * 2;

  let line = '';
  let area = '';
  let lastPt: { x: number; y: number } | null = null;

  if (w > 0 && values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;

    const pts = values.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + innerH - ((v - min) / range) * innerH;
      return { x, y };
    });
    line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${pad + innerH} L ${pts[0].x.toFixed(1)} ${pad + innerH} Z`;
    lastPt = pts[pts.length - 1];
  }

  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && values.length > 0 ? (
        <Svg width={w} height={height}>
          {values.length > 1 ? <Path d={area} fill={stroke} opacity={0.1} /> : null}
          {values.length > 1 ? <Path d={line} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {lastPt ? <Circle cx={lastPt.x} cy={lastPt.y} r={4} fill={stroke} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
