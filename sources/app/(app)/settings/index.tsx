import * as React from 'react';
import { View } from 'react-native';

import { SettingsView } from '@/components/settings/SettingsView';
import { useIsTablet } from '@/utils/responsive';

export default function SettingsIndexScreen() {
    const isTablet = useIsTablet();

    if (isTablet) {
        return <View style={{ flex: 1 }} />;
    }

    return <SettingsView />;
}
