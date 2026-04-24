import * as React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AhaLogo } from '@/components/ui/AhaLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { SidebarMainPanel } from './SidebarMainPanel';
import {
    ThreeColumnShell,
    ThreeColumnShellVariant,
    getThreeColumnShellTokens,
} from './ThreeColumnShell';
import {
    type NavTabKey,
    NAV_TABS,
    getActiveTabFromPathname,
} from '@/navigation/navigationConfig';
import { DesktopShellContext } from './DesktopShellContext';

const GITHUB_FEEDBACK_URL = 'https://github.com/Shiyao-Huang/aha/issues/new/choose';

interface SidebarViewProps {
    mainPanel?: React.ReactNode;
    secondaryPanel?: React.ReactNode;
}

export const SidebarView = React.memo(({ mainPanel, secondaryPanel }: SidebarViewProps) => {
    const desktopShell = React.useContext(DesktopShellContext);
    const variant: ThreeColumnShellVariant = 'default';
    const { theme } = useUnistyles();
    const safeArea = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const { height: windowHeight } = useWindowDimensions();
    const shellTokens = React.useMemo(
        () => getThreeColumnShellTokens(variant, theme),
        [theme, variant],
    );

    const activeTab = React.useMemo<NavTabKey>(
        () => getActiveTabFromPathname(pathname),
        [pathname],
    );

    const renderRailButton = React.useCallback((
        key: string,
        icon: keyof typeof Ionicons.glyphMap,
        active: boolean,
        onPress: () => void,
    ) => (
        <Pressable
            key={key}
            style={[
                styles.railButton,
                active ? styles.railButtonActive : styles.railButtonInactive,
                {
                    backgroundColor: active ? shellTokens.railActiveBackground : 'rgba(255, 249, 240, 0.06)',
                    borderColor: active ? shellTokens.railActiveBorder : 'rgba(255, 249, 240, 0.1)',
                },
            ]}
            onPress={onPress}
        >
            <Ionicons
                name={icon}
                size={20}
                color={active ? shellTokens.railIconActive : shellTokens.railIconInactive}
            />
        </Pressable>
    ), [shellTokens]);

    const railContent = React.useMemo(() => (
        <>
            <Pressable
                onPress={() => router.push('/' as never)}
                style={[
                    styles.railLogo,
                    {
                        backgroundColor: shellTokens.mainPanelColors[0],
                        borderColor: shellTokens.panelBorder,
                    },
                ]}
            >
                <AhaLogo size={20} color={shellTokens.panelTitle} />
            </Pressable>
            <View
                style={[
                    styles.railDivider,
                    { backgroundColor: 'rgba(255, 249, 240, 0.12)' },
                ]}
            />
            <View style={styles.railIcons}>
                {NAV_TABS.filter(t => t.showInRail).map(tab =>
                    renderRailButton(tab.key, tab.railIcon, activeTab === tab.key, () => router.push(tab.route as never))
                )}
            </View>
            <View style={styles.railSpacer} />
        </>
    ), [activeTab, renderRailButton, router, shellTokens]);

    const dockContent = React.useMemo(() => (
        <>
            {NAV_TABS.filter(t => t.showInDock).map(tab =>
                renderRailButton(tab.key, tab.railIcon, activeTab === tab.key, () => router.push(tab.route as never))
            )}
        </>
    ), [activeTab, renderRailButton, router]);

    const resolvedSecondaryPanel = React.useMemo(() => {
        if (secondaryPanel) {
            return secondaryPanel;
        }

        return <SidebarMainPanel variant={variant} />;
    }, [secondaryPanel, variant]);

    // When inside the persistent desktop shell context, inject mainPanel into
    // the navigator-level SidebarView and render nothing ourselves. This keeps
    // the rail and secondary panel stable across route changes.
    // useFocusEffect ensures only the currently focused route injects — this
    // prevents stale content when navigating between routes that are all
    // kept mounted by the Drawer (lazy: false). It also re-injects whenever
    // mainPanel or desktopShell changes while the screen is focused.
    useFocusEffect(
        React.useCallback(() => {
            if (!desktopShell) return;
            desktopShell.setMainPanel(mainPanel ?? null);
        }, [desktopShell, mainPanel]),
    );

    if (desktopShell) {
        return null;
    }

    return (
        <View style={styles.shellWrap}>
            <ThreeColumnShell
                variant={variant}
                railContent={railContent}
                dockContent={dockContent}
                secondaryPanel={resolvedSecondaryPanel}
                mainPanel={mainPanel}
                canvasMinHeight={windowHeight}
                contentMinHeight={Math.max(windowHeight - safeArea.top - safeArea.bottom, 0)}
                safeAreaTop={safeArea.top}
                safeAreaBottom={safeArea.bottom}
            />
        </View>
    );
});

const styles = StyleSheet.create(() => ({
    shellWrap: {
        flex: 1,
    },
    railButton: {
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    railButtonActive: {
        borderWidth: 1,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    railButtonInactive: {
        borderWidth: 1,
    },
    railLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    railIcons: {
        alignItems: 'center',
        gap: 14,
    },
    railDivider: {
        width: 24,
        height: 1,
        marginTop: 2,
        marginBottom: 2,
    },
    railSpacer: {
        flex: 1,
    },
}));
