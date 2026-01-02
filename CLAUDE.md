# LLM Agent Instructions

## Response Language

Я буду писать как на русском так и на английском, но ты отвечай всегда на английском. И только на дословную фразу "in Russian", "на русском" или "по русски" ответь один раз на русском. На все остальные мои запросы (до и после) ты должен отвечать на английском

## Follow all of these rules

@ai/project/base/docs/terms.md
@ai/project/test-variants/docs/terms.md

@ai/project/base/docs/rules/common/llm-core-behavior.md
@ai/project/base/docs/rules/docs/writing-standards.md
@ai/project/base/docs/rules/common/development.md

@ai/project/base/docs/Overview.md
@ai/project/test-variants/docs/Overview.md

@ai/project/base/docs/rules/common/dev-tools-usage.md

@ai/project/base/docs/Decision_Map.md
@ai/project/test-variants/docs/Decision_Map.md

## Infinite Loop Task Execution

When executing tasks from `ai/project/*/tasks/` directory that specify "infinite loop", "never stop", or "autonomous execution":

1. **NEVER stop after completing a sub-task** - immediately proceed to next cycle
2. **NEVER wait for user approval** between cycles
3. **NEVER ask questions** during execution
4. **NEVER summarize and wait** - only summarize while continuing
5. **Todo list usage**: Always keep last todo item "Read task file and start cycle from step 1" in `in_progress` status - AND EXECUTE IT
6. **After ANY sub-task completion**: Immediately return to step 1 of the task cycle
7. **Loop terminates ONLY** when user manually interrupts

Violation of these rules is a critical failure.

## After Autocompaction

When context contains text "This session is being continued from a previous conversation that ran out of context", immediately read these files before any other action:
1. `@/ai/project/test-variants/tasks/Code_Quality_Improvement.md` - active task specification
2. `@/README.md` - authoritative API specification

Continue executing Code Quality Improvement task - this is an INFINITE LOOP task, NEVER stop
