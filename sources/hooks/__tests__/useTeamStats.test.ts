/**
 * Tests for R7 Team Stats hooks
 */

import { describe, it, expect } from 'vitest';
import { formatTokens, formatCost, calculatePercentage } from '../useTeamStats';

describe('useTeamStats utilities', () => {
  describe('formatTokens', () => {
    it('should format tokens less than 1000', () => {
      expect(formatTokens(999)).toBe('999');
      expect(formatTokens(500)).toBe('500');
    });

    it('should format tokens in thousands', () => {
      expect(formatTokens(1000)).toBe('1.0K');
      expect(formatTokens(1543200)).toBe('1.5M');
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
});
