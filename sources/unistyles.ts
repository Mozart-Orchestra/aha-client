import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import { darkTheme, lightTheme } from './theme';
import { loadThemePreference } from './sync/persistence';
import * as SystemUI from 'expo-system-ui';

//
// Theme
//

const appThemes = {
    light: lightTheme,
    dark: darkTheme
};

const breakpoints = {
    xs: 0, // <-- make sure to register one breakpoint with value 0
    sm: 300,
    md: 500,
    lg: 800,
    xl: 1200
    // use as many breakpoints as you need
};

// Load theme preference from storage
const themePreference = loadThemePreference();

const settings = {
    initialTheme: themePreference,
    CSSVars: true,
};

//
// Bootstrap
//

type AppThemes = typeof appThemes
type AppBreakpoints = typeof breakpoints

declare module 'react-native-unistyles' {
    export interface UnistylesThemes extends AppThemes { }
    export interface UnistylesBreakpoints extends AppBreakpoints { }
}

StyleSheet.configure({
    settings,
    breakpoints,
    themes: appThemes,
})

// Set initial root view background color based on theme
const setRootBackgroundColor = () => {
    const color = themePreference === 'dark'
        ? appThemes.dark.colors.groupped.background
        : appThemes.light.colors.groupped.background;
    UnistylesRuntime.setRootViewBackgroundColor(color);
    SystemUI.setBackgroundColorAsync(color);
};

// Set initial background color
setRootBackgroundColor();
