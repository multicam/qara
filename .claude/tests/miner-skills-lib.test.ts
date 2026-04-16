/**
 * Tests for miner-skills-lib — design-skill usage metrics for the introspect pipeline.
 *
 * Fixtures are synthetic SkillSuggestion entries from skill-suggestions.jsonl.
 */

import { describe, it, expect } from "bun:test";
import {
    DESIGN_SKILLS,
    countDesignSkillsUsed,
    detectDesignChains,
    detectReinvocations,
    detectOrphans,
    countExtractUsage,
    type SkillSuggestion,
} from "../skills/introspect/tools/miner-skills-lib";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mk(skill: string, session: string, offsetSec = 0): SkillSuggestion {
    const ts = new Date(Date.parse("2026-04-16T10:00:00.000Z") + offsetSec * 1000).toISOString();
    return { timestamp: ts, skill_name: skill, session_id: session };
}

// ---------------------------------------------------------------------------
// Whitelist
// ---------------------------------------------------------------------------

describe("DESIGN_SKILLS whitelist", () => {
    it("contains all consolidated design skills", () => {
        expect(DESIGN_SKILLS).toContain("impeccable");
        expect(DESIGN_SKILLS).toContain("shape");
        expect(DESIGN_SKILLS).toContain("tune");
        expect(DESIGN_SKILLS).toContain("impeccable-typeset");
        expect(DESIGN_SKILLS).toContain("tokens");
        expect(DESIGN_SKILLS).toContain("flows");
        expect(DESIGN_SKILLS).toContain("critique");
        expect(DESIGN_SKILLS).toContain("polish");
    });

    it("does not contain the merged skills", () => {
        expect(DESIGN_SKILLS).not.toContain("bolder");
        expect(DESIGN_SKILLS).not.toContain("quieter");
        expect(DESIGN_SKILLS).not.toContain("colorize");
        expect(DESIGN_SKILLS).not.toContain("typeset");
    });
});

// ---------------------------------------------------------------------------
// countDesignSkillsUsed
// ---------------------------------------------------------------------------

describe("countDesignSkillsUsed", () => {
    it("counts only design skills, ignoring others", () => {
        const entries: SkillSuggestion[] = [
            mk("impeccable", "s1"),
            mk("tune", "s1"),
            mk("system-create-cli", "s1"), // not a design skill
            mk("critique", "s2"),
            mk("research", "s2"),           // not a design skill
        ];
        const counts = countDesignSkillsUsed(entries);
        expect(counts).toEqual({ impeccable: 1, tune: 1, critique: 1 });
    });

    it("returns empty object for zero design-skill events", () => {
        expect(countDesignSkillsUsed([mk("research", "s1")])).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// detectDesignChains
// ---------------------------------------------------------------------------

describe("detectDesignChains", () => {
    it("detects a classic pipeline chain in one session", () => {
        const entries: SkillSuggestion[] = [
            mk("shape", "s1", 0),
            mk("impeccable", "s1", 10),
            mk("critique", "s1", 20),
            mk("polish", "s1", 30),
        ];
        const chains = detectDesignChains(entries);
        expect(chains.length).toBe(1);
        expect(chains[0].session_id).toBe("s1");
        expect(chains[0].skills).toEqual(["shape", "impeccable", "critique", "polish"]);
    });

    it("ignores non-design skills interleaved in the session", () => {
        const entries: SkillSuggestion[] = [
            mk("shape", "s1", 0),
            mk("research", "s1", 5),        // not design, skip
            mk("impeccable", "s1", 10),
            mk("research", "s1", 15),
            mk("polish", "s1", 20),
        ];
        const chains = detectDesignChains(entries);
        expect(chains[0].skills).toEqual(["shape", "impeccable", "polish"]);
    });

    it("does not emit a chain for sessions with < 2 design skills", () => {
        const entries: SkillSuggestion[] = [
            mk("impeccable", "s1"),
            mk("research", "s1"),
        ];
        expect(detectDesignChains(entries).length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// detectReinvocations
// ---------------------------------------------------------------------------

describe("detectReinvocations", () => {
    it("counts skills fired ≥2× in the same session", () => {
        const entries: SkillSuggestion[] = [
            mk("critique", "s1", 0),
            mk("impeccable", "s1", 10),
            mk("critique", "s1", 20),   // second fire in s1
            mk("critique", "s2", 30),   // single fire in s2, not counted
        ];
        const reinv = detectReinvocations(entries);
        expect(reinv.critique).toBe(1); // one session with ≥2× critique
        expect(reinv.impeccable).toBeUndefined();
    });

    it("handles multiple skills re-invoked across sessions", () => {
        const entries: SkillSuggestion[] = [
            mk("tune", "s1", 0), mk("tune", "s1", 5),
            mk("tune", "s2", 10), mk("tune", "s2", 15),
            mk("polish", "s3", 20), mk("polish", "s3", 25),
        ];
        const reinv = detectReinvocations(entries);
        expect(reinv.tune).toBe(2);
        expect(reinv.polish).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// detectOrphans (critique/audit without follow-on in same session)
// ---------------------------------------------------------------------------

describe("detectOrphans", () => {
    it("flags critique/audit sessions without follow-on design skill", () => {
        const entries: SkillSuggestion[] = [
            mk("impeccable", "s1", 0),
            mk("critique", "s1", 10),
            // no follow-on — orphan
            mk("impeccable", "s2", 20),
            mk("audit", "s2", 30),
            mk("polish", "s2", 40),     // follow-on → not orphan
        ];
        const orphans = detectOrphans(entries);
        expect(orphans.length).toBe(1);
        expect(orphans[0].session_id).toBe("s1");
        expect(orphans[0].ending_skill).toBe("critique");
    });

    it("does not flag sessions without critique or audit", () => {
        const entries: SkillSuggestion[] = [
            mk("impeccable", "s1"),
            mk("polish", "s1"),
        ];
        expect(detectOrphans(entries).length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// countExtractUsage
// ---------------------------------------------------------------------------

describe("countExtractUsage", () => {
    it("splits direct /impeccable extract vs tokens alias", () => {
        const entries: SkillSuggestion[] = [
            { timestamp: "2026-04-16T10:00:00Z", skill_name: "impeccable", session_id: "s1", reason: "Matched: extract tokens" },
            { timestamp: "2026-04-16T10:01:00Z", skill_name: "tokens", session_id: "s2" },
            { timestamp: "2026-04-16T10:02:00Z", skill_name: "tokens", session_id: "s3" },
            { timestamp: "2026-04-16T10:03:00Z", skill_name: "impeccable", session_id: "s4", reason: "craft" },
        ];
        const usage = countExtractUsage(entries);
        expect(usage.direct).toBe(1);               // impeccable with 'extract' reason
        expect(usage.via_tokens_alias).toBe(2);    // two tokens invocations
    });

    it("returns zeros when nothing matches", () => {
        expect(countExtractUsage([mk("polish", "s1")])).toEqual({ direct: 0, via_tokens_alias: 0 });
    });
});
