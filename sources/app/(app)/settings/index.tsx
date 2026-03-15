import * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';

import { SettingsView } from '@/components/settings/SettingsView';
import { SettingsViewWrapper } from '@/components/settings/SettingsViewWrapper';
import { SidebarView } from '@/components/layout/SidebarView';
import { DESKTOP_BREAKPOINT } from '@/navigation/navigationConfig';
import { useIsTablet } from '@/utils/responsive';
import { t } from '@/text';

export default function SettingsIndexScreen() {
    const isTablet = useIsTablet();
    const { width } = useWindowDimensions();
    const isDesktopShell = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    if (isDesktopShell) {
        return (
            <>
                <Stack.Screen
                    options={{
                        headerShown: false,
                        headerTitle: t('settings.title'),
                    }}
                />
                <SidebarView mainPanel={<SettingsViewWrapper />} />
            </>
        );
    }

    if (isTablet) {
        return <View style={{ flex: 1 }} />;
    }

    return <SettingsView />;
}
