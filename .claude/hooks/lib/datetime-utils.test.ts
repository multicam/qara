/**
 * Tests for datetime-utils.ts
 */

import { describe, it, expect } from 'bun:test';
import { getISOTimestamp } from './datetime-utils';

describe('getISOTimestamp', () => {
  it('should return ISO 8601 formatted string', () => {
    const ts = getISOTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should return different values over time', async () => {
    const t1 = getISOTimestamp();
    await new Promise(r => setTimeout(r, 10));
    const t2 = getISOTimestamp();
    expect(typeof t1).toBe('string');
    expect(typeof t2).toBe('string');
  });
});
