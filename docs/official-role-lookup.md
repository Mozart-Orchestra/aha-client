# Official Role Lookup

## Problem

The client had two distinct lookup bugs against genome-hub:

- gstack corps members used short role aliases like `product-strategist` and `engineering-reviewer`, but the canonical official genomes are published as `gstack-product-strategist`, `gstack-engineering-reviewer`, and similar names.
- The sidebar score loader treated every active session `roleKey` as an `@official` genome lookup. Custom roles such as `experiment-architect` are not official genomes, so the UI generated repeated 404s for names that were never supposed to resolve there.

## Fix

- Extend official alias resolution so gstack role aliases resolve to their canonical genome names.
- Add a dedicated official-role lookup helper that only queries genome-hub for known official roles.
- Keep direct `fetchGenomeByName()` behavior for real namespace/name lookups, but stop using it as a blanket role-score probe for arbitrary session roles.

## Rule

Use canonical genome refs or immutable genome IDs whenever the source already has them. Only fall back to role-based official lookups when the role is part of the known official roster.
