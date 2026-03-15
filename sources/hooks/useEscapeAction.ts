import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useEscapeAction(enabled: boolean, action: () => void) {
    useEffect(() => {
        if (!enabled || Platform.OS !== 'web') {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            action();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [action, enabled]);
}
