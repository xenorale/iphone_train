import * as Haptics from 'expo-haptics';
import { Plus, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar, PressableScale, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Sticky rest countdown. Remount with a new `key` to (re)start. */
export function RestTimer({
  seconds,
  onDone,
  onDismiss,
}: {
  seconds: number;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  // tick down once per second
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // fire onDone exactly once when it reaches zero (in an effect, never during render)
  useEffect(() => {
    if (remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  }, [remaining, onDone]);

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundElevated, borderColor: theme.border }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.row}>
          <Txt variant="micro" color="textSecondary">
            Отдых
          </Txt>
          <Txt variant="bodyStrong" rounded color={remaining === 0 ? 'success' : 'text'}>
            {fmt(remaining)}
          </Txt>
        </View>
        <ProgressBar progress={total > 0 ? remaining / total : 0} height={5} />
      </View>
      <PressableScale
        haptic={false}
        onPress={() => {
          setTotal((t) => t + 15);
          setRemaining((r) => r + 15);
        }}
        style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
        <Plus size={16} color={theme.text} />
        <Txt variant="label">15</Txt>
      </PressableScale>
      <PressableScale haptic={false} onPress={onDismiss} style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
        <X size={16} color={theme.textSecondary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Radius.md,
  },
});
