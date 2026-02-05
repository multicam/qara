import { describe, expect, test } from 'bun:test';
import {
    parseVersion,
    compareVersions,
    FEATURE_REQUIREMENTS,
    generateReport,
} from './cc-version-check.ts';

describe('parseVersion', () => {
    test('parses simple version', () => {
        expect(parseVersion('2.1.3')).toEqual([2, 1, 3]);
    });

    test('strips v prefix', () => {
        expect(parseVersion('v1.0.80')).toEqual([1, 0, 80]);
    });

    test('strips prerelease suffix', () => {
        expect(parseVersion('2.1.0-beta.1')).toEqual([2, 1, 0]);
    });

    test('handles two-part version', () => {
        expect(parseVersion('0.2')).toEqual([0, 2]);
    });
});

describe('compareVersions', () => {
    test('equal versions return 0', () => {
        expect(compareVersions([2, 1, 0], [2, 1, 0])).toBe(0);
    });

    test('greater major version returns 1', () => {
        expect(compareVersions([3, 0, 0], [2, 1, 0])).toBe(1);
    });

    test('lesser patch version returns -1', () => {
        expect(compareVersions([2, 1, 0], [2, 1, 3])).toBe(-1);
    });

    test('handles different length arrays', () => {
        expect(compareVersions([2, 1], [2, 1, 0])).toBe(0);
        expect(compareVersions([2, 1], [2, 1, 1])).toBe(-1);
    });
});

describe('FEATURE_REQUIREMENTS', () => {
    test('has required keys', () => {
        expect(FEATURE_REQUIREMENTS.subagents).toBeDefined();
        expect(FEATURE_REQUIREMENTS.skills).toBeDefined();
        expect(FEATURE_REQUIREMENTS.modelRouting).toBeDefined();
    });

    test('all entries have minVersion and description', () => {
        for (const [key, config] of Object.entries(FEATURE_REQUIREMENTS)) {
            expect(config.minVersion).toBeDefined();
            expect(config.description).toBeDefined();
            expect(config.description.length).toBeGreaterThan(0);
        }
    });
});

describe('generateReport', () => {
    test('generates report with no CC version', () => {
        const report = generateReport(null, null, '/tmp');
        expect(report.ccVersion).toBe('Not detected');
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.recommendations[0].priority).toBe('HIGH');
    });

    test('generates report with valid version', () => {
        const report = generateReport('2.1.0', '/usr/local/bin/claude', '/tmp');
        expect(report.ccVersion).toBe('2.1.0');
        expect(Object.keys(report.featureStatus).length).toBeGreaterThan(0);

        // v2.1.0 should support modelRouting
        expect(report.featureStatus.modelRouting.supported).toBe(true);
    });

    test('flags features requiring newer version', () => {
        const report = generateReport('1.0.0', '/usr/local/bin/claude', '/tmp');

        // v1.0.0 should NOT support skills (requires 2.0.40)
        expect(report.featureStatus.skills.supported).toBe(false);
    });

    test('recommends upgrade for pre-2.0', () => {
        const report = generateReport('1.5.0', '/usr/local/bin/claude', '/tmp');
        const hasUpgradeRec = report.recommendations.some(r =>
            r.message.includes('2.0+')
        );
        expect(hasUpgradeRec).toBe(true);
    });
});
