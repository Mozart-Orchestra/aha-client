import React from 'react';
import { Platform } from 'react-native';
import { storage } from '@/sync/storage';

// Lazy load web-only utilities to avoid import issues on native platforms
const loadFaviconUtils = async () => {
    if (Platform.OS === 'web') {
        const utils = await import('@/utils/web/faviconGenerator');
        return utils;
    }
    return null;
};

/**
 * Component that monitors all sessions and updates the favicon
 * when any online session has pending permissions
 */
export const FaviconPermissionIndicator = React.memo(() => {
    const [faviconUtils, setFaviconUtils] = React.useState<any>(null);
    const isWeb = Platform.OS === 'web';

    // IMPORTANT: All hooks must be called before any conditional returns
    // to satisfy React's Rules of Hooks (same order every render)

    const hasOnlineSessionWithPermissions = storage((state) => {
        // On non-web platforms, always return false
        if (!isWeb) return false;

        return Object.values(state.sessions).some(session => {
            // Use centralized presence logic - only "online" sessions matter
            const isOnline = session.presence === 'online';

            const hasPermissions = session.agentState?.requests &&
                Object.keys(session.agentState.requests).length > 0;

            return isOnline && hasPermissions;
        });
    });

    React.useEffect(() => {
        if (isWeb) {
            loadFaviconUtils().then(setFaviconUtils);
        }
    }, [isWeb]);

    React.useLayoutEffect(() => {
        if (!isWeb || !faviconUtils) return;

        if (hasOnlineSessionWithPermissions) {
            faviconUtils.updateFaviconWithNotification();
        } else {
            faviconUtils.resetFavicon();
        }
    }, [hasOnlineSessionWithPermissions, faviconUtils, isWeb]);

    React.useLayoutEffect(() => {
        if (!isWeb || !faviconUtils) return;

        return () => {
            faviconUtils.resetFavicon();
        };
    }, [faviconUtils, isWeb]);

    // All hooks called above, safe to return null now
    if (!isWeb || typeof window === 'undefined' || typeof document === 'undefined') {
        return null;
    }

    return null;
});

FaviconPermissionIndicator.displayName = 'FaviconPermissionIndicator';