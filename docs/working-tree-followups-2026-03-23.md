# Working Tree Follow-ups — 2026-03-23

- Full `yarn typecheck` is still blocked by pre-existing errors in `sources/app/(app)/session/[id]/info.tsx` and `sources/components/team/TeamChatRoom.tsx`.
- Hook and integration tests for task import/export pass, but the test runner still emits `react-test-renderer` deprecation / `act(...)` environment warnings that should be cleaned up later.
- Run one browser-level verification pass for the rebuilt agent-creation flow, the new WeChat settings page, and the task export/import actions on web.
