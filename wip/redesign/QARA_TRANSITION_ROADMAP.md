# Qara Transition Roadmap: v1 → v2

**Date:** 2025-12-01  
**Status:** Strategic Plan  
**Timeline:** 6 months to production v2

---

## Executive Summary

**The Opportunity:** Rebuild Qara with 10x performance, 3x less code, 100% deterministic routing.

**The Risk:** Disruption to current working system.

**The Strategy:** Incremental migration with parallel run and validation.

**The Outcome:** Production-grade AI infrastructure that scales to millions of users.

---

## Current State Assessment

### What's Working Well

1. **CLI-First Philosophy** - Deterministic tools > prompts ✅
2. **Progressive Disclosure** - Token-efficient context loading ✅
3. **Skills-as-Containers** - Good organizational pattern ✅
4. **Comprehensive Documentation** - Well-maintained, zero redundancy ✅
5. **Agent System** - Parallel delegation works ✅

### Critical Bottlenecks

1. **Routing Latency** - 1-3 seconds (AI matching triggers)
2. **Token Waste** - 1K-10K tokens spent on routing
3. **Brittleness** - Locked into Claude Code/Anthropic
4. **Maintenance Burden** - 15K+ lines of docs to maintain
5. **Testing Gap** - Skills not unit testable without AI

### The Core Problem

**Qara treats AI as the system, when it should treat AI as a component.**

Current: Natural Language → AI → Skill Selection → AI → Execution  
Optimal: Natural Language → Code → Skill Selection (instant) → AI → Execution

---

## The Vision: Qara v2

### What Changes

| Aspect | v1 (Current) | v2 (Future) |
|--------|--------------|-------------|
| **Skills** | Markdown files | TypeScript modules |
| **Routing** | AI matches triggers | Compiled trie (<1ms) |
| **Context** | File-based | Graph queries + vectors |
| **Testing** | Manual workflows | Unit tests |
| **LLM** | Claude Code only | Any LLM (portable) |
| **Docs** | 15K lines | 5K lines (+ generated) |
| **Speed** | 3-15s typical | <1s typical |
| **Reliability** | ~68% compound | ~90% compound |

### What Stays the Same

- ✅ CLI-first philosophy
- ✅ Deterministic tools
- ✅ Skills-as-containers concept
- ✅ Progressive disclosure principle
- ✅ History system
- ✅ User experience patterns

**Migration strategy ensures zero disruption to current workflows.**

---

## 6-Month Roadmap

### Month 1: Foundation (Weeks 1-4)

**Goal:** Prove the concept works

**Week 1: POC Router**
```typescript
// Build minimal compiled router
class Router {
  route(input: string): Skill {
    // Trie-based matching
    // Target: <1ms latency
  }
}

// Benchmark vs current
// Success: 100x faster routing
```

**Week 2: First Skill in TypeScript**
```typescript
// Port blog skill to TypeScript
export default class BlogSkill extends Skill {
  async write(ctx) { /* ... */ }
  async publish(ctx) { /* ... */ }
}

// Add unit tests
test('writeBlog creates draft', async () => {
  const result = await skill.write({ input: 'write blog about AI' });
  expect(result.success).toBe(true);
});

// Success: Testable, type-safe, faster
```

**Week 3: Basic Runtime**
```typescript
class QaraV2 {
  async execute(input: string) {
    const route = this.router.route(input);  // <1ms
    const context = await this.context.load(route);  // <50ms
    return await this.executor.execute(route, context);
  }
}

// Success: End-to-end execution
```

**Week 4: Validation**
```bash
# Run 100 test cases through both v1 and v2
# Compare outputs
# Measure latency differences

# Success criteria:
# - 95%+ output parity
# - 10x+ faster routing
# - Zero regressions
```

**Deliverables:**
- ✅ POC router (100 lines)
- ✅ 1 working TypeScript skill
- ✅ Basic runtime (500 lines)
- ✅ Validation report

**Decision Point:** Go/No-Go for full implementation

---

### Month 2: Core Runtime (Weeks 5-8)

**Goal:** Complete production-ready runtime

**Week 5: Complete Router**
```typescript
// Add fuzzy matching fallback
// Add confidence scoring
// Optimize trie structure
// Add debugging/profiling

// Target:
// - <1ms for 90% of queries
// - <10ms for 99% of queries
// - 100% routing accuracy
```

