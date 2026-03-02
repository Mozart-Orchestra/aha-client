/**
 * Error Alert Component
 *
 * Unified error display component with support for different severity levels
 */

import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ErrorSeverity = "error" | "warning" | "info";

export interface ErrorAlertProps {
    /** Error message to display */
    message: string;

    /** Error code from API */
    code?: string;

    /** Severity level (error/warning/info) */
    severity?: ErrorSeverity;

    /** Optional title */
    title?: string;

    /** Optional retry callback */
    onRetry?: () => void;

    /** Optional dismiss callback */
    onDismiss?: () => void;

    /** Additional details to show */
    details?: Record<string, any>;

    /** Whether to show timestamp */
    showTimestamp?: boolean;
}

const severityColors = {
    error: {
        bg: "rgba(255, 59, 48, 0.1)",
        border: "#ff3b30",
        icon: "#ff3b30" as const,
    },
    warning: {
        bg: "rgba(255, 149, 0, 0.1)",
        border: "#ff9500",
        icon: "#ff9500" as const,
    },
    info: {
        bg: "rgba(0, 122, 255, 0.1)",
        border: "#007aff",
        icon: "#007aff" as const,
    },
};

const severityIcons = {
    error: "alert-circle" as const,
    warning: "warning" as const,
    info: "information-circle" as const,
};

export function ErrorAlert({
    message,
    code,
    severity = "error",
    title,
    onRetry,
    onDismiss,
    details,
    showTimestamp = false,
}: ErrorAlertProps) {
    const colors = severityColors[severity];
    const iconName = severityIcons[severity];

    return (
        <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Ionicons name={iconName} size={24} color={colors.icon} />
                {title && <Text style={styles.title}>{title}</Text>}
                {onDismiss && (
                    <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                        <Ionicons name="close" size={20} color="#8f7a61" />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.message}>{message}</Text>

            {code && (
                <Text style={styles.code}>
                    Error Code: {code}
                </Text>
            )}

            {showTimestamp && (
                <Text style={styles.timestamp}>
                    {new Date().toLocaleString()}
                </Text>
            )}

            {details && Object.keys(details).length > 0 && (
                <View style={styles.detailsContainer}>
                    {Object.entries(details).map(([key, value]) => (
                        <Text key={key} style={styles.detailText}>
                            {key}: {String(value)}
                        </Text>
                    ))}
                </View>
            )}

            {(onRetry || onDismiss) && (
                <View style={styles.actions}>
                    {onRetry && (
                        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                            <Ionicons name="refresh" size={16} color="#b27106" />
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
        marginVertical: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: "#f7ecdc",
        marginLeft: 8,
        flex: 1,
    },
    dismissButton: {
        padding: 4,
    },
    message: {
        fontSize: 14,
        color: "#f0e2cb",
        lineHeight: 20,
        marginBottom: 8,
    },
    code: {
        fontSize: 12,
        color: "#8f7a61",
        fontFamily: "monospace",
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 11,
        color: "#6e5d4a",
        marginBottom: 8,
    },
    detailsContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: "rgba(20, 13, 8, 0.5)",
        borderRadius: 8,
    },
    detailText: {
        fontSize: 12,
        color: "#8f7a61",
        fontFamily: "monospace",
        marginBottom: 4,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 12,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#b27106",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    retryText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#f7ecdc",
        marginLeft: 6,
    },
});
