import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';

/**
 * Custom Role type matching roleRoutes.ts schema
 */
export interface CustomRole {
    id: string;
    title: string;
    summary?: string;
    icon?: string;
    modelConfig?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    };
    toolPermissions?: {
        allowRead?: boolean;
        allowWrite?: boolean;
        allowEdit?: boolean;
        allowBash?: boolean;
        allowedTools?: string[];
        disallowedTools?: string[];
    };
    assignedSkills?: string[];
    policy?: {
        permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
        accessLevel?: 'read-only' | 'full-access';
        coordinationMode?: 'strong' | 'weak';
    };
    responsibilities?: string[];
    abilityBoundaries?: string[];
    handoffProtocol?: string[];
    protocol?: string[];
    isTemplate?: boolean;
    templateSource?: string;
}

/**
 * Fetch custom roles for the current user
 */
export async function fetchCustomRoles(credentials: AuthCredentials): Promise<CustomRole[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch roles: ${response.status}`);
        }

        const data = await response.json() as { roles: CustomRole[]; total: number };
        return data.roles;
    });
}

/**
 * Fetch a single custom role by ID
 */
export async function fetchCustomRole(credentials: AuthCredentials, roleId: string): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}`, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Role not found');
            }
            throw new Error(`Failed to fetch role: ${response.status}`);
        }

        const data = await response.json() as CustomRole;
        return data;
    });
}

/**
 * Create a custom role
 */
export async function createCustomRole(
    credentials: AuthCredentials,
    role: Partial<CustomRole>
): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(role)
        });

        if (!response.ok) {
            throw new Error(`Failed to create role: ${response.status}`);
        }

        const data = await response.json() as { success: boolean; role: CustomRole };
        return data.role;
    });
}

/**
 * Update a custom role
 */
export async function updateCustomRole(
    credentials: AuthCredentials,
    roleId: string,
    updates: Partial<CustomRole>
): Promise<CustomRole> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error(`Failed to update role: ${response.status}`);
        }

        const data = await response.json() as { success: boolean; role: CustomRole };
        return data.role;
    });
}

/**
 * Delete a custom role
 */
export async function deleteCustomRole(
    credentials: AuthCredentials,
    roleId: string
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete role: ${response.status}`);
        }
    });
}
