import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
};

export function ProgressBar({ progress, height = 8, color, trackColor }: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: Radius.pill, backgroundColor: trackColor ?? theme.backgroundElevated },
      ]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: Radius.pill,
          backgroundColor: color ?? theme.accent,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
