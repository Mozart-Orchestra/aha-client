import { Ionicons } from '@expo/vector-icons';

/**
 * Shared desktop breakpoint used by SidebarNavigator, index.tsx, and other
 * components that need to distinguish phone vs. desktop-shell layouts.
 */
export const DESKTOP_BREAKPOINT = 1180;

/**
 * Canonical navigation-tab keys shared between the sidebar rail (desktop)
 * and the bottom TabBar (phone).
 *
 * - 'home'     -> sessions list / main landing
 * - 'agents'   -> agents screen (rail only)
 * - 'teams'    -> teams screen
 * - 'settings' -> settings screen
 *
 * 'zen' is intentionally excluded: it is a phone-only experimental tab that
 * only appears when `settings.experiments` is enabled, and is managed locally
 * inside TabBar / MainView.
 */
export type NavTabKey = 'home' | 'agents' | 'teams' | 'settings';

export interface NavTabDefinition {
    /** Unique key for the tab. */
    key: NavTabKey;
    /** Route path to navigate to. */
    route: string;
    /** Ionicons name used on the sidebar rail (desktop). */
    railIcon: keyof typeof Ionicons.glyphMap;
    /** Brutalist PNG image used on the bottom tab bar (phone). */
    tabIcon: number | null;
    /** i18n key for the tab label shown in the phone bottom tab bar (e.g. 'tabs.sessions'). */
    tabLabelKey: string | null;
    /** Whether this tab appears in the rail icon group (top section of sidebar). */
    showInRail: boolean;
    /** Whether this tab appears in the dock (bottom section of sidebar). */
    showInDock: boolean;
    /** Whether this tab appears in the phone bottom tab bar. */
    showInTabBar: boolean;
}

/**
 * Single source of truth for all navigation tabs.
 *
 * Order matters: tabs are rendered in array order within each surface.
 */
export const NAV_TABS: readonly NavTabDefinition[] = [
    {
        key: 'home',
        route: '/',
        railIcon: 'home-outline',
        tabIcon: require('@/assets/images/brutalist/Brutalism_15.png'),
        tabLabelKey: 'tabs.sessions',
        showInRail: true,
        showInDock: false,
        showInTabBar: true,
    },
    {
        key: 'agents',
        route: '/agents',
        railIcon: 'hardware-chip-outline',
        tabIcon: null,
        tabLabelKey: null,
        showInRail: true,
        showInDock: false,
        showInTabBar: false,
    },
    {
        key: 'teams',
        route: '/teams',
        railIcon: 'chatbubbles-outline',
        tabIcon: require('@/assets/images/brutalist/Brutalism_5.png'),
        tabLabelKey: null,
        showInRail: true,
        showInDock: false,
        showInTabBar: true,
    },
    {
        key: 'settings',
        route: '/settings',
        railIcon: 'settings-outline',
        tabIcon: require('@/assets/images/brutalist/Brutalism_9.png'),
        tabLabelKey: 'tabs.settings',
        showInRail: false,
        showInDock: true,
        showInTabBar: true,
    },
] as const;

/**
 * Derive the active NavTabKey from the current pathname.
 *
 * Falls back to 'home' for unrecognised paths.
 */
export function getActiveTabFromPathname(pathname: string): NavTabKey {
    if (pathname.startsWith('/restore')) {
        return 'settings';
    }
    if (pathname.startsWith('/settings')) {
        return 'settings';
    }
    if (pathname.startsWith('/teams')) {
        return 'teams';
    }
    if (pathname.startsWith('/agents')) {
        return 'agents';
    }
    return 'home';
}

/**
 * Routes that are rendered inside the desktop three-column shell and therefore
 * should NOT show the permanent expo-router Drawer.
 *
 * Used by SidebarNavigator to decide whether to hide the drawer.
 */
export function isEmbeddedDesktopRoute(pathname: string): boolean {
    return (
        pathname === '/'
        || pathname === '/agents'
        || pathname === '/agents/new'
        || /^\/agents\/[^/]+$/.test(pathname)
        || pathname === '/teams'
        || pathname === '/teams/new'
        || /^\/teams\/[^/]+$/.test(pathname)
        || pathname === '/restore'
        || pathname.startsWith('/restore/')
        || pathname.startsWith('/session/')
    );
}
