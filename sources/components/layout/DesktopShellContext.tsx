import * as React from 'react';

/**
 * Context that allows embedded desktop route pages to inject their mainPanel
 * content into the single persistent SidebarView rendered by SidebarNavigator.
 *
 * When a SidebarView is rendered inside this context (i.e. from a route page),
 * it does NOT render its own shell — it calls setMainPanel and returns null.
 * The persistent SidebarView at the navigator level displays the result.
 */
export interface DesktopShellContextValue {
    setMainPanel: (panel: React.ReactNode) => void;
}

export const DesktopShellContext = React.createContext<DesktopShellContextValue | null>(null);
