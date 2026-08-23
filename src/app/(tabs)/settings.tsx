import { Check, ExternalLink, KeyRound, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Input, PressableScale, Screen, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/ai/key';
import { AI_MODELS, useSettings } from '@/lib/store/settings';

export default function SettingsScreen() {
  const theme = useTheme();
  const { hasKey, load, save, clear } = useApiKey();
  const { units, setUnits, aiModel, setAiModel, profile, resetAll } = useSettings();
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  const onSaveKey = async () => {
    if (!keyInput.trim()) return;
    await save(keyInput);
    setKeyInput('');
  };

  return (
    <Screen title="Ещё" subtitle="Настройки" tabBarSpacing>
      {/* API KEY */}
      <Card padding="five">
        <View style={styles.rowBetween}>
          <View style={styles.rowIcon}>
            <KeyRound size={18} color={theme.accent} />
            <Txt variant="subtitle">Ключ OpenRouter</Txt>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: hasKey ? theme.successMuted : theme.dangerMuted },
            ]}>
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

      {/* MODEL */}
      <Card padding="five">
        <Txt variant="subtitle">Модель ИИ</Txt>
        <Txt variant="caption" color="textSecondary" style={{ marginTop: Spacing.two, marginBottom: Spacing.three }}>
          Бесплатные модели подходят для генерации программ и разбора техники.
        </Txt>
        {AI_MODELS.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <PressableScale haptic={false} onPress={() => setAiModel(m.id)} style={styles.modelRow}>
              <View style={{ flex: 1 }}>
                <Txt variant="body">{m.label}</Txt>
                <Txt variant="caption" color="textTertiary">
                  {m.id}
                </Txt>
              </View>
              {aiModel === m.id ? <Check size={18} color={theme.accent} /> : null}
            </PressableScale>
          </View>
        ))}
      </Card>

      {/* UNITS */}
      <Card padding="five">
        <View style={styles.rowBetween}>
          <Txt variant="subtitle">Единицы веса</Txt>
          <View style={[styles.segment, { borderColor: theme.border }]}>
            {(['kg', 'lb'] as const).map((u) => (
              <PressableScale
                key={u}
                haptic={false}
                onPress={() => setUnits(u)}
                style={[styles.segmentItem, units === u && { backgroundColor: theme.accent }]}>
                <Txt variant="label" color={units === u ? 'accentOn' : 'textSecondary'}>
                  {u === 'kg' ? 'кг' : 'фунты'}
                </Txt>
              </PressableScale>
            ))}
          </View>
        </View>
      </Card>

      {/* PROFILE */}
      {profile ? (
        <Card padding="five">
          <Txt variant="subtitle">Профиль</Txt>
          <Txt variant="caption" color="textSecondary" style={{ marginTop: Spacing.two }}>
            Цель: {goalLabel(profile.goal)} · {profile.daysPerWeek} дн/нед · {profile.sessionMinutes} мин
          </Txt>
          <Button
            title="Пройти онбординг заново"
            variant="secondary"
            onPress={resetAll}
            style={{ marginTop: Spacing.three }}
          />
        </Card>
      ) : null}

      <Txt variant="caption" color="textTertiary" center style={{ marginTop: Spacing.two }}>
        VOLT · v1.0.0
      </Txt>
    </Screen>
  );
}

function goalLabel(g: string) {
  return { strength: 'Сила', muscle: 'Масса', fatloss: 'Сушка', general: 'Форма' }[g] ?? g;
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: { paddingHorizontal: Spacing.three, paddingVertical: 5, borderRadius: Radius.pill },
  link: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  modelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.three },
  segment: { flexDirection: 'row', borderRadius: Radius.pill, borderWidth: 1, padding: 2 },
  segmentItem: { paddingHorizontal: Spacing.four, paddingVertical: 6, borderRadius: Radius.pill },
});
