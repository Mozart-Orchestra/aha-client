import React from 'react';
import { UsagePanel } from '@/components/usage/UsagePanel';
import { ItemList } from '@/components/ui/ItemList';

export default function UsageSettingsScreen() {
    return (
        <ItemList style={{ paddingTop: 0 }}>
            <UsagePanel />
        </ItemList>
    );
}