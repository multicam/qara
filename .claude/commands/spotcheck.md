# Spotcheck: Verify Agent Output Quality

After parallel agent dispatches, verify the quality and consistency of results.

## Instructions

1. **Collect all agent results** from the most recent parallel dispatch
2. **Cross-check for contradictions** between agent outputs
3. **Verify file references** — confirm that any files mentioned by agents actually exist
4. **Check for hallucinations** — sample 2-3 specific claims and verify against the codebase
5. **Assess completeness** — did each agent address all parts of their assigned task?

## Verification Steps

For each agent result:
- Read any files the agent claims to have found or analyzed
- Confirm line numbers and code snippets match the actual codebase
- Flag any discrepancies or unsubstantiated claims

## Output Format

```
## Spotcheck Results

### Agent: [name]
- **Accuracy:** [PASS/FAIL] — [brief note]
- **Completeness:** [PASS/PARTIAL/FAIL] — [brief note]
- **Issues:** [list any problems found, or "None"]

### Summary
- Agents checked: N
- Passed: N
- Issues found: [list or "None"]
- Recommendation: [proceed / re-run agent X / manual review needed]
```

## When to Use

- After any parallel dispatch of 2+ agents
- When agent results will drive implementation decisions
- Before acting on agent-sourced information in unfamiliar code areas
