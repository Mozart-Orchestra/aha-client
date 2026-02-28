import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { RoleForm } from '@/components/roles/RoleForm';
import { RoleRecommendationPanel } from '@/components/roles/RoleRecommendationPanel';
import { useAuth } from '@/auth/AuthContext';
import { createCustomRole } from '@/sync/apiRoles';
import { Modal } from '@/modal';
import { RoleRecommendation } from '@/sync/apiV5';

export default function NewRoleScreen() {
    const router = useRouter();
    const { credentials } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const [recommendedRole, setRecommendedRole] = React.useState<any>(null);

    const handleApplyRecommendation = (recommendation: RoleRecommendation) => {
        // Pre-fill form with recommended role data
        setRecommendedRole({
            title: recommendation.role.name,
            category: recommendation.role.category,
            assignedSkills: recommendation.role.assignedSkills,
            summary: recommendation.role.description,
        });
        Modal.alert('Applied', `Applied recommendation: ${recommendation.role.name}`);
    };

    const handleSubmit = async (formData: any) => {
        if (!credentials) {
            Modal.alert('Error', 'Not authenticated');
            return;
        }

        setIsLoading(true);
        try {
            await createCustomRole(credentials, formData);
            Modal.alert('Success', 'Role created successfully', [
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        } catch (error) {
            console.error('Failed to create role:', error);
            const message = error instanceof Error ? error.message : 'Failed to create role. Please try again.';
            Modal.alert('Error', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Create Role',
                    headerBackTitle: 'Back',
                }}
            />

            {/* V5-AI-001: Role Recommendation Panel */}
            {credentials && (
                <View style={styles.section}>
                    <RoleRecommendationPanel
                        credentials={credentials}
                        onApplyRecommendation={handleApplyRecommendation}
                    />
                </View>
            )}

            {/* Role Form */}
            <View style={styles.section}>
                <RoleForm
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isLoading={isLoading}
                    submitLabel="Create Role"
                    initialData={recommendedRole}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    section: {
        marginBottom: 24,
    },
}));
