import * as React from 'react';
import { Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

// Absolute fill helper — avoids StyleSheet.absoluteFill import issues across platforms
const ABS_FILL: React.ComponentProps<typeof View>['style'] = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

export type ThreeColumnShellVariant = 'default' | 'textured' | 'glass';

export interface ThreeColumnShellTokens {
    shellNodeId: string;
    railNodeId: string;
    sidebarNodeId: string;
    mainPanelNodeId: string;
    canvasColors: readonly [string, string];
    railOuterColors: readonly [string, string];
    railInnerColors: readonly [string, string];
    dockOuterColors: readonly [string, string];
    dockInnerColors: readonly [string, string];
    secondaryPanelColors: readonly [string, string];
    mainPanelColors: readonly [string, string];
    railOuterBorder: string;
    railInnerBorder: string;
    railActiveBackground: string;
    railActiveBorder: string;
    railIconActive: string;
    railIconInactive: string;
    dockInnerBorder: string;
    panelBorder: string;
    panelDivider: string;
    panelTitle: string;
    panelEyebrow: string;
    panelTextSecondary: string;
    strongIconBackground: string;
    strongIconForeground: string;
    softIconBackground: string;
    softIconForeground: string;
    chipBackground: string;
    chipBorder: string;
    chipText: string;
    actionBackground: string;
    actionBorder: string;
    actionText: string;
    primaryActionBackground: string;
    primaryActionText: string;
    cardBackground: string;
    cardBorder: string;
    cardMutedBackground: string;
    avatarBackground: string;
    emptyIcon: string;
}

const DEFAULT_TOKENS: ThreeColumnShellTokens = {
    shellNodeId: '27Csn',
    railNodeId: 'FPwnA',
    sidebarNodeId: 'mFdMZ',
    mainPanelNodeId: 'edzLF',
    canvasColors: ['#F1E8DA', '#F1E8DA'],
    railOuterColors: ['#F7F0E6', '#F7F0E6'],
    railInnerColors: ['#2E352F', '#2E352F'],
    dockOuterColors: ['#F7F0E6', '#F7F0E6'],
    dockInnerColors: ['#3A3329', '#3A3329'],
    secondaryPanelColors: ['#FAF5EC', '#FAF5EC'],
    mainPanelColors: ['#FFF9F0', '#FFF9F0'],
    railOuterBorder: '#E2D4C0',
    railInnerBorder: '#465043',
    railActiveBackground: '#F4E7D4',
    railActiveBorder: '#D8C7AE',
    railIconActive: '#2E352F',
    railIconInactive: '#B9AC99',
    dockInnerBorder: '#5A5144',
    panelBorder: '#E4D6C3',
    panelDivider: '#E8DDCC',
    panelTitle: '#302A22',
    panelEyebrow: '#8B806F',
    panelTextSecondary: '#776C5E',
    strongIconBackground: '#3F4A3F',
    strongIconForeground: '#FFF9F0',
    softIconBackground: '#EFE3D0',
    softIconForeground: '#3F4A3F',
    chipBackground: '#F3E8D8',
    chipBorder: '#E4D6C3',
    chipText: '#675B4D',
    actionBackground: '#FFF9F0',
    actionBorder: '#E4D6C3',
    actionText: '#3F4A3F',
    primaryActionBackground: '#3F4A3F',
    primaryActionText: '#FFFFFF',
    cardBackground: '#FFFDF8',
    cardBorder: '#E5D8C6',
    cardMutedBackground: '#F4EADC',
    avatarBackground: '#3F4A3F',
    emptyIcon: '#8B806F',
};

const VARIANT_TOKENS: Record<ThreeColumnShellVariant, ThreeColumnShellTokens> = {
    default: DEFAULT_TOKENS,
    // Theme variants are declared now and will be filled with their own tokens later.
    textured: {
        ...DEFAULT_TOKENS,
        shellNodeId: 'uOTVX',
    },
    glass: {
        ...DEFAULT_TOKENS,
        shellNodeId: '5Pcbb',
    },
};

const styles = StyleSheet.create((theme) => ({
    canvas: {
        flex: 1,
        width: '100%',
    },
    shell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 20,
        minHeight: 0,
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    railWrap: {
        width: 86,
        alignItems: 'center',
        flexShrink: 0,
        gap: 18,
        minHeight: 0,
    },
    railOuter: {
        width: 70,
        flex: 1,
        borderRadius: 32,
        overflow: 'hidden',
        padding: 8,
        borderWidth: 1,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 0,
    },
    railInner: {
        flex: 1,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 7,
        gap: 16,
    },
    dockOuter: {
        width: 60,
        height: 84,
        borderRadius: 22,
        overflow: 'hidden',
        padding: 7,
        borderWidth: 1,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 0,
    },
    dockInner: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    secondaryPanel: {
        minWidth: 240,
        flexBasis: 280,
        flexGrow: 1,
        flexShrink: 0,
        maxWidth: 420,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 0,
        minHeight: 0,
    },
    mainPanel: {
        flex: 2,
        minWidth: 0,
        minHeight: 0,
    },
    mainPanelSurface: {
        flex: 1,
        alignSelf: 'stretch',
        borderRadius: 24,
        overflow: Platform.OS === 'web' ? ('auto' as any) : 'hidden',
        borderWidth: 1,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 0,
        minWidth: 0,
        minHeight: 0,
    },
}));

export function getThreeColumnShellTokens(variant: ThreeColumnShellVariant = 'default', theme?: { colors: { text: string; textSecondary: string; divider: string; surface: string; surfaceHigh: string; shadow: { color: string } } }): ThreeColumnShellTokens {
    const base = VARIANT_TOKENS[variant];
    if (!theme) return base;
    return base;
}

interface ThreeColumnShellProps {
    variant?: ThreeColumnShellVariant;
    railContent: React.ReactNode;
    dockContent?: React.ReactNode;
    secondaryPanel: React.ReactNode;
    mainPanel?: React.ReactNode;
    canvasMinHeight?: number;
    contentMinHeight?: number;
    maxWidth?: number;
    safeAreaTop?: number;
    safeAreaBottom?: number;
}

export function ThreeColumnShell({
    variant = 'default',
    railContent,
    dockContent,
    secondaryPanel,
    mainPanel,
    canvasMinHeight,
    contentMinHeight,
    maxWidth,
    safeAreaTop = 0,
    safeAreaBottom = 0,
}: ThreeColumnShellProps) {
    const { theme } = useUnistyles();
    const tokens = getThreeColumnShellTokens(variant, theme);

    return (
        <LinearGradient
            colors={tokens.canvasColors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.canvas,
                canvasMinHeight ? { minHeight: canvasMinHeight } : null,
                // On web the flex:1 chain may not reach 100vh if an ancestor has height:auto.
                // Force the canvas to fill the full viewport height on web.
                Platform.OS === 'web' ? { height: '100vh' as any } : null,
            ]}
        >
            <View
                style={[
                    styles.shell,
                    {
                        alignSelf: maxWidth ? 'center' : 'stretch',
                        maxWidth,
                        minHeight: contentMinHeight,
                        paddingTop: safeAreaTop + 20,
                        paddingBottom: Math.max(safeAreaBottom, 16) + 8,
                        width: '100%',
                    },
                ]}
            >
                <View style={styles.railWrap}>
                    {/* Rail outer shell — View handles border-radius clipping; LinearGradient is a background layer */}
                    <View style={[styles.railOuter, { borderColor: tokens.railOuterBorder }]}>
                        <LinearGradient
                            colors={tokens.railOuterColors as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={ABS_FILL}
                        />
                        <View style={[styles.railInner, { borderColor: tokens.railInnerBorder }]}>
                            <LinearGradient
                                colors={tokens.railInnerColors as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={ABS_FILL}
                            />
                            {railContent}
                        </View>
                    </View>

                    {dockContent ? (
                        <View style={[styles.dockOuter, { borderColor: tokens.railOuterBorder }]}>
                            <LinearGradient
                                colors={tokens.dockOuterColors as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={ABS_FILL}
                            />
                            <View style={[styles.dockInner, { borderColor: tokens.dockInnerBorder }]}>
                                <LinearGradient
                                    colors={tokens.dockInnerColors as [string, string]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={ABS_FILL}
                                />
                                {dockContent}
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Sidebar panel — View handles border-radius clipping */}
                <View style={[styles.secondaryPanel, { borderColor: tokens.panelBorder }]}>
                    <LinearGradient
                        colors={tokens.secondaryPanelColors as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={ABS_FILL}
                    />
                    {secondaryPanel}
                </View>

                {mainPanel ? (
                    <View style={styles.mainPanel}>
                        {/* Main panel — View handles border-radius clipping; content scrolls within */}
                        <View style={[styles.mainPanelSurface, { borderColor: tokens.panelBorder }]}>
                            <LinearGradient
                                colors={tokens.mainPanelColors as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={ABS_FILL}
                                pointerEvents="none"
                            />
                            {mainPanel}
                        </View>
                    </View>
                ) : null}
            </View>
        </LinearGradient>
    );
}
