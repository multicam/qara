# Research Optimization - Quick Reference

**Purpose:** Fast lookup for features, use cases, and implementation priorities  
**Full Plan:** [RESEARCH_OPTIMIZATION_PLAN.md](RESEARCH_OPTIMIZATION_PLAN.md)  
**Summary:** [RESEARCH_OPTIMIZATION_SUMMARY.md](RESEARCH_OPTIMIZATION_SUMMARY.md)

---

## Feature Priority Matrix

### 🔴 Critical (Implement First)

| Feature | Impact | Effort | ROI | Phase |
|---------|--------|--------|-----|-------|
| **Research Caching** | Very High | Medium | 9/10 | I |
| **Quality Scoring** | High | Low | 9/10 | I |
| **Research Templates** | Very High | High | 8/10 | II |
| **Output Formats** | High | Medium | 8/10 | II |

### 🟡 Important (Implement Second)

| Feature | Impact | Effort | ROI | Phase |
|---------|--------|--------|-----|-------|
| **Query Decomposition** | Medium | Medium | 7/10 | I |
| **Follow-up Suggestions** | Medium | Low | 8/10 | I |
| **Interactive Workflows** | Medium | Medium | 7/10 | II |
| **Research Presets** | Medium | Low | 8/10 | II |

### 🟢 Nice to Have (Implement Third)

| Feature | Impact | Effort | ROI | Phase |
|---------|--------|--------|-----|-------|
| **Multi-Stage Research** | Medium | High | 6/10 | III |
| **Learning System** | Medium | High | 6/10 | III |
| **Source Quality** | Low-Medium | High | 5/10 | III |
| **Research API** | Low | High | 5/10 | III |
| **Dashboard** | Low | High | 5/10 | IV |

---

## Use Case → Feature Mapping

### "I need to research competitors quickly"
**Before:** Start from scratch, 30-60 seconds  
**After:** Use Competitive Analysis template, 15-20 seconds  
**Features:** Research Templates (Phase II)

---

### "I researched this yesterday, need updated info"
**Before:** Re-run entire research, full cost  
**After:** Check cache, get instant results or delta  
**Features:** Research Caching (Phase I)

---

### "How good is this research?"
**Before:** No way to know  
**After:** Quality score A-D with breakdown  
**Features:** Quality Scoring (Phase I)

---

### "I need just the highlights for my boss"
**Before:** Manual summarization  
**After:** Generate in Executive Summary format  
**Features:** Output Formats (Phase II)

---

### "What should I research next?"
**Before:** Manual brainstorming  
**After:** Auto-generated follow-up suggestions  
**Features:** Follow-up Suggestions (Phase I)

---

### "I need a comparison table of options"
**Before:** Manual table creation from results  
**After:** Generate in Table format directly  
**Features:** Output Formats (Phase II)

---

### "I don't know where to start"
**Before:** Blank slate confusion  
**After:** Choose from 6 templates  
**Features:** Research Templates (Phase II)

---

### "Is this from reliable sources?"
**Before:** Manual source checking  
**After:** Automatic authority scoring + bias detection  
**Features:** Source Quality Assessment (Phase III)

---

### "I need deeper research on specific aspects"
**Before:** Run new research, hope for relevance  
**After:** Multi-stage with user refinement  
**Features:** Interactive Workflows (Phase II)

---

### "How much am I spending on research?"
**Before:** No visibility  
**After:** Dashboard with cost tracking  
**Features:** Research Dashboard (Phase IV)

---

## Template Selection Guide

### When to use Competitive Analysis
- Researching companies or products
- Market positioning questions
- "Who are the key players?"
- "How does X compare to Y?"

**Example:** "Use competitive analysis template for Anthropic"

---

### When to use Technology Evaluation
- Evaluating tools, frameworks, libraries
- Technical decision making
- "Should we use X or Y?"
- "What are the trade-offs?"

**Example:** "Use tech eval template for Next.js vs Remix"

---

### When to use Market Research
- Understanding markets and industries
- Identifying opportunities
- "What's the market size?"
- "What are the trends?"

**Example:** "Use market research template for AI coding assistants"

---

### When to use Due Diligence
- Vetting companies or partners
- Risk assessment
- "Can we trust this company?"
- "What are the red flags?"

**Example:** "Use due diligence template for [startup name]"

---

### When to use Topic Deep Dive
- Learning new subjects
- Comprehensive understanding
- "Teach me about X"
- "I need to understand Y deeply"

**Example:** "Use deep dive template for quantum computing"

---

### When to use Event/Incident Analysis
- Understanding what happened
- Post-mortem research
- "Why did X happen?"
- "What are the consequences?"

