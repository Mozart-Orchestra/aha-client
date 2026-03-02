/**
 * Empty State Component
 *
 * Unified empty state display for lists, pages, and sections
 */

import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type EmptyStateType =
    | "roles"
    | "ratings"
    | "teams"
    | "tasks"
    | "search"
    | "reviews"
    | "data"
    | "custom";

export interface EmptyStateProps {
    /** Type of empty state (provides default icon/message) */
    type?: EmptyStateType;

    /** Custom title */
    title?: string;

    /** Custom message */
    message?: string;

    /** Custom icon name */
    icon?: keyof typeof Ionicons.glyphMap;

    /** Optional action button */
    actionLabel?: string;

    /** Action callback */
    onAction?: () => void;

    /** Whether to show a shimmer loading state */
    loading?: boolean;
}

const defaultContent: Record<EmptyStateType, { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }> = {
    roles: {
        icon: "people-outline",
        title: "No Roles Found",
        message: "No roles match your criteria. Try adjusting your filters or create a new role.",
    },
    ratings: {
        icon: "star-outline",
        title: "No Ratings Yet",
        message: "This item hasn't received any ratings yet. Be the first to rate!",
    },
    teams: {
        icon: "git-branch-outline",
        title: "No Teams",
        message: "No teams found. Create a team to start collaborating.",
    },
    tasks: {
        icon: "checkmark-circle-outline",
        title: "No Tasks",
        message: "All caught up! No tasks to display.",
    },
    search: {
        icon: "search-outline",
        title: "No Results",
        message: "No results found for your search. Try different keywords.",
    },
    reviews: {
        icon: "chatbubble-outline",
        title: "No Reviews",
        message: "No reviews available yet. Submit a review to get started.",
    },
    data: {
        icon: "folder-open-outline",
        title: "No Data",
        message: "No data available to display.",
    },
    custom: {
        icon: "information-circle-outline",
        title: "Nothing Here",
        message: "Nothing to display at the moment.",
    },
};

export function EmptyState({
    type = "custom",
    title,
    message,
    icon,
    actionLabel,
    onAction,
    loading = false,
}: EmptyStateProps) {
    const defaults = defaultContent[type];
    const displayIcon = icon || defaults.icon;
    const displayTitle = title || defaults.title;
    const displayMessage = message || defaults.message;

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingIndicator}>
                    <Ionicons name="refresh" size={48} color="#b27106" />
                </View>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name={displayIcon} size={64} color="#8f7a61" />
            </View>

            <Text style={styles.title}>{displayTitle}</Text>

            <Text style={styles.message}>{displayMessage}</Text>

            {actionLabel && onAction && (
                <TouchableOpacity style={styles.actionButton} onPress={onAction}>
                    <Ionicons name="add-circle" size={20} color="#f7ecdc" />
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    iconContainer: {
        marginBottom: 16,
        opacity: 0.5,
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        color: "#f7ecdc",
        marginBottom: 8,
        textAlign: "center",
    },
    message: {
        fontSize: 14,
        color: "#8f7a61",
        textAlign: "center",
        lineHeight: 20,
        maxWidth: 300,
        marginBottom: 24,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#b27106",
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    actionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#f7ecdc",
        marginLeft: 8,
    },
    loadingIndicator: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 14,
        color: "#8f7a61",
    },
});
