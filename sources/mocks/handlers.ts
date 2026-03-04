import { http, HttpResponse } from 'msw';

// Mock data for Web UI W1-W5
const mockTeams = [
  {
    id: 'team-1',
    name: 'My Startup',
    avatar: 'https://i.pravatar.cc/150?u=team-1',
    memberCount: 5,
    status: 'active',
  },
  {
    id: 'team-2',
    name: 'Client Project Alpha',
    avatar: 'https://i.pravatar.cc/150?u=team-2',
    memberCount: 3,
    status: 'active',
  },
  {
    id: 'team-3',
    name: 'Personal Workspace',
    avatar: 'https://i.pravatar.cc/150?u=team-3',
    memberCount: 1,
    status: 'active',
  },
];

const mockAgents = [
  { id: 'agent-1', name: 'Code Reviewer', status: 'online', type: 'reviewer' },
  { id: 'agent-2', name: 'Test Writer', status: 'offline', type: 'tester' },
  { id: 'agent-3', name: 'Docs Helper', status: 'online', type: 'docs' },
];

const mockMessages = [
  {
    id: 'msg-1',
    senderId: 'user-1',
    senderName: 'Alex Chen',
    senderAvatar: 'https://i.pravatar.cc/150?u=user-1',
    content: 'Hey team, the new feature is ready for review!',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    type: 'text',
  },
  {
    id: 'msg-2',
    senderId: 'agent-1',
    senderName: 'Code Reviewer',
    senderAvatar: 'https://i.pravatar.cc/150?u=agent-1',
    content: 'I\'ve reviewed the PR. Overall looks good, but I found 3 minor issues...',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    type: 'agent',
  },
];