**Week 6: Essential Skills**
```typescript
// Port to TypeScript:
// 1. Blog skill
// 2. Research skill
// 3. Code skill
// 4. Files skill
// 5. Git skill

// Each with:
// - Full implementation
// - Unit tests
// - Documentation
```

**Week 7: Context Manager**
```typescript
// Build graph-based context
class ContextGraph {
  async query(skill, input, maxTokens) {
    // Vector similarity search
    // Dependency resolution
    // Token budget optimization
  }
}

// Target:
// - 50% smaller context
// - 2x more relevant
```

**Week 8: Integration Testing**
```bash
# End-to-end tests for common workflows
# Performance benchmarks
# Load testing
# Error handling validation

# Success:
# - All tests passing
# - Performance targets met
# - Production-ready
```

**Deliverables:**
- ✅ Complete router with fuzzy fallback
- ✅ 5 essential skills in TypeScript
- ✅ Graph-based context manager
- ✅ Full test suite

---

### Month 3: Advanced Features (Weeks 9-12)

**Goal:** Add high-leverage optimizations

**Week 9: Streaming Plugin**
```typescript
// Real-time result streaming
for await (const chunk of qara.stream(input)) {
  console.log(chunk);  // Instant feedback
}

// UX improvement: 50% faster perceived latency
```

**Week 10: Caching Plugin**
```typescript
// LRU cache for deterministic results
const cache = new LRU({ max: 1000 });

// Hit rate target: >40%
// Speed improvement: Instant for cached queries
```

**Week 11: Vector Context Plugin**
```typescript
// Use OpenAI embeddings for semantic context
const relevant = await vectorDB.search(query, topK: 5);

// Precision improvement: 2x more relevant context
// Token reduction: 50%
```

**Week 12: Monitoring/Observability**
```typescript
// Track metrics:
// - Routing accuracy
// - Execution latency
// - Cache hit rates
// - Token usage

// Dashboard for system health
```

**Deliverables:**
- ✅ Streaming execution plugin
- ✅ Result caching plugin
- ✅ Vector-based context plugin
- ✅ Observability dashboard

---

### Month 4: Migration Tools (Weeks 13-16)

**Goal:** Make migration effortless

**Week 13: Markdown → TypeScript Transpiler**
```typescript
// Auto-convert existing skills
await transpile('skills/**/*.md', { 
  output: 'skills-ts/',
  preserve: true  // Keep originals
});

// Target: 90%+ automation
// Manual fixes: <10%
```

**Week 14: Parallel Runtime**
```typescript
// Run v1 and v2 side-by-side
const v1 = new QaraV1();
const v2 = new QaraV2();

async function execute(input) {
  const [r1, r2] = await Promise.all([
    v1.execute(input),
    v2.execute(input)
  ]);
  
  // Log divergence
  if (differ(r1, r2)) {
    logDivergence(input, r1, r2);
  }
  
  return r1;  // Safe fallback
}
```

**Week 15: Validation Suite**
```bash
# Comprehensive validation
# - 1000+ test cases
# - All skill combinations
# - Edge cases
# - Error scenarios

# Success: 100% parity
```

**Week 16: Migration Scripts**
```bash
#!/bin/bash
# migrate-to-v2.sh

# 1. Backup current system
# 2. Transpile skills
# 3. Run validation
# 4. Deploy v2 parallel
# 5. Monitor for 1 week
# 6. Cutover to v2
```

**Deliverables:**
- ✅ Auto-transpiler for skills
- ✅ Parallel runtime framework
- ✅ 1000+ test validation suite
- ✅ One-click migration scripts

---

### Month 5: Production Deployment (Weeks 17-20)

**Goal:** V2 in production with monitoring

**Week 17: Canary Deployment**
```typescript
// 10% traffic to v2
const USE_V2 = Math.random() < 0.1;

// Monitor:
// - Error rates
// - Latency
// - User feedback

// Rollback threshold: >5% error rate
```

**Week 18: 50% Traffic**
```typescript
// Increase to 50% if canary successful
const USE_V2 = Math.random() < 0.5;

// Continued monitoring
// Performance comparison
```

**Week 19: 100% Cutover**
```typescript
// V2 is default
// V1 as fallback only

try {
  return await v2.execute(input);
} catch (err) {
  console.warn('V2 failed, using V1');
  return await v1.execute(input);
}
```

