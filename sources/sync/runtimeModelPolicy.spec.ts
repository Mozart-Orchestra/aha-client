import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiKv', () => ({
    getKV: vi.fn(),
    mutateKV: vi.fn(),
}));

import {
    DEFAULT_RUNTIME_MODEL_POLICY,
    getRuntimeModelPolicy,
    parseRuntimeModelPolicy,
    setRuntimeModelPolicy,
    serializeRuntimeModelPolicy,
} from './runtimeModelPolicy';
import { getKV, mutateKV } from './apiKv';

const mockedGetKV = vi.mocked(getKV);
const mockedMutateKV = vi.mocked(mutateKV);

const credentials = { token: 'token' } as any;

describe('runtimeModelPolicy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('defaults to keeping genome model selection disabled', () => {
        expect(parseRuntimeModelPolicy(null)).toEqual(DEFAULT_RUNTIME_MODEL_POLICY);
    });

    it('parses an explicit opt-in correctly', () => {
        expect(parseRuntimeModelPolicy(JSON.stringify({
            version: 3,
            allowGenomeModelSelection: true,
        }))).toEqual({
            version: 3,
            allowGenomeModelSelection: true,
        });
    });

    it('serializes policy JSON for KV storage', () => {
        expect(serializeRuntimeModelPolicy({
            version: 1,
            allowGenomeModelSelection: true,
        })).toBe(JSON.stringify({
            version: 1,
            allowGenomeModelSelection: true,
        }));
    });

    it('loads missing KV config as the default disabled policy', async () => {
        mockedGetKV.mockResolvedValueOnce(null);

        await expect(getRuntimeModelPolicy(credentials)).resolves.toEqual({
            policy: DEFAULT_RUNTIME_MODEL_POLICY,
            version: -1,
        });
    });

    it('preserves the current flag when partial updates omit it', async () => {
        mockedGetKV.mockResolvedValueOnce({
            key: 'config.runtime-model-policy',
            value: JSON.stringify({
                version: 1,
                allowGenomeModelSelection: true,
            }),
            version: 4,
        });
        mockedMutateKV.mockResolvedValueOnce({
            success: true,
            results: [{ key: 'config.runtime-model-policy', version: 5 }],
        });

        await expect(setRuntimeModelPolicy(credentials, {})).resolves.toEqual({
            version: 1,
            allowGenomeModelSelection: true,
        });
        expect(mockedMutateKV).toHaveBeenCalledWith(credentials, [{
            key: 'config.runtime-model-policy',
            value: JSON.stringify({
                version: 1,
                allowGenomeModelSelection: true,
            }),
            version: 4,
        }]);
    });
});
