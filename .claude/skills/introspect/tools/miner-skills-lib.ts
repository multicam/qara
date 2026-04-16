/**
 * miner-skills-lib — Design-skill usage metrics for the introspect pipeline.
 *
 * Pure functions over SkillSuggestion entries (parsed from `skill-suggestions.jsonl`).
 * Feeds daily observation reports with:
 *   - design_skills_used        — counts per skill
 *   - design_chains             — detected pipeline sequences
 *   - design_reinvocations      — same skill fired ≥2× in a session
 *   - design_orphans            — critique/audit ending without follow-on
 *   - extract_usage             — /impeccable extract vs /tokens alias split
 *
 * Added 2026-04-16 as Phase 9 of design-skills-landscape-consolidation plan v1.2.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillSuggestion {
    timestamp: string;
    skill_name: string;
    session_id: string;
    suggested_by?: string;
    reason?: string;
}

export interface DesignChain {
    session_id: string;
    skills: string[];
}

export interface DesignOrphan {
    session_id: string;
    ending_skill: "critique" | "audit";
}

export interface ExtractUsage {
    direct: number;            // /impeccable extract (skill_name=impeccable, reason mentions "extract")
    via_tokens_alias: number;  // /tokens invocations
}

// ---------------------------------------------------------------------------
// Whitelist
// ---------------------------------------------------------------------------

export const DESIGN_SKILLS: ReadonlySet<string> = new Set([
    "impeccable",
    "shape",
    "layout",
    "critique",
    "audit",
    "polish",
    "animate",
    "adapt",
    "clarify",
    "harden",
    "optimize",
    "visual-explainer",
    "tune",
    "impeccable-typeset",
    "tokens",
    "flows",
    "design-it-twice",
    "design-implementation",
    "image",
    "csf-view",
]);

function isDesign(skill: string): boolean {
    return DESIGN_SKILLS.has(skill);
}

// Only design skills count as a "follow-on" to critique/audit for orphan detection.
const REVIEW_SKILLS = new Set(["critique", "audit"]);

// Group design-skill entries by session, sorted chronologically. Shared by
// chain and orphan detection — both need the same per-session timeline.
function groupBySessionChrono(entries: SkillSuggestion[]): Map<string, SkillSuggestion[]> {
    const bySession = new Map<string, SkillSuggestion[]>();
    for (const e of entries) {
        if (!isDesign(e.skill_name)) continue;
        const arr = bySession.get(e.session_id) ?? [];
        arr.push(e);
        bySession.set(e.session_id, arr);
    }
    for (const [, arr] of bySession) {
        arr.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    return bySession;
}

// ---------------------------------------------------------------------------
// countDesignSkillsUsed
// ---------------------------------------------------------------------------

export function countDesignSkillsUsed(entries: SkillSuggestion[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of entries) {
        if (!isDesign(e.skill_name)) continue;
        counts[e.skill_name] = (counts[e.skill_name] ?? 0) + 1;
    }
    return counts;
}

// ---------------------------------------------------------------------------
// detectDesignChains
// ---------------------------------------------------------------------------

export function detectDesignChains(entries: SkillSuggestion[]): DesignChain[] {
    const chains: DesignChain[] = [];
    for (const [session_id, list] of groupBySessionChrono(entries)) {
        if (list.length < 2) continue;
        chains.push({ session_id, skills: list.map((e) => e.skill_name) });
    }
    return chains;
}

// ---------------------------------------------------------------------------
// detectReinvocations
// ---------------------------------------------------------------------------

export function detectReinvocations(entries: SkillSuggestion[]): Record<string, number> {
    // perSessionPerSkill[session][skill] = count
    const perSession = new Map<string, Map<string, number>>();
    for (const e of entries) {
        if (!isDesign(e.skill_name)) continue;
        const m = perSession.get(e.session_id) ?? new Map<string, number>();
        m.set(e.skill_name, (m.get(e.skill_name) ?? 0) + 1);
        perSession.set(e.session_id, m);
    }

    // For each skill, count sessions where it fired ≥2×.
    const result: Record<string, number> = {};
    for (const [, skillMap] of perSession) {
        for (const [skill, count] of skillMap) {
            if (count < 2) continue;
            result[skill] = (result[skill] ?? 0) + 1;
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// detectOrphans
// ---------------------------------------------------------------------------

export function detectOrphans(entries: SkillSuggestion[]): DesignOrphan[] {
    const orphans: DesignOrphan[] = [];
    for (const [session_id, list] of groupBySessionChrono(entries)) {
        const last = list[list.length - 1];
        if (!last) continue;
        if (REVIEW_SKILLS.has(last.skill_name)) {
            orphans.push({ session_id, ending_skill: last.skill_name as "critique" | "audit" });
        }
    }
    return orphans;
}

// ---------------------------------------------------------------------------
// countExtractUsage
// ---------------------------------------------------------------------------

export function countExtractUsage(entries: SkillSuggestion[]): ExtractUsage {
    let direct = 0;
    let via_tokens_alias = 0;
    for (const e of entries) {
        if (e.skill_name === "tokens") {
            via_tokens_alias++;
        } else if (
            e.skill_name === "impeccable" &&
            typeof e.reason === "string" &&
            /\bextract\b/i.test(e.reason)
        ) {
            direct++;
        }
    }
    return { direct, via_tokens_alias };
}
