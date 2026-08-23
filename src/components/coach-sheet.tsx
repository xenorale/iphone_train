import { useRouter } from 'expo-router';
import { Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ExerciseGif } from '@/components/exercise-gif';
import { MarkdownLite } from '@/components/markdown-lite';
import { Button, Chip, IconButton, Input, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { askCoach, type CoachScope } from '@/lib/ai/coach';
import { AiError } from '@/lib/ai/openrouter';
import { useSettings } from '@/lib/store/settings';

const QUICK: Record<CoachScope, string[]> = {
  exercise: ['Не чувствую нагрузку', 'Что-то болит', 'Тяжело даётся', 'Чем заменить?'],
  workout: ['Слишком тяжело', 'Слишком легко', 'Болит после тренировки', 'Как улучшить?'],
};

export type CoachSheetProps = {
  scope: CoachScope;
  title: string;
  subtitle?: string;
  gifImages?: string[];
  cues?: string[];
  exerciseName?: string;
  muscleRu?: string;
  workoutTitle?: string;
  exercises?: string[];
  onClose: () => void;
};

export function CoachSheet(props: CoachSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const hasKey = useApiKey((s) => s.hasKey);
  const aiModel = useSettings((s) => s.aiModel);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    setError(null);
    setAnswer(null);
    setLoading(true);
    try {
      const res = await askCoach({
        scope: props.scope,
        question: text,
        model: aiModel,
        exerciseName: props.exerciseName,
        muscleRu: props.muscleRu,
        workoutTitle: props.workoutTitle,
        exercises: props.exercises,
      });
      setAnswer(res);
    } catch (e) {
      setError(e instanceof AiError ? e.human : 'Не удалось получить ответ. Попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={props.onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElevated, borderColor: theme.border }]}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Txt variant="micro" color="accent">
                  {props.subtitle ?? 'Тренер'}
                </Txt>
                <Txt variant="heading" numberOfLines={1}>
                  {props.title}
                </Txt>
              </View>
              <IconButton onPress={props.onClose} variant="ghost">
                <X size={20} color={theme.textSecondary} />
              </IconButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {props.gifImages?.length ? (
                <View style={{ marginBottom: Spacing.four }}>
                  <ExerciseGif images={props.gifImages} height={170} />
                  {props.cues?.length ? (
                    <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
                      {props.cues.map((c, i) => (
                        <View key={i} style={styles.cueRow}>
                          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                          <Txt variant="caption" color="textSecondary" style={{ flex: 1 }}>
                            {c}
                          </Txt>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {!hasKey ? (
                <View style={{ gap: Spacing.three }}>
                  <Txt variant="body" color="textSecondary">
                    Чтобы спросить ИИ, добавь ключ OpenRouter в разделе «Ещё».
                  </Txt>
                  <Button
                    title="Открыть настройки"
                    variant="secondary"
                    onPress={() => {
                      props.onClose();
                      router.push('/settings');
                    }}
                  />
                </View>
              ) : (
                <>
                  <Txt variant="micro" color="textTertiary" style={{ marginBottom: Spacing.two }}>
                    Быстрые вопросы
                  </Txt>
                  <View style={styles.chips}>
                    {QUICK[props.scope].map((q) => (
                      <Chip key={q} label={q} onPress={() => ask(q)} />
                    ))}
                  </View>

                  <Input
                    placeholder="Свой вопрос тренеру…"
                    value={question}
                    onChangeText={setQuestion}
                    style={{ marginTop: Spacing.three }}
                    multiline
                    onSubmitEditing={() => ask(question)}
                    returnKeyType="send"
                  />
                  <Button
                    title="Спросить ИИ"
                    icon={<Sparkles size={16} color={theme.accentOn} />}
                    onPress={() => ask(question)}
                    disabled={!question.trim() || loading}
                    style={{ marginTop: Spacing.three }}
                  />

                  {loading ? (
                    <View style={{ alignItems: 'center', paddingVertical: Spacing.five }}>
                      <ActivityIndicator color={theme.accent} />
                      <Txt variant="caption" color="textTertiary" style={{ marginTop: Spacing.two }}>
                        Думаю…
                      </Txt>
                    </View>
                  ) : null}

                  {error ? (
                    <Txt variant="caption" color="danger" style={{ marginTop: Spacing.three }}>
                      {error}
                    </Txt>
                  ) : null}

                  {answer ? (
                    <View
                      style={[styles.answer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <MarkdownLite text={answer} />
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
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
    maxHeight: '90%',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.four, gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  answer: { marginTop: Spacing.four, padding: Spacing.four, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
