import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, IconButton, PressableScale, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sessionHistory } from '@/lib/db/sessions';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function duration(from: number, to: number | null) {
  if (!to) return null;
  const min = Math.max(1, Math.round((to - from) / 60000));
  return `${min} мин`;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessionHistory'],
    queryFn: () => sessionHistory(),
  });

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <IconButton onPress={() => router.back()} variant="ghost">
          <ChevronLeft size={22} color={theme.text} />
        </IconButton>
        <Txt variant="subtitle">История</Txt>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
        ListEmptyComponent={
          <Card padding="eight">
            <View style={{ alignItems: 'center', gap: Spacing.three }}>
              <CalendarDays size={36} color={theme.textTertiary} strokeWidth={1.6} />
              <Txt variant="body" color="textSecondary" center>
                Пока ни одной завершённой тренировки.
              </Txt>
            </View>
          </Card>
        }
        renderItem={({ item }) => (
          <PressableScale pressedScale={0.98} onPress={() => router.push(`/summary/${item.id}`)}>
            <Card padding="four">
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {item.title ?? 'Тренировка'}
                  </Txt>
                  <Txt variant="caption" color="textSecondary">
                    {formatDate(item.started_at)}
                    {duration(item.started_at, item.finished_at) ? ` · ${duration(item.started_at, item.finished_at)}` : ''}
                    {` · ${item.sets} подходов`}
                  </Txt>
                  <Txt variant="caption" color="textTertiary" rounded>
                    {(item.volume / 1000).toFixed(1)} т объёма
                  </Txt>
                </View>
                {item.review ? <Sparkles size={15} color={theme.accent} /> : null}
                <ChevronRight size={18} color={theme.textTertiary} />
              </View>
            </Card>
          </PressableScale>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  content: { padding: Spacing.five, paddingBottom: Spacing.eight },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
