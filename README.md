# root@biosphere

An autonomous ASCII ecosystem rendered on an HTML canvas. Deer, fish, snakes,
alligators, and tigers move, feed, reproduce, hunt, and adapt within a generated
jungle-and-lake habitat.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser.

## Controls

- `Space` — pause or resume
- `S` — cycle between 1×, 2×, and 4× speed
- `R` — generate a new ecosystem

## Mathematics

The simulation advances in fixed steps of $\Delta t = 1/30$ second, keeping its
behavior consistent across different display frame rates.

- **Motion:** Each animal combines seek, flee, wander, separation, boundary, and
  obstacle forces into an acceleration $\mathbf{F}$. Velocity and position are
  updated as $\mathbf{v} \leftarrow \mathbf{v} + \mathbf{F}\Delta t$ and
  $\mathbf{x} \leftarrow \mathbf{x} + \mathbf{v}\Delta t$, with speed and force
  capped by the animal's inherited traits.
- **Energy:** Energy decreases through baseline metabolism and movement cost.
  Movement cost grows approximately with
  $(\lVert\mathbf{v}\rVert / v_{\max})^2$, so faster movement is increasingly
  expensive. Eating plants or prey restores energy.
- **Reproduction:** Eligible animals reproduce probabilistically. Per step,
  $p = r\,c\,\Delta t$, where $r$ is the species reproduction rate and $c$
  decreases as the population approaches its target capacity.
- **Genetics:** Speed, sensing, and size multipliers are inherited with bounded
  random mutation. These traits affect movement, perception, appearance, and
  energy use, allowing population characteristics to drift over generations.
- **Terrain:** The lake is a distorted ellipse. Its shoreline radius is perturbed
  by two sine waves,
  $R(\theta) = 1 + A_1\sin(k_1\theta + \phi_1) + A_2\sin(k_2\theta + \phi_2)$,
  producing a deterministic irregular boundary from each terrain seed.
- **Neighborhoods:** Spatial hashing divides the world into grid cells, limiting
  food, predator, prey, and separation searches to nearby cells instead of the
  entire population.

## Project files

- `index.html` — page structure and controls
- `styles.css` — terminal-inspired presentation
- `ecosystem.js` — simulation, terrain generation, and canvas rendering
