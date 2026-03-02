import React from 'react';
import { View, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { CustomRole, PublicRole, RoleTemplate } from '@/sync/apiRoles';

export type RoleItem = (CustomRole | PublicRole | RoleTemplate) & {
    isCustom?: boolean;
    isPool?: boolean;
    isServerDefault?: boolean;
};

export interface RoleSelectorProps {
    roles: RoleItem[];
    selectedRoleId?: string;
    onSelectRole: (roleId: string) => void;
    isLoading?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    showSearch?: boolean;
    testID?: string;
}

export function RoleSelector({
    roles,
    selectedRoleId,
    onSelectRole,
    isLoading = false,
    searchPlaceholder = 'Search roles...',
    emptyText = 'No roles available',
    showSearch = true,
    testID,
}: RoleSelectorProps) {
    const { theme } = useUnistyles();
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredRoles = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return roles;
        }
        const query = searchQuery.toLowerCase();
        return roles.filter((role) => {
            const searchText = [
                role.id,
                role.title,
                role.summary,
                'category' in role ? role.category : '',
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return searchText.includes(query);
        });
    }, [roles, searchQuery]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer} testID={testID ? `${testID}-loading` : undefined}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    return (
        <View style={styles.container} testID={testID}>
            {showSearch && (
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={theme.colors.textSecondary}
                        testID={testID ? `${testID}-search-input` : undefined}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
            )}

            {filteredRoles.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="shield-outline" size={32} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>{emptyText}</Text>
                </View>
            ) : (
                <View style={styles.roleGrid}>
                    {filteredRoles.map((role) => {
                        const isSelected = selectedRoleId === role.id;
                        return (
                            <Pressable
                                key={role.id}
                                style={[
                                    styles.roleChip,
                                    isSelected && styles.roleChipSelected,
                                ]}
                                onPress={() => onSelectRole(role.id)}
                                testID={testID ? `${testID}-role-${role.id}` : undefined}
                            >
                                <Text
                                    style={[
                                        styles.roleChipText,
                                        isSelected && styles.roleChipTextSelected,
                                    ]}
                                >
                                    {role.title}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        marginTop: 12,
    },
    loadingContainer: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        color: theme.colors.text,
        fontSize: 14,
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.groupped.background,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    roleChipSelected: {
        backgroundColor: theme.colors.button.primary.background,
        borderColor: theme.colors.button.primary.background,
    },
    roleChipText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    roleChipTextSelected: {
        color: '#FFF',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
}));
