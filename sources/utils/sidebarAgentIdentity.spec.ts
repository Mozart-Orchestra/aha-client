import { describe, expect, it } from 'vitest';

import {
    isRuntimeFlavor,
    resolveSidebarAgentIdentity,
} from './sidebarAgentIdentity';

describe('sidebarAgentIdentity', () => {
    it('treats claude and codex as runtime flavors instead of role ids', () => {
        expect(isRuntimeFlavor('claude')).toBe(true);
        expect(isRuntimeFlavor('codex')).toBe(true);
        expect(isRuntimeFlavor('master')).toBe(false);
    });

    it('prefers explicit role metadata over runtime flavor', () => {
        expect(resolveSidebarAgentIdentity({
            sessionRole: 'master',
            sessionFlavor: 'claude',
        })).toEqual({
            roleKey: 'master',
            displayRole: 'master',
            runtimeLabel: 'claude',
        });
    });

    it('does not emit a role key when only runtime flavor is present', () => {
        expect(resolveSidebarAgentIdentity({
            sessionFlavor: 'claude',
        })).toEqual({
            roleKey: '',
            displayRole: 'claude',
            runtimeLabel: 'claude',
        });
    });
});
