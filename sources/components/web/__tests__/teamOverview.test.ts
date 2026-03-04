import { describe, it, expect } from 'vitest';
import {
  normalizeTaskStatus,
  summarizeTeamArtifact,
  buildBoardColumns,
  aggregateTeamStats,
} from '../teamOverview';

describe('teamOverview utilities', () => {
  it('normalizes task statuses', () => {
    expect(normalizeTaskStatus('TODO')).toBe('todo');
    expect(normalizeTaskStatus('in_progress')).toBe('in-progress');
    expect(normalizeTaskStatus('inprogress')).toBe('in-progress');
    expect(normalizeTaskStatus('review')).toBe('review');
    expect(normalizeTaskStatus('done')).toBe('done');
    expect(normalizeTaskStatus('unknown')).toBe('todo');
  });

  it('summarizes a valid team artifact body', () => {
    const artifact = {
      id: 'team-1',
      title: 'Core Team',
      type: 'team' as const,
      sessions: ['s1', 's2'],
      body: JSON.stringify({
        team: {
          name: 'Core Team',
          members: [{ sessionId: 's1' }, { sessionId: 's2' }],
          roles: [{ id: 'dev', quantity: 2 }, { id: 'qa', quantity: 1 }],
        },
        tasks: [
          { id: 't1', title: 'Task A', status: 'todo', updatedAt: 1 },
          { id: 't2', title: 'Task B', status: 'in_progress', updatedAt: 2 },
          { id: 't3', title: 'Task C', status: 'done', updatedAt: 3 },
        ],
      }),
      headerVersion: 1,
      bodyVersion: 1,
      seq: 1,
      createdAt: 1,
      updatedAt: 1000,
      isDecrypted: true,
    };

    const summary = summarizeTeamArtifact(artifact);

    expect(summary.title).toBe('Core Team');
    expect(summary.memberCount).toBe(2);
    expect(summary.roleSlots).toBe(3);
    expect(summary.taskCount).toBe(3);
    expect(summary.activeTaskCount).toBe(2);
    expect(summary.doneTaskCount).toBe(1);
    expect(summary.statusCounts.todo).toBe(1);
    expect(summary.statusCounts['in-progress']).toBe(1);
    expect(summary.statusCounts.done).toBe(1);
    expect(summary.parseError).toBe(false);

    const columns = buildBoardColumns(summary.tasks);
    expect(columns[0].id).toBe('todo');
    expect(columns[1].id).toBe('in-progress');
    expect(columns[3].id).toBe('done');
    expect(columns[3].tasks[0].id).toBe('t3');
  });

  it('falls back safely on invalid body and aggregates stats', () => {
    const broken = {
      id: 'team-2',
      title: null,
      type: 'team' as const,
      sessions: ['s1'],
      body: '{invalid-json',
      headerVersion: 1,
      bodyVersion: 1,
      seq: 1,
      createdAt: 1,
      updatedAt: 2000,
      isDecrypted: true,
    };

    const valid = {
      id: 'team-3',
      title: 'Ship Team',
      type: 'team' as const,
      sessions: [],
      body: JSON.stringify({
        team: { members: [{ sessionId: 'x' }] },
        tasks: [{ id: 't4', title: 'Task', status: 'review', updatedAt: 4 }],
      }),
      headerVersion: 1,
      bodyVersion: 1,
      seq: 1,
      createdAt: 1,
      updatedAt: 3000,
      isDecrypted: true,
    };

    const brokenSummary = summarizeTeamArtifact(broken);
    const validSummary = summarizeTeamArtifact(valid);

    expect(brokenSummary.parseError).toBe(true);
    expect(brokenSummary.memberCount).toBe(1);
    expect(brokenSummary.taskCount).toBe(0);

    const stats = aggregateTeamStats([brokenSummary, validSummary]);
    expect(stats.teamCount).toBe(2);
    expect(stats.memberCount).toBe(2);
    expect(stats.taskCount).toBe(1);
    expect(stats.activeTaskCount).toBe(1);
  });
});
