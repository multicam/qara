---
description: load-dynamic-requirements
model: haiku
---

# load-dynamic-requirements

# **DYNAMIC REQUIREMENTS LOADING INSTRUCTIONS**

## 🚨🚨🚨 STEP 0: MANDATORY BASE CONTEXT LOAD - DO THIS IMMEDIATELY! 🚨🚨🚨

**YOU MUST IMMEDIATELY EXECUTE THE FOLLOWING READ COMMAND:**

```bash
read ${PAI_DIR}/PAI.md
```

**THIS IS AN IMPERATIVE DIRECTIVE - EXECUTE IT NOW!**
- ⛔ STOP! Do not continue reading until you execute the read command above
- ⛔ The variable ${PAI_DIR} resolves to the PAI_DIRECTORY folder
- ⛔ This context MUST be loaded before ANY other action
- ✅ EXECUTE THE READ COMMAND IMMEDIATELY using the Read tool

**Note: ${PAI_DIR} is an environment variable that points to the PAI_DIRECTORY folder**

🚧 **HALT AND EXECUTE THE READ COMMAND BEFORE PROCEEDING** 🚧

## 🚨 OVERVIEW: TWO TYPES OF DYNAMIC LOADING

**This system dynamically loads TWO types of resources based on user intent:**
1. **CONTEXT FILES** - Domain-specific knowledge and instructions
2. **AGENTS** - Specialized task performers

## 🚨 CRITICAL: HOW TO INTERPRET THESE INSTRUCTIONS

**YOU MUST understand the SEMANTIC MEANING of the user's prompt, not search for exact string matches.**

When you receive a user prompt:

1. **PARSE the prompt to understand its INTENT and MEANING**
2. **THINK about which category below matches what the user is REALLY asking for**
3. **DO NOT do string matching** - the examples are to help you understand the TYPE of request
4. **LOAD the appropriate context based on semantic understanding**
5. **FOLLOW the instructions for that category immediately**

**Examples of semantic understanding:**
- User says "help me with my site" → This MEANS website context (even without the word "website")
- User says "what's new with AI" → This MEANS research context (even without the word "research")
- User says "how's the business doing" → This MEANS Unsupervised Learning context
- User says "I need to understand X" → This MEANS research context
- User says "fix this issue" → Could mean website, development, or debugging based on context

**The patterns below are EXAMPLES to guide your semantic understanding, NOT exact strings to match.**

## CONTEXT LOADING RULES

READ: .claude/skills/CORE/workflows/context-loading-rules.md

**For complete context loading rules with all examples and special instructions, see the workflow file above.**

### Quick Reference Summary

| User Intent | Context Files to Load | Agent to Use | Special Notes |
|-------------|----------------------|--------------|---------------|
| Alma company | `${PAI_DIR}/context/projects/Alma.md` | None | |
| Live conversations/meetings | `${PAI_DIR}/commands/get-life-log.md` | None | Limitless.ai recordings |
| Philosophical/conversational | None | None | Switch to conversational mode |
| Research/information gathering | None | researcher | |
| Security/pentesting | None | pentester | |
| Financial/expenses | `${PAI_DIR}/context/life/expenses.md`, `${PAI_DIR}/context/life/finances/` | None | Use answer-finance-question command |
| Health/wellness | `${PAI_DIR}/Projects/Life/Health/CLAUDE.md` | None | |
| Benefits/perks | `${PAI_DIR}/context/benefits/CLAUDE.md` | None | Credit cards, dining, hotels |
| Unsupervised Learning business | `${PAI_DIR}/context/unsupervised-learning/CLAUDE.md` | None | Default for "the business" |
| Web dev/visual testing | `${PAI_DIR}/context/tools/CLAUDE.md` | designer | Use Playwright |
| Capture learning | Run capture-learning command | None | Document solutions |
| My content/opinions | None | None | Search past writing |
| Advanced web scraping | None | None | For difficult sites |

**Remember:** Parse semantic meaning, not exact strings. The examples in the full workflow file show the TYPE of request, not exact phrases to match.
