import { X } from 'lucide-react-native';
import { Modal, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button, IconButton, Txt } from './ui';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Greedy plates per side. */
export function platesPerSide(weight: number, bar: number): number[] {
  let perSide = (weight - bar) / 2;
  if (perSide <= 0) return [];
  const out: number[] = [];
  for (const p of PLATES) {
    while (perSide >= p - 1e-6) {
      out.push(p);
      perSide = Math.round((perSide - p) * 100) / 100;
    }
  }
  return out;
}

export function PlateCalculator({
  weight,
  bar = 20,
  onClose,
}: {
  weight: number;
  bar?: number;
  onClose: () => void;
}) {
  const theme = useTheme();
  const plates = platesPerSide(weight, bar);
  const loadable = plates.length > 0;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElevated, borderColor: theme.border }]}>
          <View style={styles.head}>
            <View>
              <Txt variant="micro" color="accent">
                Калькулятор блинов
              </Txt>
              <Txt variant="title" rounded>
                {weight} кг
              </Txt>
            </View>
            <IconButton onPress={onClose} variant="ghost">
              <X size={20} color={theme.textSecondary} />
            </IconButton>
          </View>

          <Txt variant="caption" color="textTertiary" style={{ marginTop: Spacing.one }}>
            Гриф {bar} кг · на каждую сторону:
          </Txt>

          {loadable ? (
            <View style={styles.plates}>
              {plates.map((p, i) => (
                <View key={i} style={[styles.plate, { backgroundColor: theme.accentMuted, borderColor: theme.accent }]}>
                  <Txt variant="bodyStrong" color="accent" rounded>
                    {p}
                  </Txt>
                </View>
              ))}
            </View>
          ) : (
            <Txt variant="body" color="textSecondary" style={{ marginTop: Spacing.four }}>
              Вес ≤ грифу — блины не нужны.
            </Txt>
          )}

          <Button title="Готово" onPress={onClose} style={{ marginTop: Spacing.five }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.six },
  card: { width: '100%', borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.five },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  plates: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.four },
  plate: {
    minWidth: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});
