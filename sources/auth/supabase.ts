import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { resolveSupabaseAnonKey, resolveSupabaseUrl } from '@/auth/supabaseConfig';

const SUPABASE_URL = resolveSupabaseUrl();
const SUPABASE_ANON_KEY = resolveSupabaseAnonKey();

const SUPABASE_STORAGE_KEY = 'supabase_session';

/**
 * SecureStore-backed storage adapter for Supabase auth on native platforms.
 * Falls back to localStorage on web.
 */
const secureStoreAdapter = Platform.OS === 'web'
    ? undefined // Supabase uses localStorage by default on web
    : {
        getItem: async (key: string): Promise<string | null> => {
            return SecureStore.getItemAsync(key);
        },
        setItem: async (key: string, value: string): Promise<void> => {
            await SecureStore.setItemAsync(key, value);
        },
        removeItem: async (key: string): Promise<void> => {
            await SecureStore.deleteItemAsync(key);
        },
    };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: secureStoreAdapter,
        storageKey: SUPABASE_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});
