import type { AuthCredentials } from '@/auth/tokenStorage';
import { getKV, mutateKV } from './apiKv';

export const RUNTIME_MODEL_POLICY_KV_KEY = 'config.runtime-model-policy';

export interface RuntimeModelPolicy {
    version: number;
    allowGenomeModelSelection: boolean;
}

export const DEFAULT_RUNTIME_MODEL_POLICY: RuntimeModelPolicy = Object.freeze({
    version: 1,
    allowGenomeModelSelection: false,
});

export function parseRuntimeModelPolicy(value: string | null | undefined): RuntimeModelPolicy {
    if (!value) {
        return { ...DEFAULT_RUNTIME_MODEL_POLICY };
    }

    try {
        const parsed = JSON.parse(value) as Partial<RuntimeModelPolicy> | null;
        return {
            version: typeof parsed?.version === 'number' ? parsed.version : DEFAULT_RUNTIME_MODEL_POLICY.version,
            allowGenomeModelSelection: parsed?.allowGenomeModelSelection === true,
        };
    } catch {
        return { ...DEFAULT_RUNTIME_MODEL_POLICY };
    }
}

export function serializeRuntimeModelPolicy(policy: RuntimeModelPolicy): string {
    return JSON.stringify(policy);
}

export async function getRuntimeModelPolicy(
    credentials: AuthCredentials,
): Promise<{ policy: RuntimeModelPolicy; version: number }> {
    const current = await getKV(credentials, RUNTIME_MODEL_POLICY_KV_KEY);
    return {
        policy: parseRuntimeModelPolicy(current?.value),
        version: current?.version ?? -1,
    };
}

export async function setRuntimeModelPolicy(
    credentials: AuthCredentials,
    update: Partial<RuntimeModelPolicy>,
): Promise<RuntimeModelPolicy> {
    const current = await getRuntimeModelPolicy(credentials);
    const nextPolicy: RuntimeModelPolicy = {
        ...current.policy,
        ...update,
        version: current.policy.version,
        allowGenomeModelSelection: update.allowGenomeModelSelection ?? current.policy.allowGenomeModelSelection,
    };

    const result = await mutateKV(credentials, [{
        key: RUNTIME_MODEL_POLICY_KV_KEY,
        value: serializeRuntimeModelPolicy(nextPolicy),
        version: current.version,
    }]);

    if (!result.success) {
        throw new Error(`Failed to update runtime model policy: ${JSON.stringify(result.errors)}`);
    }

    return nextPolicy;
}
