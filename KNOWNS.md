# KNOWNS

Canonical repository guidance for agents working in this project.

## Table of Contents

- [Source of Truth](#source-of-truth)
- [TL;DR](#tldr)
- [Repo Mental Model](#repo-mental-model)
- [How Agents Should Read This File](#how-agents-should-read-this-file)
- [Tool Selection](#tool-selection)
- [Memory Usage](#memory-usage)
- [Critical Rules](#critical-rules)
- [Git Safety](#git-safety)
- [Context Retrieval Strategy](#context-retrieval-strategy)
- [References](#references)
- [Common Mistakes](#common-mistakes)

## Source of Truth

- `KNOWNS.md` is the canonical repo-level guidance file.
- `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are compatibility shims.
- If guidance appears in multiple places, follow this precedence order:
  1. System instructions
  2. Developer instructions
  3. `KNOWNS.md`
  4. Compatibility shim files
  5. Other repository docs

## TL;DR

- Read `KNOWNS.md` first.
- Always use `/caveman` mode (terse, technical, no fluff, neutral "bạn - tôi").
- Use Knowns as the memory layer and single source of truth (`.knowns/`).
- Search before reading; read only relevant docs and code.
- Never manually edit Knowns-managed task or doc markdown without tool awareness.
- Plan before implementation unless explicitly overridden.
- Validate before marking work complete.

## Repo Mental Model

- **Project**: `tdytools-gplx` (TdyTools - 600 Câu hỏi Sát hạch Giấy phép Lái xe).
- **Core Input**: `assets/600-cau-hoi-sat-hach.pdf`.
- **Knowns Directory**: `.knowns/` contains configurations, architecture, decisions, patterns, memories, and tasks.

## Tool Selection

- Prefer Knowns CLI / MCP for docs, tasks, memory, and decisions:
  ```bash
  knowns doc list --plain
  knowns task list --plain
  knowns search "query" --plain
  ```
- Use `run_command`, `view_file`, and code edit tools for file manipulation.

## Memory Usage

- Session start: load `.knowns/memory/session_brief.md`, `.knowns/handoff.md`, and `.knowns/memory/tasks_state.md`.
- After task: update decisions in `.knowns/decisions.md` and patterns in `.knowns/patterns.md`.

## Critical Rules

- Always verify data with UTF-8 / UTF-8 with BOM awareness where applicable.
- In-place extraction / processing must preserve question accuracy (đáp án đúng, điểm liệt).
