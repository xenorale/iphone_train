import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, ChevronLeft, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button, Card, Chip, IconButton, Input, PressableScale, ProgressBar, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { AiError } from '@/lib/ai/openrouter';
import { generateProgram } from '@/lib/ai/program';
import { saveProgram } from '@/lib/db/programs';
import { useSettings } from '@/lib/store/settings';
import type { Experience, Goal, Profile, Sex } from '@/lib/types';

const GOALS: { id: Goal; title: string; sub: string }[] = [
  { id: 'strength', title: 'Сила', sub: 'Тяжёлые веса, мало повторов' },
  { id: 'muscle', title: 'Масса', sub: 'Рост мышц, средние повторы' },
  { id: 'fatloss', title: 'Сушка', sub: 'Жиросжигание и тонус' },
  { id: 'general', title: 'Форма', sub: 'Здоровье и общий тонус' },
];

const EXP: { id: Experience; title: string; sub: string }[] = [
  { id: 'beginner', title: 'Новичок', sub: 'Меньше 1 года' },
  { id: 'intermediate', title: 'Средний', sub: '1–3 года' },
  { id: 'advanced', title: 'Продвинутый', sub: '3+ лет' },
];

const EQUIPMENT: { id: string; label: string }[] = [
  { id: 'barbell', label: 'Штанга' },
  { id: 'dumbbell', label: 'Гантели' },
  { id: 'machine', label: 'Тренажёры' },
  { id: 'cable', label: 'Блоки' },
  { id: 'body only', label: 'Своё тело' },
  { id: 'kettlebells', label: 'Гири' },
  { id: 'bands', label: 'Резина' },
];

const STEPS = 6;

