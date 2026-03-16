# Repository Guidelines

## Git Worktree Strategy (Multi-Feature Isolation)

When multiple agents or developers work on parallel features simultaneously, use `git worktree` to give each feature its own isolated working directory. This prevents accidental file cross-contamination between features.

### Why This Matters

Without worktrees, two agents editing `sources/text/_default.ts` simultaneously will conflict. With worktrees, each agent has its own checkout — they share the git object store but not the working tree.

### Setup Pattern

```bash
# From the kanban/ directory (the git root)
# Create isolated working trees for each feature branch
git worktree add ../kanban-feature-status-badges feature/status-badges
git worktree add ../kanban-feature-token-display  feature/token-display
git worktree add ../kanban-feature-agent-badges   feature/agent-badges

# Each directory is a full checkout — run Expo from there
cd ../kanban-feature-status-badges && yarn start
```

### Assignment Rules for Agents

| Branch | Directory | Who Works There |
|--------|-----------|-----------------|
| `feature/status-badges` | `../kanban-feature-status-badges` | sidebar agent |
| `feature/token-display`  | `../kanban-feature-token-display`  | session agent |
| `feature/agent-badges`   | `../kanban-feature-agent-badges`   | task agent |

**Critical**: Each agent only edits files in **its own worktree directory**. Never cross into another worktree.

### Merging Back

```bash
# When feature is ready, from main worktree:
git checkout main
git merge feature/status-badges --no-ff -m "feat: status sidebar count badges"

# Remove the worktree when done
git worktree remove ../kanban-feature-status-badges
git branch -d feature/status-badges
```

### When NOT to Use Worktrees

- Single-agent sessions (no parallel work) — overhead not worth it
- Hot fixes to main — branch directly
- Tiny 1-file changes — too much setup cost

### High-Risk Shared Files (Always Coordinate)

These files are modified by almost every feature; without worktrees they cause merge conflicts:
- `sources/text/_default.ts` — i18n keys (every feature adds keys)
- `sources/text/translations/*.ts` — all 6 language files
- `sources/sync/storageTypes.ts` — shared data types
- `sources/sync/storage.ts` — Zustand store

When two features must both touch these files, use worktrees + a designated "i18n merge agent" who integrates the translation additions from both branches before merging to main.


Expo Router screens live in `sources/app`, with shared UI in `sources/components` and modal shells under `sources/modal`. Domain logic (encryption, sync, realtime, tracking) sits in dedicated `sources/*` folders so Expo and `src-tauri` reuse them through the `@/` alias defined in `tsconfig.json`. Assets, copy, and theming files live in `sources/assets`, `sources/text`, and `sources/theme.*`; automation sits in `sources/scripts/`, docs stay in `docs/`, and `public/` contains served artifacts.

## Build, Test, and Development Commands
- `yarn start` launches Expo locally; `yarn start:local-server` points the client at `http://localhost:3005` with verbose logging.
- `yarn android`, `yarn ios`, `yarn ios:connected-device`, and `yarn web` create device-specific builds; rerun `yarn prebuild` when native dependencies shift.
- `yarn test --coverage` executes Vitest with V8 coverage output, and `yarn typecheck` runs `tsc --noEmit`.
- `yarn generate-theme` refreshes token files, while `yarn ota` and `yarn ota:production` publish preview and production over-the-air updates.

## Coding Style & Naming Conventions
Use strict TypeScript with 4-space indentation, single quotes, and required semicolons as shown in `sources/app/_layout.tsx`. Components and routes use PascalCase (`sources/app/(modals)/SettingsSheet.tsx`), and hooks start with `use`. Prefer `@/` imports instead of relative walks, gate divergent behavior with `Platform.select`, keep constants in `sources/constants`, and rerun `yarn postinstall` whenever `patches/` change.

## Fallback Policy
Fallbacks are allowed only for real boundary states, not to hide broken internal assumptions.

- Use fallbacks for genuine uncertainty: unauthenticated state, async sync gaps, backward compatibility with older data, and purely presentational placeholders.
- Do not use fallbacks to mask invariant failures: mixed IDs, parse failures, missing required fields, state-model conflicts, or invalid business preconditions.
- Temporary fallbacks added to unblock a feature must be revisited after the flow works end-to-end; tighten them into explicit errors, guards, or a cleaner data model.
- Before every commit, re-audit newly introduced fallbacks and remove or narrow any fallback that makes a broken state look like an empty-but-valid state.
- If a fallback affects diagnostics, routing ownership, team/session relationships, or board/task consistency, treat it as a stability issue and fix it before adding more patches on top.

## Testing Guidelines
Vitest discovers specs via `sources/**/*.{spec,test}.ts`; keep tests beside the feature they guard and borrow fixtures from `sources/dev` when mocking realtime or sync flows. Run `yarn test --coverage` plus `yarn typecheck` before every pull request, aim for >=80% statement coverage on touched files, and reference the console or `coverage/` HTML reports when results need review.

## Commit & Pull Request Guidelines
History shows GitHub merge commits such as `Merge pull request #151 ...`, so keep feature branches focused (`feature/reliable-sync`) and squash when it helps reviewers. Write imperative commits that describe the user-facing impact, reference issue IDs when applicable, and update `CHANGELOG.md` whenever `sources/scripts/parseChangelog.ts` would surface the change. Pull requests must link issues, list test commands (`yarn test --coverage && yarn typecheck`), attach UI screenshots or recordings, and call out risky files such as `app.config.js`, `eas.json`, `src-tauri/tauri.conf.json`, or `sources/text`.

## Security & Configuration Tips
Never commit secrets from Expo profiles, Google services, or RevenueCat; `.env` files stay local and `app.config.js` already loads them. Keep `PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` disabled outside local debugging so the remote logging patch never runs in production. For Tauri updates, audit `src-tauri/tauri.conf.json` allowlists and clean stray assets from `public/` before committing.

## Agents Marketplace Page (/agents)

Route: `sources/app/(app)/agents/index.tsx`
API client: `sources/utils/genomeHub.ts`
Server: genome-hub at `EXPO_PUBLIC_GENOME_HUB_URL` (default: http://localhost:3006)

### Features
- **Agents tab**: Browse/search individual agent genomes with category filters
- **Corps tab**: Browse team templates (category='corps'), shows member list
- Search with 300ms debounce
- Category filters: All / Coordination / Support / Execution
- Dark/light theme support via Unistyles

### Corps cards
- Orange left border to distinguish from agent cards
- Shows member chips (genome name/roleAlias)
- Parsed via `parseCorpsSpec()` from spec JSON
