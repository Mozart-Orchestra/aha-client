# V4 Iteration Changelog

Date: 2026-02-28  
Status: Complete (5/5, 100%)

## Scope

V4 focused on user-facing rating experience upgrades and final documentation closure.

## Delivered Items

- `V4-UX-001` Rating Toast notification (`RatingToast.tsx`, `useRatingToast.ts`)
- `V4-UX-002` Rating dashboard visualization (`RatingDashboard.tsx`, `RatingRadarChart.tsx`)
- `V4-UX-003` "My Ranking" highlight with trend indicators (`LeaderboardItem.tsx`)
- `V4-UX-004` Role statistics display (`RoleStatsCard.tsx`)
- `V4-DOC-001` Documentation closure (README, changelog, architecture decisions)

## V4 Architecture Decisions

### ADR-V4-001: Toast as non-blocking completion feedback

- Decision: Task completion feedback is shown via toast instead of modal.
- Reason: Keep user in flow and reduce interruption after task actions.
- Impact: Supports auto-dismiss (5s), manual close, and quick entry to rating flow.

### ADR-V4-002: Dashboard composition with reusable rating primitives

- Decision: Use `RatingDashboard` as container and `RatingRadarChart` as focused visualization component.
- Reason: Separate layout/state orchestration from chart rendering for easier testing and iteration.
- Impact: Enables team average comparison and multi-dimensional score interpretation with lower coupling.

### ADR-V4-003: Reuse existing ratings APIs for V4 UX

- Decision: V4 UX features consume existing `/v1/ratings` and analytics endpoints; no new server route required for this iteration.
- Reason: Fast delivery with minimal backend risk.
- Impact: Frontend capability increases without API contract changes, preserving V1/V2 compatibility.

## Verification

- TypeScript check: passed
- Build verification: passed
- Deployment target: wow:3006

## References

- `ralph/prd.json`
- `kanban/CHANGELOG.md`
- `DOC/v4-release-notes-2026-02-28.md`
