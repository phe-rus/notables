---
name: code-structure
description: Refactor messy files, flat directories, and unclear module boundaries into a simple feature based project structure. Use for code organization requests or code-structure and structure invocations, preserving behavior.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Code structure

Organize the requested file, feature, or repository into cohesive modules with clear names and boundaries. Preserve behavior and keep the change proportional to the problem.

## Invocation

Use `$code-structure` or `/code-structure` where the client supports skill commands. Treat `/structure` or `#structure` as a request for this skill when supplied as an instruction. These are conversational aliases, not registered client commands.

If a path is supplied, focus on that path and its callers. Otherwise inspect the repository and choose a small, useful first area, explaining the scope before editing. A request to create this skill does not authorize executing its refactoring workflow.

## Structural principles

1. Group growing applications by feature or domain, such as `features/auth/` or `features/billing/`. Small scripts and tiny services can stay flat. Move code into shared modules when multiple features actually use it.
2. Give each module a clear public boundary. Use an explicit entry point such as `index.ts` or `mod.rs` when appropriate to the language and project. Export only what callers need, and keep internal helpers inside their owning feature. Avoid barrel files that introduce cycles or interfere with code splitting.
3. Follow repository naming conventions first. Otherwise use `kebab-case` for utilities and modules, and framework conventions for components. React component identifiers use `PascalCase`; filenames may use `kebab-case` when that is the project convention. Replace vague names like `utils.ts` and `helpers.ts` with responsibility names such as `format-currency.ts` or `verify-signature.ts`.
4. Treat 200 to 300 lines as a review signal. Split files with multiple responsibilities at meaningful boundaries. Keep a longer cohesive file when splitting would scatter one concept or add needless indirection. Place tests, types and styles near their owner, following existing test discovery conventions.

## Refactoring workflow

### 1. Inspect

Read applicable `AGENTS.md` instructions, package scripts and local conventions. Map the requested area with `rg --files`. Identify mixed responsibilities, flat directories, vague names, cross feature imports and cycles. Exclude generated files, vendored code and build output.

Read callers, exports, tests and framework discovery rules before choosing moves. Record existing failures from relevant checks for comparison.

### 2. Explain the target

Show a compact before and after tree for the affected files. Explain each boundary and why each rename or split helps. Preserve the project's framework and architecture. Refactoring authorization covers routine moves and splits. Ask only when a decision would change behavior, public contracts or the requested scope.

### 3. Refactor

Work in small coherent batches. Move or rename files, extract focused modules, and update every affected import, export and path reference, including dynamic imports, test mocks, configuration and documentation paths. Preserve framework route filenames, initialization order, side effects and public package exports.

Keep unrelated user changes intact. Avoid new dependencies, broad formatting changes and speculative abstractions. Search for old paths after each batch and inspect the diff for unintended behavior changes.

### 4. Verify

Run relevant import or type checks, lint, tests and build commands defined by the project. Complete required repository checks for larger changes. Add regression tests when behavior needs protection, rather than testing directory layout.

Finish when affected callers resolve, required checks pass or their specific blockers are reported, and the diff stays within scope. Report what moved or split, why it helps, checks run and remaining limitations. File organization alone does not establish production readiness.
