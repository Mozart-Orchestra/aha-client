import * as React from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { RoleForm } from '@/components/roles/RoleForm';
import { useAuth } from '@/auth/AuthContext';
import { createCustomRole } from '@/sync/apiRoles';
import { Modal } from '@/modal';

export default function NewRoleScreen() {
    const router = useRouter();
    const { credentials } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);

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
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Create Role',
                    headerBackTitle: 'Back',
                }}
            />
            <RoleForm
                onSubmit={handleSubmit}
                onCancel={() => router.back()}
                isLoading={isLoading}
                submitLabel="Create Role"
            />
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
}));
