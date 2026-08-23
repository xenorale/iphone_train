import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { StrengthAnchors } from '@/lib/types';

export const AI_MODELS = [
  { id: 'google/gemini-3.7-flash', label: 'Gemini 3.7 Flash — основная' },
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash — дёшево и быстро' },
  { id: 'minimax/minimax-m3', label: 'MiniMax M3 — быстрый' },
  { id: 'deepseek/deepseek-v4-pro-0813', label: 'DeepSeek V4 Pro — умнее, дороже' },
  { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5 — максимум качества' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning (бесплатно)' },
] as const;

/** Short, high-volume calls (food parsing) always run on the cheapest fast model. */
export const FOOD_MODEL = 'google/gemini-2.5-flash-lite';

export const DEFAULT_MODEL = AI_MODELS[0].id;

type SettingsState = {
  aiModel: string;
  /** Working weights (kg) per lift — the model's starting point for loads. */
  strength: StrengthAnchors;
  /** Weekday numbers (1 = Mon) used for training reminders. */
  trainingDays: number[];
  remindersEnabled: boolean;
  /** Hour of day for the reminder, 24h. */
  reminderHour: number;
  hydrated: boolean;

  setAiModel: (m: string) => void;
  setStrength: (s: StrengthAnchors) => void;
  setTrainingDays: (d: number[]) => void;
  setRemindersEnabled: (on: boolean) => void;
  setReminderHour: (h: number) => void;
  setHydrated: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      aiModel: DEFAULT_MODEL,
      strength: {},
      trainingDays: [1, 3, 5],
      remindersEnabled: false,
      reminderHour: 18,
      hydrated: false,

      setAiModel: (aiModel) => set({ aiModel }),
      setStrength: (strength) => set({ strength }),
      setTrainingDays: (trainingDays) => set({ trainingDays }),
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
      setReminderHour: (reminderHour) => set({ reminderHour }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'volt-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        aiModel: s.aiModel,
        strength: s.strength,
        trainingDays: s.trainingDays,
        remindersEnabled: s.remindersEnabled,
        reminderHour: s.reminderHour,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
