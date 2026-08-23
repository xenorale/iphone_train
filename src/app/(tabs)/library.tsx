import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, Input, PressableScale, Txt } from '@/components/ui';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { muscleGroups, searchExercises } from '@/lib/catalog';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/lib/types';

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);

  const groups = useMemo(() => muscleGroups(), []);
  const results = useMemo(() => searchExercises({ query, muscle }), [query, muscle]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Txt variant="micro" color="accent">
              Упражнения
            </Txt>
            <Txt variant="display">База</Txt>
            <Input
              placeholder="Поиск упражнения…"
              value={query}
              onChangeText={setQuery}
              left={<Search size={18} color={theme.textTertiary} />}
              autoCorrect={false}
              style={{ marginTop: Spacing.three }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              <Chip label="Все" selected={!muscle} onPress={() => setMuscle(null)} />
              {groups.map((g) => (
                <Chip
                  key={g.key}
                  label={g.label}
                  selected={muscle === g.key}
                  onPress={() => setMuscle(muscle === g.key ? null : g.key)}
                />
              ))}
            </ScrollView>
            <Txt variant="caption" color="textTertiary" style={{ marginTop: Spacing.one }}>
              {results.length} упражнений
            </Txt>
          </View>
        }
        renderItem={({ item }) => (
          <ExerciseRow item={item} onPress={() => router.push(`/exercise/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
      />
    </SafeAreaView>
  );
}

function ExerciseRow({ item, onPress }: { item: Exercise; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: 'rgba(255,255,255,0.04)' }]}>
      <Image source={item.images[0]} style={styles.thumb} contentFit="cover" transition={150} cachePolicy="memory-disk" />
      <View style={styles.rowText}>
        <Txt variant="bodyStrong" numberOfLines={1}>
          {item.nameRu}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          {item.muscleRu} · {item.equipmentRu}
        </Txt>
      </View>
      <ChevronRight size={18} color={theme.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  header: { gap: Spacing.one, paddingTop: Spacing.two, paddingBottom: Spacing.four },
  chips: { gap: Spacing.two, paddingVertical: Spacing.three, paddingRight: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: '#222' },
  rowText: { flex: 1, gap: 2 },
});