const num = (s: string): number | undefined => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
};

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasKey = useApiKey((s) => s.hasKey);
  const { aiModel, completeOnboarding } = useSettings();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>('muscle');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [sex, setSex] = useState<Sex>('male');
  const [bodyweight, setBodyweight] = useState('');
  const [height, setHeight] = useState('');
  const [str, setStr] = useState<Record<string, string>>({ chest: '', legs: '', back: '', biceps: '', triceps: '' });
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(60);
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbell', 'machine', 'cable', 'body only']);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEquip = (id: string) =>
    setEquipment((cur) => (cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id]));

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));

  const onGenerate = async () => {
    if (!hasKey) {
      setError('Сначала добавь ключ OpenRouter в разделе «Ещё».');
      return;
    }
    const profile: Profile = {
      goal,
      experience,
      daysPerWeek: days,
      sessionMinutes: minutes,
      equipment,
      sex,
      bodyweight: num(bodyweight),
      height: num(height),
      strength: {
        chest: num(str.chest),
        legs: num(str.legs),
        back: num(str.back),
        biceps: num(str.biceps),
        triceps: num(str.triceps),
      },
    };
    setError(null);
    setGenerating(true);
    try {
      const program = await generateProgram(profile, aiModel);
      saveProgram(program);
      completeOnboarding(profile);
      await queryClient.invalidateQueries({ queryKey: ['activeProgram'] });
      router.replace('/program');
    } catch (e) {
      console.warn('generateProgram failed:', e);
      setError(e instanceof AiError ? e.human : 'Не удалось создать программу. Попробуй ещё раз.');
    } finally {
      setGenerating(false);
    }
  };

  if (generating) return <Generating />;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())} variant="ghost">
          <ChevronLeft size={22} color={theme.text} />
        </IconButton>
        <View style={{ flex: 1, paddingHorizontal: Spacing.three }}>
          <ProgressBar progress={(step + 1) / STEPS} />
        </View>
        <Txt variant="caption" color="textTertiary">
          {step + 1}/{STEPS}
        </Txt>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <Step title="Какая цель?" sub="Под неё подберём упражнения и повторы">
            {GOALS.map((g) => (
              <Option key={g.id} title={g.title} sub={g.sub} active={goal === g.id} onPress={() => setGoal(g.id)} />
            ))}
          </Step>
        )}

        {step === 1 && (
          <Step title="Твой уровень?" sub="Чтобы задать объём и сложность">
            {EXP.map((e) => (
              <Option key={e.id} title={e.title} sub={e.sub} active={experience === e.id} onPress={() => setExperience(e.id)} />
            ))}
          </Step>
        )}

        {step === 2 && (
          <Step title="Пара слов о тебе" sub="Поможет точнее рассчитать веса и фазу">
            <View style={styles.chipWrap}>
              <Chip label="Мужской" selected={sex === 'male'} onPress={() => setSex('male')} />
              <Chip label="Женский" selected={sex === 'female'} onPress={() => setSex('female')} />
            </View>
            <Field label="Вес тела, кг" value={bodyweight} onChange={setBodyweight} placeholder="напр. 78" />
            <Field label="Рост, см (необязательно)" value={height} onChange={setHeight} placeholder="напр. 180" />
            <SkipHint onPress={next} />
          </Step>
        )}

        {step === 3 && (
          <Step title="Рабочие веса по группам" sub="Примерный рабочий вес на 6–8 повторов (не максимум). Пресс и кардио и так в каждой тренировке. Не знаешь — оставь пусто или «Не знаю»">
            <Field label="Грудь — жим, кг (×6–8)" value={str.chest} onChange={(t) => setStr((s) => ({ ...s, chest: t }))} placeholder="напр. 60, или пусто" />
            <Field label="Ноги — присед / жим ногами, кг (×6–8)" value={str.legs} onChange={(t) => setStr((s) => ({ ...s, legs: t }))} placeholder="напр. 90, или пусто" />
            <Field label="Спина — тяга, кг (×6–8)" value={str.back} onChange={(t) => setStr((s) => ({ ...s, back: t }))} placeholder="напр. 70, или пусто" />
            <Field label="Бицепс — подъём, кг (×6–8)" value={str.biceps} onChange={(t) => setStr((s) => ({ ...s, biceps: t }))} placeholder="напр. 15, или пусто" />
            <Field label="Трицепс — разгибание / жим узким, кг (×6–8)" value={str.triceps} onChange={(t) => setStr((s) => ({ ...s, triceps: t }))} placeholder="напр. 25, или пусто" />
            <Button
              title="Не знаю свои веса — пусть оценит ИИ"
              variant="secondary"
              onPress={() => {
                setStr({ chest: '', legs: '', back: '', biceps: '', triceps: '' });
                next();
              }}
              style={{ marginTop: Spacing.two }}
            />
          </Step>
        )}

        {step === 4 && (
          <Step title="График" sub="Сколько дней и сколько времени на тренировку">
            <Txt variant="micro" color="textTertiary">
              Дней в неделю
            </Txt>
            <View style={styles.chipWrap}>
              {[2, 3, 4, 5, 6].map((d) => (
                <Chip key={d} label={`${d} дн`} selected={days === d} onPress={() => setDays(d)} />
              ))}
            </View>
            <Txt variant="micro" color="textTertiary" style={{ marginTop: Spacing.two }}>
              Длительность
            </Txt>
            <View style={styles.chipWrap}>
              {[30, 45, 60, 75, 90].map((m) => (
                <Chip key={m} label={`${m} мин`} selected={minutes === m} onPress={() => setMinutes(m)} />
              ))}
            </View>
          </Step>
        )}

        {step === 5 && (
          <Step title="Что есть из инвентаря?" sub="Выбери всё доступное">
            <View style={styles.chipWrap}>
              {EQUIPMENT.map((e) => (
                <Chip
                  key={e.id}
                  label={e.label}
                  selected={equipment.includes(e.id)}
                  onPress={() => toggleEquip(e.id)}
                  icon={equipment.includes(e.id) ? <Check size={14} color={theme.accentOn} /> : undefined}
                />
              ))}
            </View>
          </Step>
        )}

        {error ? (
          <Card variant="surface" padding="four" style={{ borderColor: theme.danger, borderWidth: 1 }}>
            <Txt variant="caption" color="danger">
              {error}
            </Txt>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS - 1 ? (
          <Button title="Далее" icon={<ArrowRight size={18} color={theme.accentOn} />} onPress={next} />
        ) : (
          <Button
            title="Создать программу"
            icon={<Sparkles size={18} color={theme.accentOn} />}
            onPress={onGenerate}
            disabled={equipment.length === 0}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="micro" color="textTertiary">
        {label}
      </Txt>
      <Input value={value} onChangeText={onChange} keyboardType="numeric" placeholder={placeholder} />
    </View>
  );
}

function SkipHint({ onPress }: { onPress: () => void }) {
  return (
    <Button title="Не знаю — пропустить" variant="ghost" onPress={onPress} style={{ marginTop: Spacing.one }} />
  );
}

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.four }}>
      <View style={{ gap: Spacing.one }}>
        <Txt variant="title">{title}</Txt>
        <Txt variant="body" color="textSecondary">
          {sub}
        </Txt>
      </View>
      <View style={{ gap: Spacing.three }}>{children}</View>
    </View>
  );
}

function Option({ title, sub, active, onPress }: { title: string; sub: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      style={[
        styles.option,
        { backgroundColor: active ? theme.accentMuted : theme.backgroundElement, borderColor: active ? theme.accent : theme.border },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="caption" color="textSecondary">
          {sub}
        </Txt>
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: active ? theme.accent : theme.textTertiary, backgroundColor: active ? theme.accent : 'transparent' },
        ]}>
        {active ? <Check size={14} color={theme.accentOn} /> : null}
      </View>
    </PressableScale>
  );
}

function Generating() {
  const theme = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [scale]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <SafeAreaView style={[styles.flex, styles.centerAll, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.pulse, pulse, { backgroundColor: theme.accentMuted }]}>
        <Sparkles size={34} color={theme.accent} />
      </Animated.View>
      <Txt variant="title" center style={{ marginTop: Spacing.six }}>
        Собираю твою программу…
      </Txt>
      <Txt variant="body" color="textSecondary" center style={{ marginTop: Spacing.two, paddingHorizontal: Spacing.eight }}>
        Подбираю фазу, упражнения, веса и прогрессию под тебя
      </Txt>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerAll: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.five, gap: Spacing.five, paddingBottom: Spacing.eight },
  footer: { padding: Spacing.five },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pulse: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