**Example:** "Use incident analysis template for [recent event]"

---

## Output Format Selection Guide

### Executive Summary
**Use when:**
- Briefing leadership
- Time-constrained reading
- Decision-ready format needed

**Length:** 1-2 pages  
**Depth:** High-level only

---

### Full Report (Default)
**Use when:**
- Comprehensive understanding needed
- All details matter
- Reference documentation

**Length:** 5-10 pages  
**Depth:** Complete

---

### Bullet Points
**Use when:**
- Quick reference needed
- Fast scanning required
- Action items focus

**Length:** 1-2 pages  
**Depth:** Key points only

---

### Comparison Table
**Use when:**
- Evaluating multiple options
- Side-by-side needed
- Decision matrix wanted

**Length:** 1 page  
**Depth:** Structured comparison

---

### Mind Map
**Use when:**
- Understanding relationships
- Visual learner
- Concept mapping needed

**Length:** Visual diagram  
**Depth:** Hierarchical structure

---

### Timeline
**Use when:**
- Historical analysis
- Chronological understanding
- Event sequence matters

**Length:** Visual timeline  
**Depth:** Temporal progression

---

### Q&A Format
**Use when:**
- Teaching/learning
- FAQ creation
- Easy navigation wanted

**Length:** Question-answer pairs  
**Depth:** Targeted answers

---

## Preset Selection Guide

### Lightning (< 15 sec)
**Use when:**
- "Is this worth researching?"
- Quick validation needed
- Shallow overview sufficient

**Agents:** 1 per type  
**Queries:** 1 per agent  
**Cost:** ~$0.10

---

### Quick (15-30 sec)
**Use when:**
- Simple questions
- Basic understanding needed
- Time is critical

**Agents:** 1 per type  
**Queries:** 2 per agent  
**Cost:** ~$0.15

---

### Standard (30-60 sec) [DEFAULT]
**Use when:**
- Most research needs
- Comprehensive coverage wanted
- Balanced approach

**Agents:** 3 per type  
**Queries:** 2-3 per agent  
**Cost:** ~$0.32

---

### Deep (60-120 sec)
**Use when:**
- Important decisions
- Thorough analysis needed
- Multiple perspectives wanted

**Agents:** 5 per type  
**Queries:** 3-4 per agent  
**Cost:** ~$0.55

---

### Extensive (2-5 min)
**Use when:**
- Critical research
- Exhaustive coverage needed
- No stone unturned

**Agents:** 8 per type  
**Queries:** 4-5 per agent  
**Cost:** ~$0.87

---

## Command Examples

### Basic Research
```bash
# Default (Standard mode, Full Report)
research "quantum computing developments"

# Quick mode
research "quantum computing developments" --mode=quick

# Specific format
research "quantum computing developments" --format=bullets
```

---

### Template-Based Research
```bash
# Competitive analysis
research "Anthropic" --template=competitive

# Technology evaluation
research "Next.js vs Remix" --template=tech-eval

# Market research
research "AI coding assistants market" --template=market
```

---

### Combined Options
```bash
# Template + Format
research "Company X" --template=due-diligence --format=exec

# Preset + Format
research "Topic Y" --preset=deep --format=table

# Force fresh (no cache)
research "Topic Z" --force-refresh
```

---

### Cache Management
```bash
# Check cache stats
research --cache-stats

# Clear old cache
research --cache-clear --older-than=30d

# Cache-only (fail if not cached)
research "Topic" --cache-only
```

---

### Analytics
```bash
# View dashboard
research --dashboard

# Export metrics
research --export-metrics --days=30

# Show performance profile
research "Topic" --profile
```

---

## Implementation Checklist

### Phase I: Intelligence (Weeks 1-2)
- [ ] Implement cache structure and index
- [ ] Add cache check/store logic to workflows
- [ ] Create quality scoring algorithm
- [ ] Integrate scores into reports
- [ ] Enhance query decomposition with LLM
- [ ] Build follow-up suggestion generator
- [ ] Test all Phase I features
- [ ] Update documentation

**Validation:**
- [ ] Cache hit rate >30% after 1 week
- [ ] Quality scores appear in all reports
- [ ] Follow-ups are relevant and actionable
- [ ] Query decomposition shows improvement

---

### Phase II: UX (Weeks 3-4)
- [ ] Create 6 research templates
- [ ] Implement template routing logic
- [ ] Build 7 output format generators
- [ ] Add format selection to workflow
- [ ] Implement interactive workflow system
- [ ] Create named preset system
- [ ] Test all Phase II features
- [ ] Update documentation

