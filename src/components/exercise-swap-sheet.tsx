import { Image } from 'expo-image';
import { Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';

import { IconButton, Input, PressableScale, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { alternativesFor, getExercise, searchExercises } from '@/lib/catalog';
import { THUMBS } from '@/lib/gif-map';
import type { Exercise } from '@/lib/types';

export type ExerciseSwapSheetProps = {
  /** Exercise being replaced — alternatives are ranked against it. */
  exerciseId: string;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

/** Picker for "заменить упражнение": suggestions first, full search if needed. */
export function ExerciseSwapSheet({ exerciseId, onPick, onClose }: ExerciseSwapSheetProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const current = getExercise(exerciseId);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return alternativesFor(exerciseId, 40);
    return searchExercises({ query: q }).slice(0, 40);
  }, [exerciseId, query]);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElevated, borderColor: theme.border }]}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Txt variant="micro" color="accent">
                  Заменить упражнение
                </Txt>
                <Txt variant="heading" numberOfLines={1}>
                  {current?.nameRu ?? 'Упражнение'}
                </Txt>
                {current ? (
                  <Txt variant="caption" color="textTertiary">
                    Замены на {current.muscleRu.toLowerCase()}
                  </Txt>
                ) : null}
              </View>
              <IconButton onPress={onClose} variant="ghost">
                <X size={20} color={theme.textSecondary} />
              </IconButton>
            </View>

            <Input
              placeholder="Поиск по всей базе…"
              value={query}
              onChangeText={setQuery}
              left={<Search size={18} color={theme.textTertiary} />}
              autoCorrect={false}
              style={{ marginBottom: Spacing.three }}
            />

            <FlatList
              data={results}
              keyExtractor={(e) => e.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
              ListEmptyComponent={
                <Txt variant="caption" color="textTertiary">
                  Ничего не нашлось
                </Txt>
              }
              renderItem={({ item }) => (
                <PressableScale
                  pressedScale={0.98}
                  onPress={() => onPick(item)}
                  style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
                  <Image
                    source={THUMBS[item.id]}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={120}
                    cachePolicy="memory-disk"
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="body" numberOfLines={1}>
                      {item.nameRu}
                    </Txt>
                    <Txt variant="caption" color="textSecondary">
                      {item.muscleRu} · {item.equipmentRu}
                    </Txt>
                  </View>
                </PressableScale>
              )}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    height: '82%',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  thumb: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: '#222' },
});
