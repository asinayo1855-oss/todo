# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is in the planning stage for a personal TODO list web app. No source code, build tooling, or dependencies exist yet — the only content is a Korean-language spec document.

- `TO Do List/기획서.md` — the project spec (형태/기능/저장 방식 등)
- `docs/` — empty, reserved for future documentation

There are no build, lint, or test commands yet because no code has been written.

## Planned scope (from 기획서.md)

- **형태 (form)**: web app (HTML/CSS/JS), runs in-browser
- **사용 범위 (audience)**: single personal user, no login/accounts
- **데이터 저장 (storage)**: Supabase Postgres (`todos` table) via `@supabase/supabase-js`, called directly from the client with the public anon key — no custom backend/server. RLS is enabled with a permissive anon policy since there's no login. (Theme preference still uses localStorage.)
- **핵심 기능 (core features)**:
  - CRUD for todo items (add/edit/delete/complete)
  - Due dates & reminders
  - Categories/tags
  - Priority levels
- **고려 중인 추가 기능 (candidate features, not yet decided)**: search/filter, sort options, dark mode, recurring todos, progress display, JSON export/import

When implementation begins, it should follow this spec: a client-only static web app persisting state to `localStorage`, with no server or account system unless the user changes that decision.
