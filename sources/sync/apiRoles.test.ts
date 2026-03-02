import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchCustomRoles,
    fetchCustomRole,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
    CustomRole,
} from '@/sync/apiRoles';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock getServerUrl
vi.mock('@/sync/serverConfig', () => ({
    getServerUrl: () => 'https://test.example.com',
}));

// Mock backoff
vi.mock('@/utils/time', () => ({
    backoff: async (fn: () => Promise<any>) => fn(),
}));

describe('Role CRUD Operations', () => {
    const mockCredentials = {
        token: 'test-token-123',
        secret: 'test-secret',
    };

    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchCustomRoles', () => {
        it('should fetch all custom roles', async () => {
            const mockRoles: CustomRole[] = [
                {
                    id: 'role-1',
                    title: 'Test Role 1',
                    summary: 'Test summary',
                    responsibilities: [],
                    abilityBoundaries: [],
                    handoffProtocol: [],
                    protocol: [],
                },
                {
                    id: 'role-2',
                    title: 'Test Role 2',
                    summary: 'Another test',
                    responsibilities: [],
                    abilityBoundaries: [],
                    handoffProtocol: [],
                    protocol: [],
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ roles: mockRoles, total: 2 }),
            });

            const result = await fetchCustomRoles(mockCredentials);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Test Role 1');
            expect(result[1].title).toBe('Test Role 2');
        });

        it('should include authorization header', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ roles: [], total: 0 }),
            });

            await fetchCustomRoles(mockCredentials);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token-123',
                    }),
                })
            );
        });
    });

    describe('fetchCustomRole', () => {
        it('should fetch a single role by ID', async () => {
            const mockRole: CustomRole = {
                id: 'role-123',
                title: 'Specific Role',
                summary: 'Detailed role',
                responsibilities: [],
                abilityBoundaries: [],
                handoffProtocol: [],
                protocol: [],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRole,
            });

            const result = await fetchCustomRole(mockCredentials, 'role-123');

            expect(result.id).toBe('role-123');
            expect(result.title).toBe('Specific Role');
        });

        it('should handle role not found', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                clone: () => ({
                    json: async () => ({ error: 'Role not found' }),
                }),
            });

            await expect(fetchCustomRole(mockCredentials, 'nonexistent')).rejects.toThrow();
        });
    });

    describe('createCustomRole', () => {
        it('should create a new role', async () => {
            const newRole: Partial<CustomRole> = {
                title: 'New Role',
                summary: 'Created role',
                responsibilities: ['Task 1', 'Task 2'],
            };

            const createdRole: CustomRole = {
                ...newRole,
                id: 'new-role-id',
                abilityBoundaries: [],
                handoffProtocol: [],
                protocol: [],
            } as CustomRole;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, role: createdRole }),
            });

            const result = await createCustomRole(mockCredentials, newRole);

            expect(result.id).toBe('new-role-id');
            expect(result.title).toBe('New Role');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(newRole),
                })
            );
        });

        it('should send POST request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, role: { id: '1' } }),
            });

            await createCustomRole(mockCredentials, { title: 'Test' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should handle creation errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                clone: () => ({
                    json: async () => ({ error: 'Invalid role data' }),
                }),
            });

            await expect(createCustomRole(mockCredentials, {})).rejects.toThrow();
        });
    });

    describe('updateCustomRole', () => {
        it('should update an existing role', async () => {
            const updates: Partial<CustomRole> = {
                title: 'Updated Title',
                summary: 'Updated summary',
            };

            const updatedRole: CustomRole = {
                id: 'role-123',
                title: 'Updated Title',
                summary: 'Updated summary',
                responsibilities: [],
                abilityBoundaries: [],
                handoffProtocol: [],
                protocol: [],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, role: updatedRole }),
            });

            const result = await updateCustomRole(mockCredentials, 'role-123', updates);

            expect(result.title).toBe('Updated Title');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/role-123'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updates),
                })
            );
        });

        it('should send PUT request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, role: { id: '1' } }),
            });

            await updateCustomRole(mockCredentials, '1', { title: 'New' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'PUT',
                })
            );
        });

        it('should handle update errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                clone: () => ({
                    json: async () => ({ error: 'Not authorized to update' }),
                }),
            });

            await expect(updateCustomRole(mockCredentials, '1', {})).rejects.toThrow();
        });
    });

    describe('deleteCustomRole', () => {
        it('should delete a role', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
            });

            await deleteCustomRole(mockCredentials, 'role-to-delete');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/role-to-delete'),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });

        it('should send DELETE request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
            });

            await deleteCustomRole(mockCredentials, '123');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });

        it('should handle deletion errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                clone: () => ({
                    json: async () => ({ error: 'Role not found' }),
                }),
            });

            await expect(deleteCustomRole(mockCredentials, 'nonexistent')).rejects.toThrow();
        });

        it('should not parse JSON response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
            });

            await deleteCustomRole(mockCredentials, '123');

            // Should not call json()
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('API endpoint fallback', () => {
        it('should fallback to V1 endpoint if V2 fails', async () => {
            // First call (V2) fails with 404
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                clone: () => ({
                    json: async () => ({ error: 'Not found' }),
                }),
            });

            // Second call (V1) succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ roles: [], total: 0 }),
            });

            const result = await fetchCustomRoles(mockCredentials);

            expect(result).toEqual([]);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
});
