/**
 * Styles for the ReviewPRButton component (R12).
 *
 * Exported as a StyleSheet.create result so the consuming component can
 * reference styles directly without needing the hook pattern.
 */

import { StyleSheet } from 'react-native-unistyles';

export const ACCENT_GREEN = '#3D8A5A';
export const ACCENT_RED = '#D08068';
export const ACCENT_ORANGE = '#D0A068';

export const reviewStyles = StyleSheet.create((theme) => ({
    // Trigger button
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    triggerText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginLeft: 6,
    },

    // Modal overlay
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.divider,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    sheetScroll: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 6,
    },

    // Inputs
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },

    // Focus area pills
    focusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    focusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.groupped.background,
    },
    focusPillActive: {
        borderColor: ACCENT_GREEN,
        backgroundColor: '#E8F5EE',
    },
    focusPillText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    focusPillTextActive: {
        color: ACCENT_GREEN,
        fontWeight: '600',
    },

    // Primary button
    startButton: {
        backgroundColor: ACCENT_GREEN,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },

    // Progress
    progressSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    progressText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 12,
    },

    // Findings
    findingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    verdictBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    verdictText: {
        fontSize: 12,
        fontWeight: '700',
    },
    findingCard: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderLeftWidth: 3,
    },
    findingTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    findingLocation: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    findingMessage: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 18,
    },
    findingSuggestion: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        lineHeight: 17,
        fontStyle: 'italic',
    },
    findingConfidence: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 6,
    },
    noFindingsText: {
        fontSize: 14,
        color: ACCENT_GREEN,
        textAlign: 'center',
        paddingVertical: 20,
    },

    // Metrics row (completed state)
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        marginBottom: 16,
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 12,
    },
    metric: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    metricLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
}));