**Validation:**
- [ ] All templates produce valid output
- [ ] All formats render correctly
- [ ] Interactive workflows guide users effectively
- [ ] Presets are intuitive and performant

---

### Phase III: Advanced (Weeks 5-8)
- [ ] Build multi-stage research system
- [ ] Implement pattern learning database
- [ ] Create source quality assessment
- [ ] Develop research API interface
- [ ] Build API documentation
- [ ] Create integration examples
- [ ] Test all Phase III features
- [ ] Update documentation

**Validation:**
- [ ] Multi-stage produces better results
- [ ] Learning system shows improvement over time
- [ ] Source scoring is accurate
- [ ] API is functional and documented

---

### Phase IV: Observability (Weeks 9-12)
- [ ] Build metrics collection system
- [ ] Create dashboard views
- [ ] Implement performance profiling
- [ ] Add cost tracking
- [ ] Build analytics reports
- [ ] Create maintenance procedures
- [ ] Write comprehensive guide
- [ ] Final testing and validation

**Validation:**
- [ ] Dashboard shows accurate data
- [ ] Performance profiling identifies bottlenecks
- [ ] Cost tracking is accurate
- [ ] Documentation is complete

---

## Troubleshooting Guide

### "Research is slow"
**Check:**
1. Which preset are you using? (Standard = 30-60s is normal)
2. Is cache enabled? (Should be faster for repeats)
3. Are all researchers responding? (Check dashboard)

**Solutions:**
- Use Quick or Lightning preset for faster results
- Enable caching for repeated queries
- Check researcher performance in dashboard

---

### "Research quality is low"
**Check:**
1. What's the quality score? (Look for A/B/C/D grade)
2. Which preset was used? (Quick gives less coverage)
3. Were all researchers available?

**Solutions:**
- Use higher preset (Standard → Deep → Extensive)
- Check source quality assessment
- Review follow-up suggestions for gaps

---

### "Cache isn't working"
**Check:**
1. Is caching enabled? (Should be default)
2. Is the query different? (Even small changes = cache miss)
3. Is cache expired? (Check TTL)

**Solutions:**
- Verify cache is enabled in config
- Use exact same query for cache hit
- Adjust TTL if content changes frequently

---

### "Templates aren't helpful"
**Check:**
1. Is the right template selected?
2. Is the query well-formed?
3. Does the template match your need?

**Solutions:**
- Review template selection guide above
- Provide more specific query
- Use free-form research instead

---

## Performance Benchmarks

### Current State (Baseline)

| Operation | Time | Cost | Quality |
|-----------|------|------|---------|
| Quick Research | 15-20s | $0.15 | Unknown |
| Standard Research | 30-60s | $0.32 | Unknown |
| Extensive Research | 2-5min | $0.87 | Unknown |
| Repeated Query | 30-60s | $0.32 | Unknown |

### Target State (Post-Implementation)

| Operation | Time | Cost | Quality |
|-----------|------|------|---------|
| Quick Research | 10-15s | $0.12 | 75-80/100 |
| Standard Research | 20-40s | $0.25 | 82-88/100 |
| Extensive Research | 90-180s | $0.70 | 90-95/100 |
| Repeated Query (cached) | 2-5s | $0.02 | Same |
| Template Research | 15-30s | $0.20 | 85-90/100 |

---

## Success Metrics Dashboard (Post-Implementation)

```
┌─────────────────────────────────────────────────┐
│  Research Performance (Last 30 Days)            │
├─────────────────────────────────────────────────┤
│  Sessions: 247                                  │
│  Avg Time: 28s (↓ 35% vs baseline)            │
│  Avg Quality: 86/100                           │
│  Cache Hit Rate: 37%                           │
│  Cost per Session: $0.22 (↓ 31% vs baseline)  │
├─────────────────────────────────────────────────┤
│  Template Usage: 42%                            │
│  - Competitive: 35%                            │
│  - Tech Eval: 28%                              │
│  - Market: 18%                                 │
│  - Others: 19%                                 │
├─────────────────────────────────────────────────┤
│  Format Distribution:                           │
│  - Full Report: 45%                            │
│  - Executive: 28%                              │
│  - Bullets: 15%                                │
│  - Table: 8%                                   │
│  - Others: 4%                                  │
├─────────────────────────────────────────────────┤
│  User Satisfaction: 4.6/5.0 ⭐⭐⭐⭐⭐         │
└─────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0  
**Created:** December 1, 2025  
**Type:** Quick Reference Guide  
**Audience:** Implementers, Users, Maintainers
