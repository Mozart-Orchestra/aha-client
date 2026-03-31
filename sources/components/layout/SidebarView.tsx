import * as React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AhaLogo } from '@/components/ui/AhaLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { SidebarMainPanel } from './SidebarMainPanel';
import {
    ThreeColumnShell,
    ThreeColumnShellVariant,
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
    const safeArea = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const { height: windowHeight } = useWindowDimensions();

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
            style={[styles.railButton, active ? styles.railButtonActive : styles.railButtonInactive]}
            onPress={onPress}
        >
            <LinearGradient
                colors={['#30465D', '#1D2A3A'] as [string, string]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.railButtonGradient, { opacity: active ? 1 : 0 }]}
                pointerEvents="none"
            />
            <Ionicons
                name={icon}
                size={20}
                color={active ? '#F7FBFD' : '#C1CCD5'}
            />
        </Pressable>
    ), []);

    const railContent = React.useMemo(() => (
        <>
            <Pressable onPress={() => router.push('/' as never)}>
                <LinearGradient
                    colors={['#FFFFFF', '#ECF2F6'] as [string, string]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.railLogo}
                >
                    <AhaLogo size={20} color="#0D1117" />
                </LinearGradient>
            </Pressable>
            <View style={styles.railDivider} />
            <View style={styles.railIcons}>
                {NAV_TABS.filter(t => t.showInRail).map(tab =>
                    renderRailButton(tab.key, tab.railIcon, activeTab === tab.key, () => router.push(tab.route as never))
                )}
            </View>
            <View style={styles.railSpacer} />
        </>
    ), [activeTab, renderRailButton, router]);

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
        borderColor: '#425A72',
        shadowColor: '#0F1A22',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 3,
    },
    railButtonInactive: {
        backgroundColor: '#FFFFFF06',
        borderWidth: 1,
        borderColor: '#FFFFFF0D',
    },
    railButtonGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
    railLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D7E1E8',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    railIcons: {
        alignItems: 'center',
        gap: 14,
    },
    railDivider: {
        width: 22,
        height: 1,
        backgroundColor: '#FFFFFF14',
        marginTop: 2,
        marginBottom: 2,
    },
    railSpacer: {
        flex: 1,
    },
}));
