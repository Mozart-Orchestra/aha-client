import { useAuth } from '@/auth/AuthContext';
import * as React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useIsTablet } from '@/utils/responsive';
import { SidebarView } from './SidebarView';
import { usePathname } from 'expo-router';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DESKTOP_BREAKPOINT, isEmbeddedDesktopRoute } from '@/navigation/navigationConfig';
import { DesktopShellContext, DesktopShellContextValue } from './DesktopShellContext';

export const SidebarNavigator = React.memo(() => {
    const auth = useAuth();
    const isTablet = useIsTablet();
    const pathname = usePathname();
    const { width: windowWidth } = useWindowDimensions();

    const isDesktopWeb = Platform.OS === 'web' && windowWidth >= DESKTOP_BREAKPOINT;
    const allowEmbeddedWithoutAuth = pathname === '/settings';
    const isEmbedded = isDesktopWeb
        && isEmbeddedDesktopRoute(pathname)
        && (auth.isAuthenticated || allowEmbeddedWithoutAuth);
    // On web, only the isEmbedded path handles the desktop shell. Below DESKTOP_BREAKPOINT
    // the app shows mobile layout (hidden drawer). Never use the permanent-drawer tablet
    // path on web — it causes a duplicate ThreeColumnShell because both the Drawer's
    // drawerContent and the route's SidebarView each render their own ThreeColumnShell.
    const showPermanentDrawer = auth.isAuthenticated && isTablet && !isEmbedded && Platform.OS !== 'web';

    // --- Desktop persistent shell state ---
    const [desktopMainPanel, setDesktopMainPanel] = React.useState<React.ReactNode>(null);
    const desktopCtxValue = React.useMemo<DesktopShellContextValue>(
        () => ({ setMainPanel: setDesktopMainPanel }),
        [],
    );

    // Calculate drawer width only when needed
    const drawerWidth = React.useMemo(() => {
        if (!showPermanentDrawer) return 280;
        return Math.min(Math.max(Math.floor(windowWidth * 0.34), 420), 456);
    }, [windowWidth, showPermanentDrawer]);

    const hiddenDrawerOptions = React.useMemo(() => ({
        lazy: false,
        headerShown: false,
        drawerType: 'front' as const,
        swipeEnabled: false,
        drawerStyle: { width: 0, display: 'none' as const },
        overlayColor: 'transparent',
    }), []);

    const permanentDrawerOptions = React.useMemo(() => ({
        lazy: false,
        headerShown: false,
        drawerType: 'permanent' as const,
        drawerStyle: {
            backgroundColor: 'transparent',
            borderRightWidth: 0,
            width: drawerWidth,
        },
        swipeEnabled: false,
        drawerActiveTintColor: 'transparent',
        drawerInactiveTintColor: 'transparent',
        drawerItemStyle: { display: 'none' as const },
        drawerLabelStyle: { display: 'none' as const },
    }), [drawerWidth]);

    const drawerContent = React.useCallback(
        () => <SidebarView />,
        [],
    );

    // --- Desktop embedded: single persistent shell, Drawer only for routing ---
    // Ref to set `inert` on web — prevents the hidden Drawer's position:fixed
    // scrim from capturing focus/pointer events outside overflow:hidden bounds.
    const overlayRef = React.useRef<View>(null);
    React.useEffect(() => {
        if (isEmbedded && Platform.OS === 'web' && overlayRef.current) {
            const node = overlayRef.current as unknown as HTMLElement;
            node.setAttribute('inert', '');
        }
    }, [isEmbedded]);

    if (isEmbedded) {
        return (
            <>
                {/* Persistent three-column shell — stable across route changes */}
                <SidebarView mainPanel={desktopMainPanel} />

                {/*
                  * Routing layer: Drawer handles URL-based navigation so
                  * expo-router can mount/unmount route components. Route
                  * pages call SidebarView which, inside this context,
                  * injects their mainPanel and returns null. The overlay
                  * is mounted far off-screen so it never blocks or steals
                  * pointer events from the persistent shell above.
                  */}
                <DesktopShellContext.Provider value={desktopCtxValue}>
                    <View ref={overlayRef} style={styles.routingOverlay} pointerEvents="none">
                        <Drawer screenOptions={hiddenDrawerOptions} />
                    </View>
                </DesktopShellContext.Provider>
            </>
        );
    }

    // --- Tablet / phone ---
    const drawerNavigationOptions = showPermanentDrawer ? permanentDrawerOptions : hiddenDrawerOptions;

    return (
        <Drawer
            screenOptions={drawerNavigationOptions}
            drawerContent={showPermanentDrawer ? drawerContent : undefined}
        />
    );
});

const styles = StyleSheet.create({
    routingOverlay: {
        position: 'absolute',
        top: -20000,
        left: -20000,
        width: 1,
        height: 1,
        overflow: 'hidden',
        opacity: 0,
        zIndex: -1,
    },
});
