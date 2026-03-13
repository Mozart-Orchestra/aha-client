# Unified Auth Team Flow QA

## Goal

Validate the default local happy path:

1. `aha auth login`
2. browser opens `terminal/connect`
3. web approves terminal auth
4. CLI stores credentials and auto-starts daemon
5. browser waits for the target machine to be ready
6. browser redirects to `teams/new`
7. team creation auto-spawns agents on the linked machine

## Local Prerequisites

- `happy-server` running on `http://localhost:3005`
- `kanban` web running on `http://localhost:8081`
- local browser session already signed into the same local server account

## Verification Command

```bash
cd /Users/swmt/happy0313/aha-cli
AHA_HOME_DIR=/Users/swmt/happy0313/.tmp-aha-unified-smoke \
AHA_SERVER_URL=http://localhost:3005 \
AHA_WEBAPP_URL=http://localhost:8081 \
./bin/aha.mjs auth login --force
```

## Expected CLI Output

- auth URL opens automatically
- auth URL uses hash params, not query params:

```text
http://localhost:8081/terminal/connect#key=...&next=%2Fteams%2Fnew&machineId=...
```

- after browser approval:

```text
✓ Authentication successful
  Machine ID: ...
  Daemon: started in background
```

## Expected Browser Flow

1. `terminal/connect` shows the terminal approval page.
2. Clicking accept redirects to `/teams/new?machineId=...`.
3. The machine list shows the linked machine as online.
4. Creating a team with a valid working directory succeeds.
5. The resulting team page shows spawned agents online.

## Minimal Smoke Test Inputs

- Team name: `Unified Auth Smoke Test`
- Team goal: any short text
- Working directory: `/Users/swmt/happy0313`

## Regressions This QA Must Catch

### 1. Wrong backend on local web

Symptom:

- terminal approval talks to `top1vibe.com` instead of local server

Cause:

- persisted custom server URL overrides localhost

Expected fix:

- localhost web prefers local server by default
- changing server URL clears stale auth state

### 2. Expo web hash routing breaks handoff

Symptom:

- `terminal/connect` fails to decode the public key

Cause:

- Expo web hash routing swallows query params into the hash fragment

Expected fix:

- encode `key`, `next`, and `machineId` together inside the hash
- parser must tolerate old `#key=...?...` legacy shape

### 3. Team create sees machine offline after auth

Symptom:

- browser reaches `teams/new` but create fails with offline-machine validation

Cause:

- server emitted online ephemerals but did not persist `machine.active=true`

Expected fix:

- machine-scoped websocket connect updates DB `active=true` and `lastActiveAt`

### 4. Auto-spawn RPC fails after team creation

Symptom:

- team gets created but zero agents spawn

Cause:

- kanban used `spawn-happy-session` while daemon only registered `spawn-aha-session`

Expected fix:

- standardize on `spawn-aha-session`
- keep daemon-side legacy alias for compatibility