const mockMembers = [
  { id: 'user-1', name: 'Alex Chen', avatar: 'https://i.pravatar.cc/150?u=user-1', status: 'online', role: 'admin' },
  { id: 'user-2', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=user-2', status: 'away', role: 'member' },
  { id: 'user-3', name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/150?u=user-3', status: 'offline', role: 'member' },
];

const mockPermissions = [
  {
    id: 'perm-1',
    type: 'agent_request',
    title: 'Agent "Test Writer" wants to modify test files',
    description: 'The agent needs write access to tests/ directory',
    riskLevel: 'low',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'perm-2',
    type: 'file_access',
    title: 'Agent "Code Reviewer" wants to view .env files',
    description: 'The agent needs access to environment configuration',
    riskLevel: 'critical',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
  },
];

const mockDevices = [
  { id: 'dev-1', name: 'MacBook Pro', type: 'laptop', status: 'online', lastSeen: new Date().toISOString() },
  { id: 'dev-2', name: 'iPhone 15', type: 'mobile', status: 'online', lastSeen: new Date().toISOString() },
  { id: 'dev-3', name: 'iPad Air', type: 'tablet', status: 'offline', lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

const mockKanbanColumns = [
  { id: 'col-1', title: 'To Do', tasks: [{ id: 'task-1', title: 'Implement auth flow', status: 'todo' }] },
  { id: 'col-2', title: 'In Progress', tasks: [{ id: 'task-2', title: 'Design system setup', status: 'in-progress' }] },
  { id: 'col-3', title: 'Review', tasks: [{ id: 'task-3', title: 'API documentation', status: 'review' }] },
  { id: 'col-4', title: 'Done', tasks: [{ id: 'task-4', title: 'Project setup', status: 'done' }] },
];

const mockSettings = {
  account: {
    displayName: 'Alex Chen',
    email: 'alex@example.com',
    avatar: 'https://i.pravatar.cc/150?u=user-1',
  },
  notifications: {
    emailEnabled: true,
    pushEnabled: true,
    agentAlerts: true,
  },
  security: {
    twoFactorEnabled: false,
    deviceAuthEnabled: true,
  },
};

// R7 Team Stats Mock Data
const mockTeamStats = {
  'team-1': {
    teamId: 'team-1',
    period: '7d',
    memberCount: 5,
    activeMemberCount: 3,
    messageCount: 128,
    taskStats: {
      total: 24,
      todo: 8,
      inProgress: 6,
      review: 4,
      done: 6,
      blocked: 0,
    },
    tokenUsage: {
      total: 1543200,
      byModel: {
        opus: 450000,
        sonnet: 893000,
        haiku: 200200,
      },
    },
    codeMetrics: {
      totalCommits: 47,
      totalLinesChanged: 3420,
      totalFilesChanged: 128,
    },
    costMetrics: {
      totalCost: 12.45,
      estimatedBudget: 50.00,
      budgetUtilization: 24.9,
    },
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  'team-2': {
    teamId: 'team-2',
    period: '7d',
    memberCount: 3,
    activeMemberCount: 2,
    messageCount: 64,
    taskStats: {
      total: 12,
      todo: 4,
      inProgress: 3,
      review: 2,
      done: 3,
      blocked: 0,
    },
    tokenUsage: {
      total: 680000,
      byModel: {
        opus: 120000,
        sonnet: 420000,
        haiku: 140000,
      },
    },
    codeMetrics: {
      totalCommits: 23,
      totalLinesChanged: 1850,
      totalFilesChanged: 64,
    },
    costMetrics: {
      totalCost: 5.80,
      estimatedBudget: 30.00,
      budgetUtilization: 19.3,
    },
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  'team-3': {
    teamId: 'team-3',
    period: '7d',
    memberCount: 1,
    activeMemberCount: 1,
    messageCount: 32,
    taskStats: {
      total: 8,
      todo: 3,
      inProgress: 2,
      review: 1,
      done: 2,
      blocked: 0,
    },
    tokenUsage: {
      total: 240000,
      byModel: {
        opus: 45000,
        sonnet: 145000,
        haiku: 50000,
      },
    },
    codeMetrics: {
      totalCommits: 12,
      totalLinesChanged: 680,
      totalFilesChanged: 32,
    },
    costMetrics: {
      totalCost: 2.10,
      estimatedBudget: 20.00,
      budgetUtilization: 10.5,
    },
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
};

const mockUsageTimeline = {
  'team-1': {
    teamId: 'team-1',
    period: '7d',
    groupBy: 'day',
    data: [
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 6, tokens: 180000, cost: 1.45, sessions: 8 },
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5, tokens: 220000, cost: 1.78, sessions: 12 },
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4, tokens: 195000, cost: 1.58, sessions: 10 },
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, tokens: 280000, cost: 2.26, sessions: 15 },
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, tokens: 310000, cost: 2.50, sessions: 18 },
      { timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1, tokens: 240000, cost: 1.94, sessions: 11 },
      { timestamp: Date.now(), tokens: 320200, cost: 2.94, sessions: 20 },
    ],
    summary: {
      totalTokens: 1543200,
      totalCost: 12.45,
      avgTokensPerDay: 220457,
      avgCostPerDay: 1.78,
    },
  },
};

export const handlers = [
  // Teams API
  http.get('/api/teams', () => {
    return HttpResponse.json({ success: true, data: mockTeams });
  }),

  http.get('/api/teams/:id', ({ params }) => {
    const team = mockTeams.find(t => t.id === params.id);
    return HttpResponse.json({ success: true, data: team || null });
  }),

  // Agents API
  http.get('/api/agents', () => {
    return HttpResponse.json({ success: true, data: mockAgents });
  }),

  // Messages API (W1 - Team Chat)
  http.get('/api/teams/:teamId/messages', ({ params }) => {
    return HttpResponse.json({ success: true, data: mockMessages });
  }),

  http.post('/api/teams/:teamId/messages', async ({ request }) => {
    const body = await request.json() as { content: string; senderId: string };
    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId: body.senderId,
      senderName: 'You',
      senderAvatar: 'https://i.pravatar.cc/150?u=me',
      content: body.content,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    return HttpResponse.json({ success: true, data: newMessage });
  }),

  // Members API
  http.get('/api/teams/:teamId/members', () => {
    return HttpResponse.json({ success: true, data: mockMembers });
  }),

  // Permissions API (W4 - Permission Drawer)
  http.get('/api/permissions', () => {
    return HttpResponse.json({ success: true, data: mockPermissions });
  }),

  http.get('/api/permissions/:id', ({ params }) => {
    const perm = mockPermissions.find(p => p.id === params.id);
    return HttpResponse.json({ success: true, data: perm || null });
  }),

  http.post('/api/permissions/:id/approve', ({ params }) => {
    const perm = mockPermissions.find(p => p.id === params.id);
    if (perm) {
      perm.status = 'approved';
    }
    return HttpResponse.json({ success: true, data: perm });
  }),

  http.post('/api/permissions/:id/deny', ({ params }) => {
    const perm = mockPermissions.find(p => p.id === params.id);
    if (perm) {
      perm.status = 'denied';
    }
    return HttpResponse.json({ success: true, data: perm });
  }),

  // Devices API (W2 - Devices)
  http.get('/api/devices', () => {
    return HttpResponse.json({ success: true, data: mockDevices });
  }),

  // Kanban API (W2 - Board)
  http.get('/api/teams/:teamId/board', () => {
    return HttpResponse.json({ success: true, data: mockKanbanColumns });
  }),

  // Settings API (W5 - Settings)
  http.get('/api/settings', () => {
    return HttpResponse.json({ success: true, data: mockSettings });
  }),

  http.patch('/api/settings', async ({ request }) => {
    const body = await request.json();
    Object.assign(mockSettings, body);
    return HttpResponse.json({ success: true, data: mockSettings });
  }),

  // Auth challenge for device pairing
  http.post('/api/auth/challenge', () => {
    return HttpResponse.json({
      success: true,
      data: {
        challengeId: `challenge-${Date.now()}`,
        code: '123456',
        expiresAt: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      },
    });
  }),

  // R7 Team Stats API
  http.get('/api/teams/:id/stats', ({ params }) => {
    const teamId = params.id as string;
    const stats = mockTeamStats[teamId as keyof typeof mockTeamStats];
    if (!stats) {
      return HttpResponse.json(
        { success: false, error: 'Team stats not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: stats });
  }),

  // Batch stats for all teams
  http.get('/api/teams/stats/batch', () => {
    return HttpResponse.json({ success: true, data: mockTeamStats });
  }),

  // Usage timeline for cost tracking
  http.get('/api/teams/:id/usage/timeline', ({ params }) => {
    const teamId = params.id as string;
    const timeline = mockUsageTimeline[teamId as keyof typeof mockUsageTimeline];
    if (!timeline) {
      return HttpResponse.json(
        { success: false, error: 'Usage timeline not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: timeline });
  }),
];
