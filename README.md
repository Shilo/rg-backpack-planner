# Backpack Planner

<img src="public/icon.svg" alt="Backpack Planner icon" width="96" />

Plan and share Backpack Tech builds for Run! Goddess.

Live app: https://shilo.github.io/rg-backpack-planner  
Game: [Run! Goddess](https://rungoddess.topgamesinc.com)

## What it does

Backpack Planner is a web-based planner for the Backpack Tech system. It lets you build and compare Guardian, Vanguard, and Cannon trees while tracking tech crystal budgets and overall progress.

## Features

### Tree Planning
- **Multi-tab tree planner** for Guardian, Vanguard, and Cannon paths
- **Node level adjustment** via tap/click or context menu
- **Single Level Up mode**: Toggle between incrementing by 1 or maxing out nodes
- **Node context menu**: Increase, decrease, max, or reset individual nodes
- **Tree context menu**: Focus tree in view or reset entire tree
- **Visual node states**: Locked, available, active, and maxed indicators

### Tech Crystal Management
- **Adjustable tech crystal budget** with live available/spent totals
- **Per-tree tracking** of tech crystal spending
- **Auto-calculation** of costs when adjusting node levels
- **Tech Crystal display** in HUD showing spent and owned amounts

### View & Navigation
- **Pan and zoom** on trees (drag/scroll or pinch)
- **Focus Tree in View**: Auto-fit and center tree with optimal zoom
- **Close-up View toggle**: 150% initial zoom for better visibility
- **View state persistence**: Remembers zoom and pan position

### Build Management
- **Auto-save**: Progress automatically saved to localStorage
- **Load on startup**: Restores your build when you return
- **Reset options**: Reset single tree or all trees at once
- **Share builds**: Generate shareable URLs with encoded build data
- **Preview mode**: View and edit shared builds without affecting your personal build
- **Clone preview builds**: Copy a preview build to your personal build
- **Stop preview**: Exit preview mode and return to personal build
- **Share as image**: Screenshot functionality (coming soon)

### Statistics & Tracking
- **Statistics panel**: View totals for all trees
- **Copy stats to clipboard**: Quick sharing of build statistics
- **Per-tree breakdown**: See levels and tech crystals spent per tree
- **Progress tracking**: Monitor total node levels across all trees

### Settings & Customization
- **Single Level Up toggle**: Control how nodes level up
- **Close-up View toggle**: Adjust initial zoom level
- **Reset settings**: Restore all settings to defaults
- **Clear all data**: Delete all progress and settings (with confirmation)

### Progressive Web App (PWA)
- **Install as PWA**: Install for offline access
- **Offline support**: Use the app without internet connection
- **Version tracking**: Automatic notifications for new versions
- **App-like experience**: Full-screen, standalone app mode

### User Interface
- **Side menu**: Access Statistics, Settings, and Controls tabs
- **Context menus**: Right-click or long-press for node and tree options
- **Toast notifications**: Feedback for actions and errors
- **Tooltips**: Helpful hints throughout the interface
- **Haptic feedback**: Tactile response on supported devices
- **Responsive design**: Works on desktop, tablet, and mobile
- **Preview build indicator**: Visual indicator when viewing shared builds

## How to use

### Planning Your Build
1. Open a tree tab (Guardian, Vanguard, or Cannon) and adjust node levels to match your build
2. Use the side menu to update Tech Crystals owned and see budget impact
3. Toggle "Single Level Up" in Settings to control how nodes level up (increment by 1 vs max out)
4. Use context menus (right-click or long-press) for precise node control

### Sharing Builds
1. Click "Share Build" in the side menu to generate a shareable link
2. The link is automatically copied to your clipboard
3. Share the link with others - they can view and edit your build in preview mode
4. Preview builds can be cloned to personal builds using the "Clone Preview Build" option

### Viewing Shared Builds
1. Open a shared build link to enter preview mode
2. The preview build indicator shows you're viewing a shared build
3. Edit the build to see how changes affect stats
4. Clone the build to save it as your personal build, or stop preview to return to your build

### Managing Your Build
- **Reset a tree**: Use the reset button in HUD or side menu to refund all tech crystals for the active tree
- **Reset all trees**: Use the side menu to reset all trees at once
- **Focus in view**: Use the "Focus Tree in View" button to auto-fit and center the tree
- **Copy stats**: Use the copy button in Statistics to share your build stats

## Controls

### On-screen HUD
- **Tech Crystals display**: View spent and set owned amount
- **Reset active tree button**: Refund all Tech Crystals for the active tree
- **Preview build indicator**: Shows when viewing a shared build (click for preview options)
- **App title**: Click to open side menu to Controls tab

### Side Menu
The side menu has three tabs:
- **Statistics**: View build statistics and copy to clipboard
- **Settings**: Configure build options, view controls, and manage application
- **Controls**: View app information, controls reference, and install PWA

**Side menu actions:**
- **Share Build**: Generate and copy shareable link (or share as image - coming soon)
- **Tech Crystals button**: Set owned tech crystal amount
- **Focus Tree in View**: Auto-fit and center the active tree
- **Reset Tree**: Reset the active tree
- **Reset All Trees**: Reset all three trees at once
- **Install App**: Install as PWA for offline access (appears when available)
- **Reload Window**: Refresh the application
- **Reset Settings**: Restore all settings to defaults
- **Clear All Data**: Delete all progress and settings (with confirmation)

### Touch Controls
- **Tap a node**: Add a node level and spend Tech Crystals (or increment by 1 if Single Level Up is enabled)
- **Long press a node**: Show node context menu with increase, decrease, max, and reset options
- **Long press empty space or tab**: Show tree context menu with focus in view and reset options
- **Drag with one finger**: Pan around the tree
- **Pinch with two fingers**: Zoom in and out on the tree
- **Swipe right on side menu**: Close the side menu

### Mouse Controls
- **Click a node**: Add a node level and spend Tech Crystals (or increment by 1 if Single Level Up is enabled)
- **Right-click a node**: Show node context menu with increase, decrease, max, and reset options
- **Right-click empty space or tab**: Show tree context menu with focus in view and reset options
- **Click and drag**: Pan around the tree
- **Scroll wheel or trackpad**: Zoom in and out on the tree

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
