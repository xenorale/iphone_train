import * as Haptics from 'expo-haptics';
import { Plus, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cancelAlert, scheduleRestAlert } from '@/lib/notifications';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Sticky rest countdown. Remount with a new `key` to (re)start.
 *
 * Counts against a wall-clock deadline rather than decrementing, so locking the
 * phone mid-rest doesn't stall it, and backs itself with a local notification so
 * the alert lands even with the app closed.
 */
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
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);
  const alertRef = useRef<string | null>(null);

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

  // tick against the clock
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // schedule the background alert once, cancel it if the timer is dismissed
  useEffect(() => {
    let cancelled = false;
    scheduleRestAlert(seconds).then((id) => {
      if (cancelled) cancelAlert(id);
      else alertRef.current = id;
    });
    return () => {
      cancelled = true;
      cancelAlert(alertRef.current);
      alertRef.current = null;
    };
  }, [seconds]);

  // fire onDone exactly once when it reaches zero (in an effect, never during render)
  useEffect(() => {
    if (remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  }, [remaining, onDone]);

  const addFifteen = async () => {
    setTotal((t) => t + 15);
    const nextEnd = endsAt + 15_000;
    setEndsAt(nextEnd);
    await cancelAlert(alertRef.current);
    alertRef.current = await scheduleRestAlert(Math.ceil((nextEnd - Date.now()) / 1000));
  };

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
        onPress={addFifteen}
        style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
        <Plus size={16} color={theme.text} />
        <Txt variant="label">15</Txt>
      </PressableScale>
      <PressableScale
        haptic={false}
        onPress={onDismiss}
        style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
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
