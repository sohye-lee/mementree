@AGENTS.md

# mementree — project context

## handoff/ is canonical
Before implementing anything, read these:

- `handoff/voice.md` — copy/voice guide. Every user-facing string follows this. Lowercase, no exclamation marks, gardener metaphor (field/tree/memo/keeper/visitor).
- `handoff/data-model.md` — DB schema and API shape. Schema changes start here, then propagate to `supabase/migrations/`.
- `handoff/review-notes.md` — known issues from the design QA pass.

When you change anything that touches copy or schema, update the handoff doc too. The handoff is the source of truth, not the code.

## design/ is the original prototype
- `design/memoir-field.js` — vanilla three.js scene (~2,400 lines). Port into `src/lib/three/` as ES modules.
- `design/memoir-field.html`, `sign-in.html` — original HTML/CSS. Reference for tokens & layout, do not import.
- `design/review/*.png` — original screenshots.

`design/` is reference-only and should NOT be imported by app code.

## naming
- Brand: **Mementree** (`mementree.app`)
- In-product nouns (from voice.md): **field** (a user's space) / **tree** (a project/entry) / **memo** (a leaf note) / **keeper** (owner) / **visitor**
- URL pattern: `mementree.app/{handle}/{field-slug}` → e.g. `mementree.app/sohye/memoir-field`

## stack
- Next.js 16 (App Router) + TypeScript + React 19
- Supabase (Postgres + Auth + Realtime) — schema in `supabase/migrations/`
- Vercel for hosting
- **No Tailwind.** Use CSS Modules with tokens from `src/styles/tokens.css`.
- Three.js as ES module (npm `three`), mounted in a single client component. No React Three Fiber.

## v1 scope (current)
Personal use only — keeper plants and tends their own field.

Out of scope for v1 (schema supports them, UI deferred):
- Share modal / access modes (private/unlisted/public)
- Visitor permissions (read/memo/plant)
- Password-protected fields
- Multi-field per user (schema allows it; UI shows one field)

When implementing a feature, ask: "is this in v1 scope?" If no, leave a TODO and move on.

## code conventions

- Centralize all user-facing strings in `src/lib/copy.ts`. No hardcoded copy in components.
- Keep `src/lib/three/` framework-agnostic (no React imports). Components mount it.
- Postgres column names: `description` not `desc` (reserved word). TS layer maps to handoff's `desc` if needed.
- IDs: server-side uuid. Client never invents IDs.
- Soft delete is first-class: `state='withered'` for trees, `state='fallen'` for memos. 30-day purge via Supabase cron.