**Week 20: V1 Deprecation**
```bash
# After 1 week with zero v1 usage:
# - Archive v1 code
# - Update documentation
# - Remove v1 dependencies
```

**Deliverables:**
- ✅ V2 in production (100% traffic)
- ✅ Zero regression incidents
- ✅ Performance targets met
- ✅ V1 fully deprecated

---

### Month 6: Optimization & Polish (Weeks 21-24)

**Goal:** Production excellence

**Week 21: Performance Tuning**
```typescript
// Profile hot paths
// Optimize slow queries
// Reduce memory usage
// Improve caching

// Target:
// - p50 latency: <100ms
// - p99 latency: <500ms
// - Memory: <200MB
```

**Week 22: Advanced Plugins**
```typescript
// Build:
// - Multi-model ensemble
// - Predictive pre-loading
// - Smart context pruning
// - Auto skill generation (experimental)
```

**Week 23: Documentation**
```markdown
# Complete:
# - Migration guide
# - API reference (generated)
# - Plugin development guide
# - Best practices
# - Troubleshooting

# Update:
# - CONSTITUTION.md (v2 principles)
# - ARCHITECTURE.md (v2 design)
# - README.md (getting started)
```

**Week 24: Community Release**
```bash
# Prepare for public release:
# - Sanitize examples
# - Create starter templates
# - Write tutorials
# - Set up contribution guidelines

# Launch blog post and demo
```

**Deliverables:**
- ✅ Sub-100ms p50 latency
- ✅ Advanced plugin ecosystem
- ✅ Complete documentation
- ✅ Public release ready

---

## Risk Management

### Risk 1: V2 Breaks Current Workflows

**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Parallel run for 4 weeks minimum
- Comprehensive test suite (1000+ cases)
- Gradual traffic increase (10% → 50% → 100%)
- V1 fallback always available
- Quick rollback procedure (<5 min)

---

### Risk 2: Performance Targets Not Met

**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**
- POC validates core assumptions (Month 1)
- Continuous benchmarking
- Performance budgets enforced
- Profiling and optimization sprint (Week 21)
- Go/No-Go decision point after POC

---

### Risk 3: Migration Takes Too Long

**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**
- Auto-transpiler handles 90% of work
- Focus on 5 essential skills first
- Other skills migrate gradually
- Non-critical skills can stay in v1
- Clear prioritization (80/20 rule)

---

### Risk 4: User Resistance to Change

**Likelihood:** Low  
**Impact:** Low  
**Mitigation:**
- User experience stays identical
- Performance improvements are obvious
- Comprehensive documentation
- Migration is automatic (no user action)
- V1 compatibility layer if needed

---

### Risk 5: Vendor Lock-in to OpenAI/Anthropic

**Likelihood:** Low (by design)  
**Impact:** High (if occurs)  
**Mitigation:**
- LLM abstraction layer from day 1
- Support multiple providers
- Local model option
- Graceful degradation
- Regular testing with alternative LLMs

---

## Success Metrics

### Technical Metrics

| Metric | Baseline (v1) | Target (v2) | Measured By |
|--------|---------------|-------------|-------------|
| Routing latency | 1-3s | <10ms | Percentile tracking |
| Context load time | 0.5-2s | <50ms | Percentile tracking |
| Total latency (simple) | 3-15s | <200ms | End-to-end timer |
| Token usage (routing) | 1K-10K | 0 | Token counter |
| Token usage (context) | 1K-5K | 200-500 | Token counter |
| Routing accuracy | ~95% | 100% | Test suite |
| Test coverage | ~0% | >90% | Code coverage |
| Code size | 15K+ lines | 5K lines | Line counter |

### User Experience Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Perceived latency | <1s | User surveys |
| Error rate | <5% | Error logs |
| User satisfaction | >90% | Surveys |
| Time to first result | <500ms | Streaming metrics |

### Business Metrics

| Metric | Target | Measured By |
|--------|--------|-------------|
| Development velocity | +50% | Story points/sprint |
| Maintenance burden | -70% | Hours/week |
| New skill development | +100% | Skills/month |
| System reliability | >99% | Uptime monitoring |

---

## Decision Points

### Go/No-Go Gates

