/**
 * Tests for R7 Team Stats hooks
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/auth/tokenStorage', () => ({
  TokenStorage: {
    getCredentials: vi.fn(),
  },
}));

vi.mock('@/sync/serverConfig', () => ({
  getServerUrl: vi.fn(() => 'http://localhost:3005'),
}));

import { formatTokens, formatCost, calculatePercentage, normalizeModelDistribution } from '../useTeamStats';

describe('useTeamStats utilities', () => {
  describe('formatTokens', () => {
    it('should format tokens less than 1000', () => {
      expect(formatTokens(999)).toBe('999');
      expect(formatTokens(500)).toBe('500');
    });

    it('should format tokens in thousands', () => {
      expect(formatTokens(1000)).toBe('1.0K');
      expect(formatTokens(1543200)).toBe('1.54M');
    });

    it('should format tokens in millions', () => {
      expect(formatTokens(1000000)).toBe('1.00M');
      expect(formatTokens(2500000)).toBe('2.50M');
    });
  });

  describe('formatCost', () => {
    it('should format cost with dollar sign', () => {
      expect(formatCost(12.45)).toBe('$12.45');
      expect(formatCost(0)).toBe('$0.00');
      expect(formatCost(5.8)).toBe('$5.80');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('should return 0 for total of 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculatePercentage(33, 100)).toBe(33);
      expect(calculatePercentage(66, 100)).toBe(66);
    });
  });

  describe('normalizeModelDistribution', () => {
    it('sorts server models and backfills percentages from token counts', () => {
      expect(
        normalizeModelDistribution([
          { model: 'claude-opus', tokenCount: 100, percentage: 0 },
          { model: 'openai/gpt-4.1-mini', tokenCount: 300, percentage: 0 },
        ])
      ).toEqual([
        { model: 'openai/gpt-4.1-mini', label: 'Gpt 4.1 Mini', tokenCount: 300, percentage: 75 },
        { model: 'claude-opus', label: 'Claude Opus', tokenCount: 100, percentage: 25 },
      ]);
    });
  });
});
