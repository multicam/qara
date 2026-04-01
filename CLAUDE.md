# Qara Project Configuration

PATH includes: ~/.local/bin:~/.cargo/bin:~/.bun/bin:~/.local/share/mise/shims:/usr/local/bin:/usr/bin:/bin

## Planning

Plan mode is for quick scoping. For complex, multi-phase work use `/create_plan` — it has a structured reasoning protocol, parallel research agents, and pre-flight validation.

## Delegation

When you identify 3+ independent subtasks (e.g., reading 3 unrelated files, running 3 parallel searches, or researching 3 different topics), prefer spawning Agent tools in parallel rather than running them sequentially. Data shows delegation at ~2% of tool calls regardless of workload — this should scale with session complexity.

## Guides

Guides load just-in-time via CORE's Documentation Index — not included here to save context tokens.
