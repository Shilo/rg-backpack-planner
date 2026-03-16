# Leaderboard Research

Research date: 2026-03-16

## Purpose

This is the overview document for leaderboard research.

The leaderboard research is now split into two separate tracks:

- [internal-leaderboard-research.md](./internal-leaderboard-research.md) for building the leaderboard as part of Backpack Planner
- [external-leaderboard-research.md](./external-leaderboard-research.md) for using an external service instead of building the leaderboard in-app

## Relationship to Sync

The current product direction is still:

- one shared cloud opt-in: `Sync + Leaderboard`
- private synced data remains the `rg-backpack-planner-build-presets` blob
- public leaderboard entries remain explicit publishes, not automatic exposure of private presets

See:

- [cloud-sync-research.md](./cloud-sync-research.md)

## Quick Guidance

Choose the internal path if:

- you want the leaderboard to feel fully native to Backpack Planner
- you want the cleanest preview/import flow inside the app
- you want full control over how builds are published, ranked, and moderated

Choose the external path if:

- you do not want to build leaderboard UI in the app
- you want a separate public gallery or companion site
- you mainly need searchable public entries with a link back into Backpack Planner preview mode

## Current Best Picks

Best internal direction:

- same backend as sync, with separate public leaderboard storage

Best external direction:

- Softr, with `previewUrl` stored per record so each row can open the exact build in Backpack Planner
