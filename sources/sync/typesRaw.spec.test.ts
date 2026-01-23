/**
 * Test cases for normalizeRawMessage validation issues
 *
 * Purpose: Reproduce and validate the console.error scenario at typesRaw.ts:247
 */

import { describe, it, expect, vi } from 'vitest';
import { normalizeRawMessage } from './typesRaw';

describe('normalizeRawMessage - validation error scenarios', () => {

    it('should handle invalid meta field gracefully', () => {
        // Test case 1: Invalid permissionMode in meta
        const invalidMetaMessage = {
            role: 'user',
            content: {
                type: 'text',
                text: 'Hello'
            },
            meta: {
                permissionMode: 'invalid-mode', // ❌ Not in enum
                displayText: 'Test'
            }
        };

        const result = normalizeRawMessage('msg-1', null, Date.now(), invalidMetaMessage as any);
        expect(result).toBeNull();
    });

    it('should handle missing required content fields', () => {
        // Test case 2: Missing 'text' field in user message
        const missingTextFieldMessage = {
            role: 'user',
            content: {
                type: 'text'
                // ❌ Missing 'text' field
            }
        };

        const result = normalizeRawMessage('msg-2', null, Date.now(), missingTextFieldMessage as any);
        expect(result).toBeNull();
    });

    it('should handle invalid agent content structure', () => {
        // Test case 3: Invalid nested content in agent message
        const invalidAgentMessage = {
            role: 'agent',
            content: {
                type: 'output',
                data: {
                    type: 'assistant',
                    message: {
                        role: 'assistant',
                        model: 'claude-3',
                        content: [
                            {
                                type: 'tool_use',
                                id: 'tool-123',
                                name: 'test_tool',
                                input: 'invalid-input-type' // ❌ Should be object, not string
                            }
                        ]
                    }
                }
            }
        };

        const result = normalizeRawMessage('msg-3', null, Date.now(), invalidAgentMessage as any);
        expect(result).toBeNull();
    });

    it('should handle valid user message successfully', () => {
        // Positive test case: Valid user message
        const validUserMessage = {
            role: 'user',
            content: {
                type: 'text',
                text: 'Hello, World!'
            },
            meta: {
                permissionMode: 'default',
                displayText: 'Test Message'
            }
        };

        const result = normalizeRawMessage('msg-4', 'local-1', Date.now(), validUserMessage as any);
        expect(result).not.toBeNull();
        expect(result?.role).toBe('user');
        expect(result?.content).toEqual({
            type: 'text',
            text: 'Hello, World!'
        });
    });

    it('should log detailed error information', () => {
        // Test case 5: Verify enhanced error logging
        const invalidMessage = {
            role: 'assistant',
            content: {
                type: 'assistant',
                message: {
                    role: 'assistant',
                    model: 'claude-3',
                    content: 'invalid-content' // ❌ Should be array, not string
                }
            }
        };

        // This test verifies the function doesn't crash and returns null
        const consoleErrorSpy = vi.spyOn(console, 'error');
        const result = normalizeRawMessage('msg-5', null, Date.now(), invalidMessage as any);

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Verify error contains new diagnostic fields
        const errorCalls = consoleErrorSpy.mock.calls;
        const hasEnhancedLogging = errorCalls.some(call =>
            JSON.stringify(call).includes('[normalizeRawMessage]') &&
            JSON.stringify(call).includes('Validation failed')
        );
        expect(hasEnhancedLogging).toBe(true);

        consoleErrorSpy.mockRestore();
    });

});
