# Backpack Planner

<img src="public/icon.svg" alt="Backpack Planner icon" width="96" />

Plan and share Backpack Tech builds for Run! Goddess.

Live app: https://shilo.github.io/rg-backpack-planner  
Game: [Run! Goddess](https://rungoddess.topgamesinc.com)

## What it does

Backpack Planner is a web-based planner for the Backpack Tech system. It lets you build and compare Guardian, Vanguard, and Cannon trees while tracking tech crystal budgets and overall progress.

## Features

- Multi-tab tree planner for Guardian, Vanguard, and Cannon paths.
- Adjustable tech crystal budget with live available/spent totals.
- Per-tree controls to focus in view or reset levels.
- Global reset for all trees.
- Stats panel with totals and a copy-to-clipboard action.
- Help modal with game + author credits.
- Share build button in the UI (share link wiring is not implemented yet).

## How to use

- Open a tree tab and adjust node levels to match your build.
- Use the side menu to update Tech Crystals owned and see budget impact.
- Copy stats from the Statistics section for quick sharing.
- Reset a single tree or all trees from the side menu as needed.

## Controls

On-screen HUD:
- Tech Crystals (Currency): view spent and set owned amount.
- Reset active tree: refund Tech Crystals for tree.

Side menu:
- Side menu button: show or hide additional options.
- Share button: copy a shareable link of your build.
- Install app: install the PWA for offline access (appears when available).

Touch controls:
- Tap a node: add a node level and spend Tech Crystals.
- Long press a node: show node options.
- Long press empty space or tab: show tree options.
- Drag with one finger: pan around tree.
- Pinch with two fingers: zoom in and out on tree.
- Swipe right on side menu: close side menu.

Mouse controls:
- Click a node: add a node level and spend Tech Crystals.
- Right-click a node: show node options.
- Right-click empty space or tab: show tree options.
- Click and drag: pan around tree.
- Scroll wheel or trackpad: zoom in and out on tree.

## Development

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run preview
npm run check
```
