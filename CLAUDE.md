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

## After Autocompaction

When context contains text "This session is being continued from a previous conversation that ran out of context", immediately read these files before any other action:
1. `@/ai/project/test-variants/tasks/README_Compliance.md` - active task specification
2. `@/README.md` - authoritative API specification

Continue executing README_Compliance task
