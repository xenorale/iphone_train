import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { StrengthAnchors } from '@/lib/types';

type SettingsState = {
  /** Working weights (kg) per lift — the model's starting point for loads. */
  strength: StrengthAnchors;
  /** Weekday numbers (1 = Mon) used for training reminders. */
  trainingDays: number[];
  remindersEnabled: boolean;
  /** Hour of day for the reminder, 24h. */
  reminderHour: number;
  hydrated: boolean;

  setStrength: (s: StrengthAnchors) => void;
  setTrainingDays: (d: number[]) => void;
  setRemindersEnabled: (on: boolean) => void;
  setReminderHour: (h: number) => void;
  setHydrated: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      strength: {},
      trainingDays: [1, 3, 5],
      remindersEnabled: false,
      reminderHour: 18,
      hydrated: false,

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
        strength: s.strength,
        trainingDays: s.trainingDays,
        remindersEnabled: s.remindersEnabled,
        reminderHour: s.reminderHour,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
