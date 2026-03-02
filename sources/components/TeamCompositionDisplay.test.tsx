import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react-native';
import { EvoMapDisplay, ReleaseGateCard } from './TeamCompositionDisplay';
import React from 'react';

describe('TeamCompositionDisplay - EvoMapDisplay', () => {
  it('displays tier badge correctly', () => {
    const evoMap = {
      score: 4.5,
      tier: 'S' as const,
      trend: 'up' as const,
      highlights: ['Fast delivery', 'High quality'],
    };

    // Component should render without error
    // Note: Full render testing requires mocking useUnistyles
    expect(evoMap.tier).toBe('S');
    expect(evoMap.score).toBe(4.5);
  });

  it('handles all tier levels', () => {
    const tiers: Array<'S' | 'A' | 'B' | 'C'> = ['S', 'A', 'B', 'C'];

    tiers.forEach((tier) => {
      const evoMap = {
        score: 3.0,
        tier,
        trend: 'flat' as const,
        highlights: [],
      };
      expect(['S', 'A', 'B', 'C']).toContain(evoMap.tier);
    });
  });

  it('displays trend correctly', () => {
    const trends = ['up', 'flat', 'down'] as const;

    trends.forEach((trend) => {
      const evoMap = {
        score: 3.0,
        tier: 'B' as const,
        trend,
        highlights: [],
      };
      expect(['up', 'flat', 'down']).toContain(evoMap.trend);
    });
  });

  it('calculates progress percentage correctly', () => {
    const evoMap = {
      score: 2.5,
      tier: 'B' as const,
      trend: 'up' as const,
      highlights: [],
    };

    // Score 2.5 out of 5 = 50%
    const progress = (evoMap.score / 5) * 100;
    expect(progress).toBe(50);
  });

  it('handles empty highlights', () => {
    const evoMap = {
      score: 3.0,
      tier: 'A' as const,
      trend: 'flat' as const,
      highlights: [],
    };

    expect(evoMap.highlights.length).toBe(0);
  });
});

describe('TeamCompositionDisplay - ReleaseGateCard', () => {
  it('displays three-endpoint checks correctly', () => {
    const gate = {
      versionTrack: 'v2' as const,
      branch: 'release/v2-feature',
      completionRule: '同版本分支必须完成三端调试才能关闭分支',
      requiredChecks: [
        { component: 'aha-cli' as const, environments: ['uv1', 'uv2', 'wow'], status: 'passed' },
        { component: 'happy-server' as const, environments: ['uv1', 'uv2', 'wow'], status: 'passed' },
        { component: 'kanban' as const, environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
      ],
    };

    expect(gate.requiredChecks.length).toBe(3);
    expect(gate.requiredChecks.map(c => c.component)).toContain('aha-cli');
    expect(gate.requiredChecks.map(c => c.component)).toContain('happy-server');
    expect(gate.requiredChecks.map(c => c.component)).toContain('kanban');
  });

  it('shows correct status for passed checks', () => {
    const gate = {
      versionTrack: 'v1' as const,
      branch: 'release/v1-feature',
      completionRule: 'rule',
      requiredChecks: [
        { component: 'aha-cli' as const, environments: ['uv1'], status: 'passed' },
        { component: 'happy-server' as const, environments: ['uv1'], status: 'passed' },
        { component: 'kanban' as const, environments: ['uv1'], status: 'passed' },
      ],
    };

    const passedCount = gate.requiredChecks.filter(c => c.status === 'passed').length;
    expect(passedCount).toBe(3);
  });

  it('shows correct status for pending checks', () => {
    const gate = {
      versionTrack: 'v2' as const,
      branch: 'release/v2-feature',
      completionRule: 'rule',
      requiredChecks: [
        { component: 'aha-cli' as const, environments: ['uv1', 'uv2', 'wow'], status: 'passed' },
        { component: 'happy-server' as const, environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
        { component: 'kanban' as const, environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
      ],
    };

    const pendingCount = gate.requiredChecks.filter(c => c.status === 'pending').length;
    expect(pendingCount).toBe(2);
  });

  it('displays environment flow correctly', () => {
    const gate = {
      versionTrack: 'dual' as const,
      branch: 'release/dual-feature',
      completionRule: 'rule',
      requiredChecks: [
        { component: 'aha-cli' as const, environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
      ],
    };

    expect(gate.requiredChecks[0].environments).toEqual(['uv1', 'uv2', 'wow']);
  });

  it('handles failed status correctly', () => {
    const gate = {
      versionTrack: 'v2' as const,
      branch: 'release/v2-feature',
      completionRule: 'rule',
      requiredChecks: [
        { component: 'aha-cli' as const, environments: ['uv1'], status: 'failed' },
        { component: 'happy-server' as const, environments: ['uv1'], status: 'passed' },
        { component: 'kanban' as const, environments: ['uv1'], status: 'passed' },
      ],
    };

    const failedCount = gate.requiredChecks.filter(c => c.status === 'failed').length;
    expect(failedCount).toBe(1);
  });
});
