# Personal Context Skill - Implementation Guide

**Purpose**: Replace the personal routing logic from `load-dynamic-requirements.md` with a proper skill  
**Created**: November 30, 2025  
**Status**: Ready to Implement  
**Priority**: HIGH - Required before deleting load-dynamic-requirements.md

---

## Executive Summary

This document provides the complete implementation for a new **personal-context** skill that consolidates Jean-Marc's personal data routing currently scattered in `load-dynamic-requirements.md`.

**What it does**:
- Routes to Jean-Marc's personal context files (Alma, finances, health, benefits, etc.)
- Handles Limitless.ai conversation retrieval
- Manages Unsupervised Learning business metrics access
- Provides semantic intent matching for personal queries

**Replaces**: Lines 51-387 of `load-dynamic-requirements.md` (the 20% that's actually useful)

**Size**: ~200 lines (vs 388 lines in load-dynamic-requirements)

---

## Part I: File Structure

### Location
```
.claude/skills/personal-context/
└── SKILL.md
```

### File Size
- Target: 180-220 lines
- Format: Markdown with YAML frontmatter
- Structure: Standard skill format (name + description + workflow routing)

---

## Part II: Complete SKILL.md Content

```markdown
---
name: personal-context
description: |
  Jean-Marc Giorgi's personal life context and data routing. Provides access
  to work projects (Alma), financial data, health tracking, benefits optimization,
  business metrics (Unsupervised Learning), and recorded conversations.
  
  USE WHEN Jean-Marc mentions: Alma, expenses, bills, PG&E, utilities, health,
  fitness, medical, benefits, credit card perks, restaurants (dining credits),
  hotel credits, travel benefits, Unsupervised Learning, newsletter, business metrics,
  conversations, meetings, walking chats, lunch discussions.
---

# Personal Context Skill

**Purpose**: Route to Jean-Marc's personal context files and data sources based on semantic understanding of requests.

**Key Principle**: Understand INTENT, not exact phrase matching. Examples below guide semantic understanding.

---

## Workflow Routing

### 🏢 Work & Projects

**When user asks about Alma company:**

**Semantic intent**: Questions about Alma work, security program, projects
**Example phrases**: 
- "Let's add context for Alma"
- "Alma security program"
- "What's happening with Alma"
- "My work at Alma"

**Action**:
```bash
→ READ: ${PAI_DIR}/context/projects/Alma.md
```

---

### 💰 Financial & Expenses

**When user asks about finances or expenses:**

**Semantic intent**: Personal spending, bills, utilities, budget analysis
**Example phrases**:
- "PG&E bill"
- "What are my expenses"
- "How much am I spending"
- "Budget analysis"
- "Track my utilities"

**Action**:
```bash
→ READ: ${PAI_DIR}/context/life/expenses.md
→ READ: ${PAI_DIR}/context/life/finances/
```

**Special instructions**:
- Use answer-finance-question command if available
- Parse financial PDFs for specific data extraction

---

### 🏥 Health & Wellness

**When user asks about health tracking:**

**Semantic intent**: Health metrics, medical information, fitness, nutrition, sleep
**Example phrases**:
- "My health data"
- "Track my fitness"
- "Medical records"
- "Sleep patterns"
- "Nutrition plan"
- "How's my health"
- "Wellness goals"

**Action**:
```bash
→ READ: ${PAI_DIR}/Projects/Life/Health/CLAUDE.md
```

---

### 🎁 Benefits & Perks Optimization

**When user asks about benefits or perks:**

**Semantic intent**: Credit card benefits, membership perks, unused credits, dining options, travel benefits
**Example phrases**:
- "Benefits I'm not using"
- "Credit card perks"
- "What restaurants can I go to" (dining credits!)
- "Where can I eat" (Resy, Amex dining)
- "Hotel credits"
- "Travel benefits"
- "Lounge access"
- "Maximize my benefits"
- "Annual fee justification"
- "Subscription perks"

**Action**:
```bash
→ READ: ${PAI_DIR}/context/benefits/CLAUDE.md
```

**Key use case**: Jean-Marc wants to know where he can dine using credit card benefits

---

### 📰 Unsupervised Learning Business

**When user asks about the business:**

**Semantic intent**: Newsletter metrics, company performance, UL operations
**Example phrases**:
- "Newsletter subscribers"
- "Company performance"
- "UL metrics"
- "How's the business"
- "Revenue"
- "Podcast stats"
- "Membership numbers"
- "Sponsorship matters"

**Default assumption**: "The company" or "my business" = Unsupervised Learning (unless Alma context is clear)

**Action**:
```bash
→ READ: ${PAI_DIR}/context/unsupervised-learning/CLAUDE.md
```

---

### 🗣️ Recorded Conversations (Limitless.ai)

**When user asks about past conversations:**

**Semantic intent**: What was discussed in meetings, walking chats, in-person conversations
**Example phrases**:
- "I had a conversation the other day"
- "Meeting yesterday"
- "What did we talk about at lunch"
- "Walking chat last week"
- "Dinner conversation on July 9th"
- "What was discussed with [person]"

**Action**:
```bash
→ READ: ${PAI_DIR}/commands/get-life-log.md
→ EXECUTE: Limitless.ai API query for conversation retrieval
```

**Note**: Limitless.ai pendant records live conversations automatically

---

### 📝 My Content & Opinions

**When user asks about Jean-Marc's past writings or opinions:**

**Semantic intent**: What did I say about something, my opinions, past blog posts
**Example phrases**:
- "What did I say about X"
- "My opinion on Y"
- "Find my post about Z"
- "When did I write about"
- "My thoughts on"
- "Search my content"

**Action**:
```bash
# Search through Jean-Marc's published content
# Document implementation when available
```

---

## Extended Context

### About This Skill

**Personal vs Generic**: This skill is ONLY for Jean-Marc's personal data. Generic functionality (research, security, development) belongs in other skills.

**Privacy**: All context files are in the PRIVATE qara repository. Never commit personal data to public repos.

**Maintenance**: Update routing when new personal context files are added.

---

### Semantic Understanding Examples

**Good semantic matching:**
- User: "Where can I eat tonight?" → Benefits skill (credit card dining benefits)
- User: "What's my PG&E looking like?" → Financial data
- User: "How are things at work?" → Alma context (if Alma is primary work)
- User: "How's my company doing?" → Unsupervised Learning metrics
- User: "What did Bob and I discuss?" → Conversation retrieval

**Don't over-match:**
- User: "Research restaurants in SF" → research skill (NOT benefits - this is generic research)
- User: "How does health insurance work?" → conversational (NOT personal health data)
- User: "What's the best fitness tracker?" → conversational/research (NOT personal fitness data)

**Key**: Match when user is asking about THEIR OWN data, not generic information.

---

### Adding New Personal Context

**When Jean-Marc creates new personal context files:**

1. Add to appropriate section above
2. Include semantic intent description
3. Provide example phrases
4. Document file path
5. Test trigger phrases

**Example template:**
```markdown
### New Category Name

**When user asks about [category]:**

**Semantic intent**: [Description]
**Example phrases**:
- "phrase 1"
- "phrase 2"

**Action**:
```bash
→ READ: ${PAI_DIR}/context/[path]/[file].md
```
```

---

### Related Skills

**Other skills handle:**
- **research**: Generic information gathering (not personal data)
- **agent-observability**: System monitoring
- **finance-charts**: Financial visualization (may use personal data)
- **CORE**: System operations, not personal context

**Boundary**: personal-context routes to data, other skills process/analyze data.

---

## Verification Checklist

Before marking this skill as complete, verify all triggers work:

### Financial Triggers
- [ ] "What's my PG&E bill" → loads expenses.md
- [ ] "Show my spending" → loads finances/
- [ ] "Budget analysis" → loads financial context

### Health Triggers
- [ ] "My health data" → loads Health/CLAUDE.md
- [ ] "Track my fitness" → loads health context
- [ ] "Medical records" → loads health context

### Benefits Triggers
- [ ] "Where can I eat" → loads benefits/CLAUDE.md
- [ ] "Credit card perks" → loads benefits
- [ ] "Hotel credits" → loads benefits
- [ ] "What restaurants" → loads benefits (dining credits)

### Business Triggers
- [ ] "Newsletter metrics" → loads unsupervised-learning/CLAUDE.md
- [ ] "Company performance" → loads UL context
- [ ] "How's the business" → loads UL context

### Conversation Triggers
- [ ] "Meeting yesterday" → reads get-life-log.md
- [ ] "What did we discuss" → retrieves conversation

### Work Triggers
- [ ] "Alma project" → loads Alma.md
- [ ] "Work context" → loads Alma.md

---

**End of SKILL.md content**
```

---

## Part III: Implementation Steps

### Step 1: Create Directory

```bash
cd ~/qara
mkdir -p .claude/skills/personal-context
```

### Step 2: Create SKILL.md

```bash
# Copy the content from Part II above into:
# .claude/skills/personal-context/SKILL.md
```

Or use the pre-made file at end of this document.

### Step 3: Test Skill Activation

**Test each trigger category:**

1. **Financial**: "What's my PG&E bill"
   - Expected: Skill activates, loads expenses.md
   
2. **Health**: "Show my health data"
   - Expected: Skill activates, loads Health/CLAUDE.md
   
3. **Benefits**: "Where can I eat with my credit card perks"
   - Expected: Skill activates, loads benefits/CLAUDE.md
   
4. **Business**: "How's Unsupervised Learning doing"
   - Expected: Skill activates, loads unsupervised-learning/CLAUDE.md
   
5. **Conversations**: "What did I discuss in yesterday's meeting"
   - Expected: Skill activates, reads get-life-log.md

### Step 4: Verify Context Files Exist

```bash
# Check all referenced files exist
ls -la ${PAI_DIR}/context/projects/Alma.md
ls -la ${PAI_DIR}/context/life/expenses.md
ls -la ${PAI_DIR}/context/life/finances/
ls -la ${PAI_DIR}/Projects/Life/Health/CLAUDE.md
ls -la ${PAI_DIR}/context/benefits/CLAUDE.md
ls -la ${PAI_DIR}/context/unsupervised-learning/CLAUDE.md
ls -la ${PAI_DIR}/commands/get-life-log.md
```

**If any are missing:**
- Create them, OR
- Remove that section from SKILL.md, OR
- Update path in SKILL.md

### Step 5: Add to Skills Index (Optional)

If there's a skills index or registry, add personal-context to it.

---

## Part IV: Migration from load-dynamic-requirements.md

### Content Mapping

**From load-dynamic-requirements.md → To personal-context/SKILL.md:**

| Old Section (Lines) | New Section | Status |
|---------------------|-------------|--------|
| Alma Company (52-70) | Work & Projects | ✅ Migrated |
| Live Conversations (72-98) | Recorded Conversations | ✅ Migrated |
| Financial & Analytics (174-202) | Financial & Expenses | ✅ Migrated |
| Health & Wellness (204-229) | Health & Wellness | ✅ Migrated |
| Benefits & Perks (231-261) | Benefits & Perks | ✅ Migrated |
| Unsupervised Learning (264-287) | Business | ✅ Migrated |
| My Content & Opinions (351-370) | My Content & Opinions | ✅ Migrated |

**What's NOT migrated** (already covered by other skills):
- Conversational discussion → Default behavior, no skill needed
- Research & Information → research skill
- Security & Pentesting → pentester agent (needs skill?)
- Web Development → designer agent (needs skill?)
- Capture Learning → history-system hooks (automatic)
- Advanced Web Scraping → research skill (retrieve.md workflow)

### Verification That Nothing Was Lost

**All personal context routing preserved:**
- ✅ Alma work context
- ✅ Financial data
- ✅ Health tracking
- ✅ Benefits optimization
- ✅ Business metrics
- ✅ Conversation retrieval
- ✅ Past content/opinions

**Generic routing moved to existing skills:**
- ✅ Research → research skill
- ✅ Security → (pentester agent, may need skill)
- ✅ Web dev → (designer agent, may need skill)
- ✅ Learning capture → history-system hooks

---

## Part V: After Implementation

### Once personal-context skill is working:

**1. Archive load-dynamic-requirements.md:**
```bash
mkdir -p archive/commands-deprecated-2025-11-30
mv .claude/commands/load-dynamic-requirements.md \
   archive/commands-deprecated-2025-11-30/
```

**2. Disable load-dynamic-requirements.ts hook:**

Edit `.claude/hooks/load-dynamic-requirements.ts`:

```typescript
#!/usr/bin/env bun
// DEPRECATED: This hook loaded load-dynamic-requirements.md which has been
// replaced by the skills system:
// - Generic routing → skills YAML descriptions (research, security, etc.)
// - Personal routing → personal-context skill
//
// This hook is no longer needed and should be removed after verification.

throw new Error(
  "load-dynamic-requirements hook is deprecated.\n" +
  "Personal routing now handled by personal-context skill.\n" +
  "Generic routing handled by skills YAML descriptions."
);
```

**3. Update MIGRATION.md:**

```markdown
## load-dynamic-requirements.md Deprecated (2025-11-30)

Replaced by:
- **personal-context skill**: Personal data routing (finances, health, etc.)
- **Skills system**: Generic routing via YAML descriptions
- **History system**: Automatic learning capture (no manual command)

See: PERSONAL_CONTEXT_SKILL_IMPLEMENTATION.md
```

**4. Verify everything still works:**
- Test all personal context triggers
- Test generic skills still activate
- Test history capture still works
- Check for broken references

---

## Part VI: Ready-to-Use SKILL.md File

**Save this as:** `.claude/skills/personal-context/SKILL.md`

```markdown
---
name: personal-context
description: |
  Jean-Marc Giorgi's personal life context and data routing. Provides access
  to work projects (Alma), financial data, health tracking, benefits optimization,
  business metrics (Unsupervised Learning), and recorded conversations.
  
  USE WHEN Jean-Marc mentions: Alma, expenses, bills, PG&E, utilities, health,
  fitness, medical, benefits, credit card perks, restaurants (dining credits),
  hotel credits, travel benefits, Unsupervised Learning, newsletter, business metrics,
  conversations, meetings, walking chats, lunch discussions.
---

# Personal Context Skill

## Workflow Routing

### 🏢 Work & Projects

**When user asks about Alma company:**
Examples: "Alma security", "add Alma context", "my work at Alma"
→ **READ:** `${PAI_DIR}/context/projects/Alma.md`

---

### 💰 Financial & Expenses

**When user asks about finances:**
Examples: "PG&E bill", "my expenses", "spending", "budget"
→ **READ:** `${PAI_DIR}/context/life/expenses.md`
→ **READ:** `${PAI_DIR}/context/life/finances/`

---

### 🏥 Health & Wellness

**When user asks about health:**
Examples: "my health", "fitness tracking", "medical records", "wellness"
→ **READ:** `${PAI_DIR}/Projects/Life/Health/CLAUDE.md`

---

### 🎁 Benefits & Perks

**When user asks about benefits/perks:**
Examples: "credit card perks", "where can I eat", "restaurants", "hotel credits", "travel benefits", "lounge access"
→ **READ:** `${PAI_DIR}/context/benefits/CLAUDE.md`

---

### 📰 Unsupervised Learning Business

**When user asks about the business:**
Examples: "newsletter metrics", "company performance", "how's the business", "UL stats"
→ **READ:** `${PAI_DIR}/context/unsupervised-learning/CLAUDE.md`

---

### 🗣️ Recorded Conversations

**When user asks about past conversations:**
Examples: "meeting yesterday", "conversation last week", "what did we discuss", "walking chat"
→ **READ:** `${PAI_DIR}/commands/get-life-log.md`
→ **EXECUTE:** Limitless.ai conversation retrieval

---

### 📝 My Content & Opinions

**When user asks about past writings:**
Examples: "what did I say about", "my opinion on", "find my post about"
→ **ACTION:** Search Jean-Marc's published content

---

## About This Skill

**Purpose**: Route to Jean-Marc's personal data only. Generic functionality belongs in other skills (research, security, etc.).

**Privacy**: All context files in PRIVATE repository only.

**Semantic Understanding**: Match INTENT not exact phrases. Examples above guide understanding.

**Key Pattern**: Use when Jean-Marc asks about HIS OWN data, not generic information.
```

---

## Part VII: Success Criteria

✅ **Skill is complete when:**

1. All personal context triggers work (verified via testing)
2. No references to load-dynamic-requirements.md remain
3. load-dynamic-requirements.ts hook is disabled
4. All context files paths are correct
5. Documentation is updated (MIGRATION.md)
6. Zero functionality lost from old system

---

## Part VIII: Timeline

**Estimated time**: 2-3 hours total

- **30 min**: Create directory and SKILL.md file
- **30 min**: Verify all context file paths
- **30 min**: Test all trigger phrases
- **30 min**: Archive old files and disable hook
- **30 min**: Update documentation and verify no broken references

---

## Conclusion

This personal-context skill is a **clean, focused replacement** for the personal routing portions of `load-dynamic-requirements.md`.

**Benefits**:
- 200 lines vs 388 lines (48% reduction)
- Modular (separate from generic routing)
- Maintainable (one place for personal context)
- Consistent with skills architecture
- Easy to extend

**Next Step**: Create `.claude/skills/personal-context/SKILL.md` with the content from Part VI.

---

**Document Version**: 1.0  
**Created**: November 30, 2025  
**Status**: Ready to Implement  
**Author**: Qara Implementation Team
