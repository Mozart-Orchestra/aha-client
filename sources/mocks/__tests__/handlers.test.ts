import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW Handlers', () => {
  describe('Teams API', () => {
    it('should return list of teams', async () => {
      const response = await fetch('/api/teams');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('name');
    });

    it('should return a single team', async () => {
      const response = await fetch('/api/teams/team-1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id', 'team-1');
    });

    it('should create a new team', async () => {
      const newTeam = { name: 'New Team', description: 'Test team' };
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(newTeam.name);
    });
  });

  describe('Agents API', () => {
    it('should return list of agents', async () => {
      const response = await fetch('/api/agents');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should spawn a new agent', async () => {
      const response = await fetch('/api/agents/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Agent', role: 'tester', teamId: 'team-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.status).toBe('active');
    });

    it('should stop an agent', async () => {
      const response = await fetch('/api/agents/agent-1/stop', {
        method: 'POST',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('stopped');
    });

    it('should pause an agent', async () => {
      const response = await fetch('/api/agents/agent-1/pause', {
        method: 'POST',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('paused');
    });
  });

  describe('Permissions API', () => {
    it('should return list of permissions', async () => {
      const response = await fetch('/api/permissions');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should approve a permission', async () => {
      const response = await fetch('/api/permissions/perm-1/approve', {
        method: 'POST',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('approved');
    });

    it('should deny a permission', async () => {
      const response = await fetch('/api/permissions/perm-1/deny', {
        method: 'POST',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('denied');
    });
  });

  describe('Team Stats API (R7)', () => {
    it('should return team stats', async () => {
      const response = await fetch('/api/teams/team-1/stats');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('teamId');
      expect(data.data).toHaveProperty('tokenUsage');
      expect(data.data).toHaveProperty('costMetrics');
      expect(data.data).toHaveProperty('taskStats');
    });

    it('should return 404 for non-existent team stats', async () => {
      const response = await fetch('/api/teams/invalid-id/stats');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return usage timeline', async () => {
      const response = await fetch('/api/teams/team-1/usage/timeline');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('data');
      expect(data.data).toHaveProperty('summary');
    });
  });

  describe('Session Params API (R3)', () => {
    it('should return session params', async () => {
      const response = await fetch('/api/session');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('displayName');
      expect(data.data).toHaveProperty('mode');
      expect(data.data).toHaveProperty('machineId');
    });

    it('should update session params', async () => {
      const update = { displayName: 'Updated Name' };
      const response = await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.displayName).toBe(update.displayName);
    });
  });

  describe('Settings API', () => {
    it('should return settings', async () => {
      const response = await fetch('/api/settings');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('account');
      expect(data.data).toHaveProperty('notifications');
      expect(data.data).toHaveProperty('security');
    });

    it('should update settings', async () => {
      const update = { theme: 'dark' };
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
