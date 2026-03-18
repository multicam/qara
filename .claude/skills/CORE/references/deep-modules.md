# Deep Modules

From John Ousterhout's "A Philosophy of Software Design". Cross-cutting principle used by: testing, architecture, interface design, code review.

## The Principle

**Deep module** = small interface + significant implementation

```
┌─────────────────────┐
│   Small Interface   │  Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  Complex logic hidden inside
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + thin implementation (avoid)

```
┌─────────────────────────────────┐
│       Large Interface           │  Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  Just passes through
└─────────────────────────────────┘
```

## Design Questions

When designing any module, ask:

- Can I reduce the number of methods/entry points?
- Can I simplify the parameters?
- Can I hide more complexity inside?
- Is the cognitive load on the caller proportional to what they get back?

A module with 3 methods hiding 500 lines of complexity is deep. A module with 15 methods wrapping 15 one-liners is shallow. Prefer the former.

## How to Apply

- **Architecture:** Prefer fewer, deeper services over many thin wrappers
- **Interface design:** Minimize surface area, maximize hidden complexity
- **Testing:** Deep modules need fewer tests (small interface = fewer paths to verify)
- **Refactoring:** Combine shallow modules into deeper ones; extract deep modules from god objects
- **Code review:** Flag shallow modules as a design smell

## Attribution

Based on "A Philosophy of Software Design" by John Ousterhout. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills).
