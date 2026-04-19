import { Platform } from 'react-native';

import { supabase } from '@/auth/supabase';
import { shouldClearSupabaseSessionError } from '@/auth/supabaseSessionError';

const SUPABASE_STORAGE_KEY = 'supabase_session';
export { shouldClearSupabaseSessionError } from '@/auth/supabaseSessionError';

export async function clearSupabaseSession(): Promise<void> {
    try {
        await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
        console.warn('Failed to locally sign out stale Supabase session:', error);
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
    }
}
