# Behavior Contracts

Technical specification for tier leveling and global leaf cap behavior.

## Tier Leveling (Level Sync)

Node Level Behavior setting:

- `Sync Lineage` (default): applies the full linked propagation contract below.
- `Solo Only`: applies level changes only to the target node.

### 1. Target Rule

- The target node always lands at the requested level after clamp to `[0, maxLevel]`.
- Each operation is evaluated from the node you changed; previously adjusted nodes do not become independent propagation drivers.
- Reactive updates are evaluated on every target change, not only when the visible target tier label changes.

### 2. Reachability Rule

- On increment: only connected ancestors react.
- On decrement: connected ancestors and connected descendants react.
- Descendants use strict child-direction traversal from the target.
- Unrelated nodes are never adjusted.
- Topology boundary cases:
  - a root node has no ancestors to propagate into
  - a leaf node has no descendants to propagate into

### 3. Propagation Tier Assignment

- Ancestors use `target propagation tier`.
- Descendants use `target propagation tier - 1`.
- Descendant levels do not gate or cap increment progression.

### 4. Boundary/Hysteresis Contract

Tier boundaries are every `X0`, but directional reactive triggers are:

- increment reacts at `X1` (one above boundary)
- decrement reacts at `X9` (one below boundary)

Example (`100` cap, tier-2 boundary):

- `19 -> 20`: no reactive change
- `20 -> 21`: reactive change
- `21 -> 20`: no reactive change
- `20 -> 19`: reactive change

Reactive thresholds by `maxLevel`:

- `100` cap: upward trigger levels `1`, `21`, `41`, `61`, `81`
- `50` cap: upward trigger levels `1`, `11`, `21`, `31`, `41`
- `1` cap: upward trigger level `1`

On decrements, hysteresis keeps support until the lower trigger is crossed:

- `100` cap support drops below `20`, `40`, `60`, `80`
- `50` cap support drops below `10`, `20`, `30`, `40`
- `1` cap stable tier drops only at `0`

### 5. Zero-Rebase Rule

- If target drops to `0`, target still becomes `0`.
- Non-target propagation uses a virtual floor of tier `1` for the operation.
- In that zero-rebase case:
  - ancestors rebase against tier `1`
  - descendants rebase against tier `0`

### 6. Directional Clamp Rule

After propagation tier assignment:

- increment uses `max(current, assigned tier upper bound)`
- decrement uses `min(current, assigned tier upper bound)`

Consequences:

- same-tier decrements can still lower reactive nodes immediately
- on decrements, propagation does not resolve below the target's own current tier (prevents same-tier ancestor collapse, e.g. `100 -> 99`)

## Global Leaf Node Cap

Leaf leveling has a global limit across Guardian + Vanguard + Cannon:

- at most 3 leaf nodes may have `level > 0` at once
- once capped, remaining `level = 0` leaves are locked from increment
- increments that do not increase leveled-leaf count are still allowed
- already leveled leaves remain editable, so decrement/reset frees slots
