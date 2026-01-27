/**
 * Tests for datetime-utils.ts
 */

import { describe, it, expect } from 'bun:test';
import { getAEDTTimestamp, getDateParts, getISOTimestamp } from './datetime-utils';

describe('DateTime Utils', () => {
  describe('getAEDTTimestamp', () => {
    it('should return a string in AEDT format', () => {
      const timestamp = getAEDTTimestamp();

      // Format: YYYY-MM-DD HH:MM:SS AEDT
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} AEDT$/);
    });

    it('should contain valid date components', () => {
      const timestamp = getAEDTTimestamp();
      const [datePart] = timestamp.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);

      expect(year).toBeGreaterThanOrEqual(2024);
      expect(year).toBeLessThanOrEqual(2100);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });

    it('should contain valid time components', () => {
      const timestamp = getAEDTTimestamp();
      const [, timePart] = timestamp.split(' ');
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThanOrEqual(23);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(59);
      expect(seconds).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeLessThanOrEqual(59);
    });
  });

  describe('getDateParts', () => {
    it('should return an object with year, month, day, and yearMonth', () => {
      const parts = getDateParts();

      expect(parts).toHaveProperty('year');
      expect(parts).toHaveProperty('month');
      expect(parts).toHaveProperty('day');
      expect(parts).toHaveProperty('yearMonth');
    });

    it('should return zero-padded strings', () => {
      const parts = getDateParts();

      // Year should be 4 digits
      expect(parts.year).toMatch(/^\d{4}$/);

      // Month should be 2 digits
      expect(parts.month).toMatch(/^\d{2}$/);

      // Day should be 2 digits
      expect(parts.day).toMatch(/^\d{2}$/);
    });

    it('should return correct yearMonth format', () => {
      const parts = getDateParts();

      expect(parts.yearMonth).toBe(`${parts.year}-${parts.month}`);
    });

    it('should return valid date values', () => {
      const parts = getDateParts();
      const year = parseInt(parts.year);
      const month = parseInt(parts.month);
      const day = parseInt(parts.day);

      expect(year).toBeGreaterThanOrEqual(2024);
      expect(year).toBeLessThanOrEqual(2100);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });

  describe('getISOTimestamp', () => {
    it('should return an ISO 8601 formatted string', () => {
      const timestamp = getISOTimestamp();

      // ISO 8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should be parseable as a Date', () => {
      const timestamp = getISOTimestamp();
      const date = new Date(timestamp);

      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should be close to current time', () => {
      const before = Date.now();
      const timestamp = getISOTimestamp();
      const after = Date.now();

      const parsedTime = new Date(timestamp).getTime();

      expect(parsedTime).toBeGreaterThanOrEqual(before);
      expect(parsedTime).toBeLessThanOrEqual(after);
    });

    it('should produce unique timestamps when called in sequence', async () => {
      const timestamps: string[] = [];

      for (let i = 0; i < 5; i++) {
        timestamps.push(getISOTimestamp());
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      const unique = new Set(timestamps);
      // At least some should be unique (allowing for same-millisecond calls)
      expect(unique.size).toBeGreaterThan(1);
    });
  });
});
