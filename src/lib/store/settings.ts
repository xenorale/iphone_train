import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Profile, Units } from '@/lib/types';

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
  units: Units;
  aiModel: string;
  profile: Profile | null;
  onboarded: boolean;
  hydrated: boolean;

  setUnits: (u: Units) => void;
  setAiModel: (m: string) => void;
  setProfile: (p: Profile) => void;
  completeOnboarding: (p: Profile) => void;
  resetAll: () => void;
  setHydrated: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      units: 'kg',
      aiModel: DEFAULT_MODEL,
      profile: null,
      onboarded: false,
      hydrated: false,

      setUnits: (units) => set({ units }),
      setAiModel: (aiModel) => set({ aiModel }),
      setProfile: (profile) => set({ profile }),
      completeOnboarding: (profile) => set({ profile, onboarded: true }),
      resetAll: () => set({ profile: null, onboarded: false }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'volt-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        units: s.units,
        aiModel: s.aiModel,
        profile: s.profile,
        onboarded: s.onboarded,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
