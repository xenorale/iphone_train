import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const STORAGE_KEY = 'openrouter_api_key';

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEY);
}

type KeyState = {
  hasKey: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  save: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const useApiKey = create<KeyState>((set) => ({
  hasKey: false,
  loaded: false,
  load: async () => {
    const v = await getApiKey();
    set({ hasKey: !!v, loaded: true });
  },
  save: async (key) => {
    const trimmed = key.trim();
    await SecureStore.setItemAsync(STORAGE_KEY, trimmed);
    set({ hasKey: !!trimmed });
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    set({ hasKey: false });
  },
}));
