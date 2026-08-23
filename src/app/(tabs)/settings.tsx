import { useRouter } from 'expo-router';
import { Bell, ExternalLink, KeyRound, RefreshCw, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Chip, Input, PressableScale, Screen, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { estimateOneRm } from '@/lib/ai/program';
import { latestMetric } from '@/lib/db/metrics';
import { syncTrainingReminders } from '@/lib/notifications';
import { age, bmi, PROFILE } from '@/lib/profile';
import { useSettings } from '@/lib/store/settings';

const WEEKDAYS = [
  { iso: 1, label: 'Пн' },
  { iso: 2, label: 'Вт' },
  { iso: 3, label: 'Ср' },
  { iso: 4, label: 'Чт' },
  { iso: 5, label: 'Пт' },
  { iso: 6, label: 'Сб' },
  { iso: 7, label: 'Вс' },
];

const HOURS = [8, 12, 16, 17, 18, 20];

const STRENGTH_LABELS: Record<string, string> = {
  chest: 'Жим лёжа',
  legs: 'Присед / жим ногами',
  back: 'Тяга',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { hasKey, load, save, clear } = useApiKey();
  const {
    strength,
    trainingDays,
    setTrainingDays,
    remindersEnabled,
    setRemindersEnabled,
    reminderHour,
    setReminderHour,
  } = useSettings();
  const [keyInput, setKeyInput] = useState('');
  const [reminderError, setReminderError] = useState<string | null>(null);

  const applyReminders = async (enabled: boolean, days: number[], hour: number) => {
    const ok = await syncTrainingReminders(enabled, days, hour);
    setReminderError(ok ? null : 'iOS не дал разрешение на уведомления — включи их в настройках телефона.');
    if (!ok) setRemindersEnabled(false);
  };

  const onToggleReminders = (value: boolean) => {
    setRemindersEnabled(value);
    applyReminders(value, trainingDays, reminderHour);
  };

  const toggleDay = (iso: number) => {
    const next = trainingDays.includes(iso)
      ? trainingDays.filter((d) => d !== iso)
      : [...trainingDays, iso].sort();
    setTrainingDays(next);
    applyReminders(remindersEnabled, next, reminderHour);
  };

  const onPickHour = (h: number) => {
    setReminderHour(h);
    applyReminders(remindersEnabled, trainingDays, h);
  };

  useEffect(() => {
    load();
  }, [load]);

  const onSaveKey = async () => {
    if (!keyInput.trim()) return;
    await save(keyInput);
    setKeyInput('');
  };

  const bodyweight = latestMetric()?.bodyweight ?? PROFILE.fallbackBodyweight;
  const anchors = Object.entries(strength).filter(([, v]) => v != null) as [string, number][];

  return (
    <Screen title="Ещё" subtitle="Настройки" tabBarSpacing>
      {/* PROFILE */}
      <Card padding="five">
        <Txt variant="subtitle">{PROFILE.name}</Txt>
        <Txt variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
          {age()} лет · {PROFILE.heightCm} см · {bodyweight} кг · ИМТ {bmi(bodyweight)}
        </Txt>
        <Txt variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
          {PROFILE.daysPerWeek} тренировки в неделю по {PROFILE.sessionMinutes} мин
        </Txt>

        {anchors.length ? (
          <View style={{ marginTop: Spacing.four, gap: Spacing.two }}>
            <Txt variant="micro" color="accent">
              Рабочие веса
            </Txt>
            {anchors.map(([k, v]) => (
              <View key={k} style={styles.rowBetween}>
                <Txt variant="caption" color="textSecondary">
                  {STRENGTH_LABELS[k] ?? k}
                </Txt>
                <Txt variant="caption" color="textSecondary" rounded>
                  {v} кг · 1ПМ ≈ {estimateOneRm(v)} кг
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        <Button
          title="Пересобрать программу"
          variant="secondary"
          icon={<RefreshCw size={16} color={theme.text} />}
          onPress={() => router.push('/new-program')}
          style={{ marginTop: Spacing.four }}
        />
      </Card>

      {/* REMINDERS */}
      <Card padding="five">
        <View style={styles.rowBetween}>
          <View style={styles.rowIcon}>
            <Bell size={18} color={theme.accent} />
            <Txt variant="subtitle">Напоминания</Txt>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={onToggleReminders}
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
            thumbColor={theme.text}
          />
        </View>
        <Txt variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
          Пуш в дни тренировок. График плавающий — это просто напоминание, программа не
          привязана к дням недели.
        </Txt>

        {remindersEnabled ? (
          <>
            <View style={styles.chips}>
              {WEEKDAYS.map((d) => (
                <Chip
                  key={d.iso}
                  label={d.label}
                  selected={trainingDays.includes(d.iso)}
                  onPress={() => toggleDay(d.iso)}
                />
              ))}
            </View>
            <Txt variant="micro" color="textTertiary" style={{ marginTop: Spacing.three }}>
              Во сколько
            </Txt>
            <View style={styles.chips}>
              {HOURS.map((h) => (
                <Chip
                  key={h}
                  label={`${h}:00`}
                  selected={reminderHour === h}
                  onPress={() => onPickHour(h)}
                />
              ))}
            </View>
            {reminderError ? (
              <Txt variant="caption" color="danger" style={{ marginTop: Spacing.three }}>
                {reminderError}
              </Txt>
            ) : null}
          </>
        ) : null}
      </Card>

      {/* API KEY */}
      <Card padding="five">
        <View style={styles.rowBetween}>
          <View style={styles.rowIcon}>
            <KeyRound size={18} color={theme.accent} />
            <Txt variant="subtitle">Ключ OpenRouter</Txt>
          </View>
          <View style={[styles.badge, { backgroundColor: hasKey ? theme.successMuted : theme.dangerMuted }]}>
            <Txt variant="micro" color={hasKey ? 'success' : 'danger'}>
              {hasKey ? 'Подключён' : 'Нет ключа'}
            </Txt>
          </View>
        </View>
        <Txt variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
          Нужен для AI-функций. Хранится только на устройстве (Keychain).
        </Txt>
        <Input
          placeholder="sk-or-v1-…"
          value={keyInput}
          onChangeText={setKeyInput}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={{ marginTop: Spacing.three }}
        />
        <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
          <Button title="Сохранить" onPress={onSaveKey} disabled={!keyInput.trim()} />
          {hasKey ? (
            <Button
              title="Удалить"
              variant="danger"
              fullWidth={false}
              icon={<Trash2 size={16} color={theme.danger} />}
              onPress={clear}
            />
          ) : null}
        </View>
        <PressableScale
          haptic={false}
          onPress={() => Linking.openURL('https://openrouter.ai/keys')}
          style={styles.link}>
          <ExternalLink size={14} color={theme.textTertiary} />
          <Txt variant="caption" color="textTertiary">
            Получить ключ на openrouter.ai
          </Txt>
        </PressableScale>
      </Card>

      <Txt variant="caption" color="textTertiary" center style={{ marginTop: Spacing.two }}>
        VOLT · v1.0.0
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: { paddingHorizontal: Spacing.three, paddingVertical: 5, borderRadius: Radius.pill },
  link: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
});
