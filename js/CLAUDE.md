# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `bun run build`
- Lint: `bun run lint`
- Format: `bun run format`
- Test all: `bun test`
- Test single file: `bun test src/path/to/file.spec.ts`
- Test specific test: `bun test -t "test description pattern"`

## Code Style

- Use TypeScript with strict type checking
- Follow ESLint rules, particularly `@typescript-eslint/strict-boolean-expressions`
- Use explicit null/undefined checks instead of truthy/falsy patterns (e.g., `if (value === null)` not `if (!value)`)
- Format code with Prettier
- Use async/await for asynchronous code
- Export types from dedicated type files
- Use camelCase for variables/functions, PascalCase for classes/interfaces
- Organize imports: built-ins first, then external modules, then local imports
- For class properties, define private properties with leading underscore