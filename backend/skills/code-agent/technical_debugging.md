# Skill: technical_debugging

## Owner Agent
code-agent

## Purpose
Diagnose and resolve software implementation errors.

## Best For
- TypeScript errors
- Runtime errors
- Prisma issues
- Backend route errors
- React component errors
- API problems
- Build errors
- npm/Vite issues

## Allowed Intent Examples
- "debug error Prisma migration"
- "kenapa npm run dev error"
- "fix TypeScript error ini"
- "cek kenapa route API gagal"
- "bantu analisa stack trace"

## Input Contract
The user should provide:
- Error message
- Related file path
- Current code snippet
- Expected behavior

## Output Contract
The output should include:
- Root cause
- Step-by-step fix
- Full code when requested
- Safety notes if needed

## Boundary Notes
This skill should not generate marketing copy or image prompts unless explicitly related to UI implementation.

## Future RAG Use
This skill can retrieve project architecture, known bugs, Prisma schema, route docs, and previous fixes.