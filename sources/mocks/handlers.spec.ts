import { describe, it, expect } from 'vitest';
import { handlers } from './handlers';

describe('MSW Handlers', () => {
  it('should export an array of handlers', () => {
    expect(handlers).toBeDefined();
    expect(Array.isArray(handlers)).toBe(true);
    expect(handlers.length).toBeGreaterThan(0);
  });

  it('should include teams handler', () => {
    const teamsHandler = handlers.find(h => {
      const info = h.info as { path: string };
      return info?.path === '/api/teams';
    });
    expect(teamsHandler).toBeDefined();
  });

  it('should include agents handler', () => {
    const agentsHandler = handlers.find(h => {
      const info = h.info as { path: string };
      return info?.path === '/api/agents';
    });
    expect(agentsHandler).toBeDefined();
  });

  it('should include permissions handler', () => {
    const permissionsHandler = handlers.find(h => {
      const info = h.info as { path: string };
      return info?.path === '/api/permissions';
    });
    expect(permissionsHandler).toBeDefined();
  });

  it('should include settings handler', () => {
    const settingsHandler = handlers.find(h => {
      const info = h.info as { path: string };
      return info?.path === '/api/settings';
    });
    expect(settingsHandler).toBeDefined();
  });
});
