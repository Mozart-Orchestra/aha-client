/**
 * Styles for the Morning Briefing screen (R11).
 *
 * Uses react-native-unistyles for theme-aware styling.
 * Design tokens: ACCENT_GREEN (#3D8A5A), ACCENT_RED (#D08068), ACCENT_BLUE (#3D6A8A)
 */

import { StyleSheet } from 'react-native-unistyles';

export const ACCENT_GREEN = '#3D8A5A';
export const ACCENT_RED = '#D08068';
export const ACCENT_BLUE = '#3D6A8A';
export const BACKGROUND = '#F5F4F1';

export const briefingStyles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // Header section
    headerSection: {
        paddingTop: 24,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    greetingDate: {
        fontSize: 15,
        color: theme.colors.textSecondary,
    },

    // Cards
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },

    // Metrics row
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    metricValue: {
        fontSize: 26,
        fontWeight: '700',
        color: ACCENT_GREEN,
    },
    metricLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    metricDivider: {
        width: 1,
        backgroundColor: theme.colors.divider,
        marginVertical: 4,
    },

    // Blockers card (highlighted in red)
    blockersCard: {
        backgroundColor: '#FDF0ED',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: ACCENT_RED,
    },
    blockersTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: ACCENT_RED,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },

    // Task rows
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    taskRowLast: {
        borderBottomWidth: 0,
    },
    taskIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
    },
    taskMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    confidenceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginLeft: 8,
    },
    confidenceText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Continue CTA card
    continueCTA: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: ACCENT_GREEN,
    },
    continueCTATitle: {
        fontSize: 13,
        fontWeight: '600',
        color: ACCENT_GREEN,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    continueTaskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    continueHint: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    resumeButton: {
        backgroundColor: ACCENT_GREEN,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    resumeButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },

    // Next actions card
    nextActionsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 6,
    },
    actionNumber: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: theme.colors.groupped.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 1,
    },
    actionNumberText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    actionText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },

    // Empty / loading states
    emptyText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    loadingText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 16,
    },
    summaryText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    },
}));
