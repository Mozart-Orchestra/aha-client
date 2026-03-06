# Repository Guidelines

## Workspace Context First

Before changing code here, read these files in order:

1. `../AGENTS.md`
2. `../docs/context/00-system-map.md`
3. `../docs/context/01-contracts.md`
4. `../docs/context/03-current-focus.md`
5. This file
6. `CLAUDE.md`

Do not begin by scanning the whole workspace.

## Project Structure & Module Organization
Expo Router screens live in `sources/app`, with shared UI in `sources/components` and modal shells under `sources/modal`. Domain logic (encryption, sync, realtime, tracking) sits in dedicated `sources/*` folders so Expo and `src-tauri` reuse them through the `@/` alias defined in `tsconfig.json`. Assets, copy, and theming files live in `sources/assets`, `sources/text`, and `sources/theme.*`; automation sits in `sources/scripts/`, docs stay in `docs/`, and `public/` contains served artifacts.
Team creation and relaunch flows should converge through `sources/features/teams/wizard/routes.ts` and `sources/app/(app)/teams/new-wizard.tsx`; keep `sources/app/(app)/teams/new.tsx` as a compatibility redirect rather than expanding the legacy form.
Routes that deep-link into `sources/app/(app)/new/index.tsx` should carry launch defaults through `storeTempData(...)` / `dataId` and may prefill `machineId`, `path`, `agentType`, `sessionType`, `sessionName`, and `sessionRole`; treat `/new` as the canonical hydrator for those values.

## Build, Test, and Development Commands
- `yarn start` launches Expo locally; `yarn start:local-server` points the client at `http://localhost:3005` with verbose logging.
- `yarn android`, `yarn ios`, `yarn ios:connected-device`, and `yarn web` create device-specific builds; rerun `yarn prebuild` when native dependencies shift.
- `yarn test --coverage` executes Vitest with V8 coverage output, and `yarn typecheck` runs `tsc --noEmit`.
- `yarn generate-theme` refreshes token files, while `yarn ota` and `yarn ota:production` publish preview and production over-the-air updates.

## Coding Style & Naming Conventions
Use strict TypeScript with 4-space indentation, single quotes, and required semicolons as shown in `sources/app/_layout.tsx`. Components and routes use PascalCase (`sources/app/(modals)/SettingsSheet.tsx`), and hooks start with `use`. Prefer `@/` imports instead of relative walks, gate divergent behavior with `Platform.select`, keep constants in `sources/constants`, and rerun `yarn postinstall` whenever `patches/` change.

## Testing Guidelines
Vitest discovers specs via `sources/**/*.{spec,test}.ts`; keep tests beside the feature they guard and borrow fixtures from `sources/dev` when mocking realtime or sync flows. Run `yarn test --coverage` plus `yarn typecheck` before every pull request, aim for >=80% statement coverage on touched files, and reference the console or `coverage/` HTML reports when results need review.

## Commit & Pull Request Guidelines
History shows GitHub merge commits such as `Merge pull request #151 ...`, so keep feature branches focused (`feature/reliable-sync`) and squash when it helps reviewers. Write imperative commits that describe the user-facing impact, reference issue IDs when applicable, and update `CHANGELOG.md` whenever `sources/scripts/parseChangelog.ts` would surface the change. Pull requests must link issues, list test commands (`yarn test --coverage && yarn typecheck`), attach UI screenshots or recordings, and call out risky files such as `app.config.js`, `eas.json`, `src-tauri/tauri.conf.json`, or `sources/text`.

## Security & Configuration Tips
Never commit secrets from Expo profiles, Google services, or RevenueCat; `.env` files stay local and `app.config.js` already loads them. Keep `PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` disabled outside local debugging so the remote logging patch never runs in production. For Tauri updates, audit `src-tauri/tauri.conf.json` allowlists and clean stray assets from `public/` before committing.
