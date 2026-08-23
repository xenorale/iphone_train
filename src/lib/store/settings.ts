import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Profile, Units } from '@/lib/types';

export const AI_MODELS = [
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (бесплатно)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (бесплатно)' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 80B (бесплатно)' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 3 405B (бесплатно)' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (бесплатно)' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek (платно, стабильно)' },
] as const;

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
