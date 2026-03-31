import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://cegpdcfsqcfowgwkpanl.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZ3BkY2ZzcWNmb3dnd2twYW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODM3MDcsImV4cCI6MjA5MDQ1OTcwN30.4Y2QD5oTjze_QxEAeTBPUYTbOhhCeCr-LRVyJoiIK64';

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
