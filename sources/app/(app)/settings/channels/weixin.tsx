import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Item } from '@/components/ui/Item';
import { ItemGroup } from '@/components/ui/ItemGroup';
import { ItemList } from '@/components/ui/ItemList';
import { Modal } from '@/modal';
import { t } from '@/text';
import { useUnistyles } from 'react-native-unistyles';

/**
 * WeChat channel settings screen.
 *
 * V1: Configuration is handled via CLI (`aha channels weixin login`).
 * This screen shows the current status and CLI instructions.
 * Push policy selection is shown as copyable CLI commands.
 */
export default React.memo(function WeixinChannelScreen() {
    const { theme } = useUnistyles();

    const copyCommand = React.useCallback(async (cmd: string, label: string) => {
        await Clipboard.setStringAsync(cmd);
        Modal.alert(t('common.copied'), t('items.copiedToClipboard', { label }));
    }, []);

    return (
        <ItemList style={{ paddingTop: 0 }}>

            {/* Connect */}
            <ItemGroup
                title={t('settings.channelsWeixin')}
                footer={t('channels.cliFooter')}
            >
                <Item
                    title={t('channels.connectWeixin')}
                    subtitle="aha channels weixin login"
                    icon={<Ionicons name="qr-code-outline" size={29} color="#09B83E" />}
                    onPress={() => void copyCommand('aha channels weixin login', t('channels.connectWeixin'))}
                />
                <Item
                    title={t('channels.checkStatus')}
                    subtitle="aha channels status"
                    icon={<Ionicons name="radio-outline" size={29} color="#007AFF" />}
                    onPress={() => void copyCommand('aha channels status', t('channels.checkStatus'))}
                />
                <Item
                    title={t('common.disconnect')}
                    subtitle="aha channels weixin disconnect"
                    icon={<Ionicons name="close-circle-outline" size={29} color="#FF3B30" />}
                    onPress={() => void copyCommand('aha channels weixin disconnect', t('common.disconnect'))}
                />
            </ItemGroup>

            {/* Push policy */}
            <ItemGroup title={t('channels.pushPolicyTitle')} footer={t('channels.pushPolicyFooter')}>
                <Item
                    title={t('channels.policyAll')}
                    subtitle="aha channels weixin policy all"
                    icon={<Ionicons name="notifications-outline" size={29} color={theme.colors.textSecondary} />}
                    onPress={() => void copyCommand('aha channels weixin policy all', t('channels.policyAll'))}
                />
                <Item
                    title={t('channels.policyImportant')}
                    subtitle="aha channels weixin policy important"
                    icon={<Ionicons name="notifications-off-outline" size={29} color={theme.colors.textSecondary} />}
                    onPress={() => void copyCommand('aha channels weixin policy important', t('channels.policyImportant'))}
                />
            </ItemGroup>

            {/* Usage guide */}
            <ItemGroup title={t('channels.usageGuide')}>
                <Item title={t('channels.guide1')} icon={<Ionicons name="arrow-forward-circle-outline" size={22} color={theme.colors.textSecondary} />} />
                <Item title={t('channels.guide2')} icon={<Ionicons name="at-outline" size={22} color={theme.colors.textSecondary} />} />
                <Item title={t('channels.guide3')} icon={<Ionicons name="pricetag-outline" size={22} color={theme.colors.textSecondary} />} />
            </ItemGroup>

        </ItemList>
    )
})
