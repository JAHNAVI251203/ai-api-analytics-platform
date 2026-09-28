---
name: lean-operation
description: Make small, evidence-based backend changes in API Sentinel.
---

# Lean Operation — Backend

## Use this approach

1. Read the route, controller, model/service, and any job that owns the
   behavior before editing.
2. Check `git status`; unrelated edits are user-owned.
3. Identify the smallest change that preserves existing HTTP, database, cache,
   queue, and Socket.IO contracts.
4. Verify with the narrowest safe command or inspection.

## Prefer what already exists

- Extend the current route -> controller -> model/service layout rather than
  introducing repositories, frameworks, or new layers for one feature.
- Reuse the existing `pg` pool, Redis client, BullMQ queue, and `AIService`.
- Use existing cache-key families and event/room names instead of parallel
  mechanisms.
- Keep a change in its domain. Do not refactor unrelated controllers, prompts,
  queries, or deployment configuration while fixing one behavior.

## Verify assumptions

- Trace request paths from `src/server.ts` to the route before changing a URL.
- Inspect `src/migrations/init.ts` before changing database fields or IDs.
- Confirm a script's target before running it: integration, seed, load, and AI
  scripts can contact external services or mutate data.
- Debug from observed input, response, logs, query results, cache state, and
  job events; do not paper over failures with broad catch blocks.

## Avoid

- New dependencies without a demonstrated need.
- Premature abstractions or large style-only rewrites.
- Raw request values in SQL, cache keys, logs, or error responses.
- Treating Redis cache data as durable database state.