**Gate 1: After Month 1 (POC)**
- ✅ 100x faster routing demonstrated
- ✅ TypeScript skills are testable
- ✅ Output parity with v1
- ❌ If any critical issue → Reassess approach

**Gate 2: After Month 3 (Feature Complete)**
- ✅ All essential skills ported
- ✅ Performance targets met
- ✅ Test coverage >90%
- ❌ If delayed > 2 weeks → Extend timeline

**Gate 3: After Month 4 (Pre-Production)**
- ✅ 1000+ test cases passing
- ✅ Zero critical bugs
- ✅ Monitoring in place
- ❌ If >10 P0 bugs → Delay deployment

**Gate 4: After Month 5 (Production)**
- ✅ 100% traffic on v2
- ✅ Error rate <5%
- ✅ User satisfaction >85%
- ❌ If error rate >10% → Rollback

---

## Immediate Next Steps (Week 1)

### Day 1-2: Setup

```bash
# Create v2 workspace
mkdir -p qara-next/{packages,skills,plugins}

# Initialize packages
cd qara-next/packages
bun create core
bun create sdk
bun create cli

# Setup monorepo
# - Shared types
# - Build scripts
# - Test framework
```

### Day 3-4: Build POC Router

```typescript
// packages/core/src/router.ts
class Router {
  private trie: TrieNode;
  
  constructor(skills: Skill[]) {
    this.trie = this.buildTrie(skills);
  }
  
  route(input: string): Skill | null {
    // Implement trie matching
    // Target: <1ms
  }
}

// Test
test('router finds exact match', () => {
  const router = new Router([blogSkill]);
  const result = router.route('write blog about AI');
  expect(result).toBe(blogSkill);
  expect(performance.now() - start).toBeLessThan(1);
});
```

### Day 5: Port One Skill

```typescript
// skills/blog/skill.ts
export default class BlogSkill extends Skill {
  id = 'blog';
  triggers = ['write blog', 'publish blog'];
  
  async write(ctx: SkillContext) {
    // Implementation
  }
}

// Test without AI
test('writeBlog generates draft', async () => {
  const skill = new BlogSkill();
  const result = await skill.write({
    input: 'write blog about AI',
    llm: mockLLM
  });
  expect(result.success).toBe(true);
});
```

### Day 6-7: Benchmark & Report

```bash
# Run benchmarks
bun run benchmark

# Results:
# V1 routing: 1,247ms average
# V2 routing: 0.8ms average
# Improvement: 1,559x

# Generate report
bun run report

# Decision: Go/No-Go for Month 2
```

---

## Resource Requirements

### Engineering Time

| Phase | Duration | FTE Required |
|-------|----------|--------------|
| POC (Month 1) | 4 weeks | 1 engineer |
| Core (Month 2) | 4 weeks | 1-2 engineers |
| Features (Month 3) | 4 weeks | 1-2 engineers |
| Migration (Month 4) | 4 weeks | 1 engineer |
| Deploy (Month 5) | 4 weeks | 1 engineer |
| Polish (Month 6) | 4 weeks | 1 engineer |
| **Total** | **24 weeks** | **~1.5 FTE avg** |

### Infrastructure

- **Development:** Local machines (existing)
- **Testing:** CI/CD pipeline (GitHub Actions - free)
- **Vector DB:** Chroma (self-hosted - free) or Pinecone (starter - $70/mo)
- **Monitoring:** Self-hosted observability app (existing)
- **Total cost:** $0-70/month

---

## Conclusion

**The Opportunity is Clear:**

- 10x faster routing
- 3x less code to maintain
- 100% deterministic behavior
- Runtime-agnostic architecture
- Production-grade reliability

**The Path is Proven:**

- Incremental migration (low risk)
- Parallel validation (zero disruption)
- Quick rollback (if needed)
- Clear success metrics
- Realistic timeline (6 months)

**The Decision:**

Start Month 1 POC immediately. After Week 4, assess results and decide whether to proceed with full implementation.

**Expected Outcome:**

A production-grade AI infrastructure that scales from personal use to enterprise deployment, with the reliability and performance of traditional software systems combined with the flexibility of AI.

---

**Next Action:** Create POC workspace and begin Day 1 setup.

---

**Document Version:** 1.0  
**Created:** 2025-12-01  
**Review:** After each month milestone  
**Owner:** Jean-Marc Giorgi
