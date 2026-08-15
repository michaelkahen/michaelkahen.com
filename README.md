# michaelkahen.com

Michael Kahen's personal engineering portfolio, presented as an interactive
industrial control system. Rather than using a conventional collection of
pages, the site turns projects, professional information, and contact channels
into connected machines on a factory floor.

The visual language draws from factory automation, logistics networks, rugged
control panels, and monochrome terminals. Original SVG machinery, animated
belts and signals, technical readouts, and compact system controls support that
theme without relying on external frameworks or game assets.

## Project Scope

The portfolio is a single-page experience centered on Michael's work as a
computer engineer and Stony Brook University Class of 2025 graduate. Its main
areas are:

- **Factory floor** - the central navigation map, where each portfolio
  destination is represented by a connected machine.
- **Assembly complex** - a project catalog and detail console for engineering
  work and interactive experiments.
- **RISC-V Pipeline Lab** - an interactive five-stage CPU model, assembler,
  debugger, cache, and branch-prediction laboratory.
- **Biosphere Unit** - a real-time autonomous ASCII ecosystem rendered with the
  Canvas 2D API.
- **Document archive** - the portfolio's resume area.
- **Communications radar** - direct email, GitHub, and LinkedIn channels.
- **Display controls** - persistent alternate technical labels and motion
  preferences, including reduced-motion support.

Hash-based views preserve the feeling of operating one system while giving
each major section a distinct route. The interface is designed for keyboard,
pointer, and touch use, with focus management, live announcements, semantic
controls, and responsive layouts built into the experience.

## RISC-V Pipeline Lab

The RISC-V Pipeline Lab is a deterministic, cycle-level model of an in-order
RV32I processor. It launches from the project catalog into a standalone modern
debugger where visitors can edit assembly, inspect real machine-code encodings,
step individual cycles, or run programs continuously.

The model includes:

- Five IF, ID, EX, MEM, and WB stages with visible bubbles and instruction flow.
- EX/MEM and MEM/WB forwarding, load-use interlocks, and control-hazard flushes.
- A two-pass assembler with labels, ABI register names, pseudo-instructions,
  source diagnostics, and real 32-bit RISC-V encodings.
- Selectable static or 16-entry adaptive branch prediction with a branch target
  buffer and two-bit saturating counters.
- A toggleable 128-byte direct-mapped, write-through data cache with modeled
  refill latency and a 4 KiB backing memory.
- Live registers, memory, cache, predictor state, cycle events, CPI, stalls,
  prediction accuracy, and cache-hit telemetry.
- Fibonacci, array-sum, branch-prediction, and forwarding/hazard programs.

The supported instruction subset covers RV32I integer register and immediate
operations, shifts, signed and unsigned comparisons, `lui`, `auipc`, `lw`,
`sw`, conditional branches, `jal`, `jalr`, and `ebreak`. The assembler also
supports `nop`, `mv`, `li`, `j`, `jr`, `ret`, and `halt` pseudo-instructions.

The engine is independent of the DOM and exports the assembler, pipeline model,
cache, predictor, decoder, and a sequential reference interpreter to Node. Run
the verification suite with:

```sh
node --test tests/*.test.js
```

The suite covers canonical encodings, instruction semantics, forwarding,
interlocks, flushes, cache behavior, predictor saturation, faults, built-in
programs, and deterministic generated programs checked against the independent
reference model. It also guards the site's critical-resource budget, lazy
feature entry points, unique IDs, image layout dimensions, and new-tab link
isolation.

## Autonomous Ecosystem

The Biosphere Unit is the portfolio's autonomous simulation project. It
generates a jungle-and-lake habitat populated by deer, fish, snakes, an
alligator, and a tiger, with decorative birds moving above the environment.

The simulation combines:

- Fixed-step updates at 30 Hz with rendering managed independently.
- Procedural terrain, a generated lake, structures, vegetation, food, and
  weather effects.
- Agent steering for wandering, seeking, fleeing, separation, hunting, and
  habitat boundaries.
- Energy, age, reproduction, inherited traits, mutation, and population
  recovery systems.
- Animated multi-frame ASCII species artwork and live population telemetry.
- Spatial hashing, cached background layers, visibility-aware suspension, and
  population caps to keep the simulation responsive.

The ecosystem is isolated from the portfolio shell and loaded only when its
view is opened. A small lifecycle API allows the site controller to activate or
suspend it as navigation and motion preferences change.

## Architecture

The production site is intentionally self-contained:

- `index.html` defines the complete semantic structure for the factory,
  project, resume, contact, CPU, and ecosystem views.
- `assets/css/site.css` contains the shared industrial design system, factory
  layout, responsive behavior, animation states, and component styling.
- `assets/css/ecosystem.css` contains the terminal presentation and responsive
  simulation viewport.
- `assets/css/cpu.css` contains the independent debugger interface and its
  responsive desktop workspace.
- `assets/js/site.js` manages hash routing, view focus, navigation state,
  display preferences, contact interactions, and lazy project loading.
- `assets/js/cpu.js` contains the assembler, CPU pipeline, memory hierarchy,
  predictor, reference model, debugger rendering, controls, and lifecycle API.
- `assets/js/ecosystem.js` contains procedural world generation, simulation
  entities and behavior, ASCII rendering, telemetry, controls, and lifecycle
  management.
- `assets/icons/` contains the original SVG machine artwork and site identity.
- `assets/documents/` is reserved for portfolio documents.

## Performance Engineering

The loading and rendering paths are intentionally split by responsibility:

- The initial route downloads only the shared shell stylesheet and controller.
  CPU and ecosystem stylesheets load in parallel with their JavaScript the
  first time their route opens, behind an accessible `aria-busy` loading state.
- Feature modules expose a small `setActive` lifecycle API. Their animation
  loops stop when their route closes, and the ecosystem also suspends when the
  document is hidden or reduced motion is requested.
- The CPU debugger caches hot-path DOM references, retains listing and event
  nodes, skips unchanged text mutations, and batches table replacement through
  document fragments. Simulation work stays separate from presentation logic.
- The ecosystem uses a fixed simulation step, requestAnimationFrame rendering,
  spatial hashing, cached background layers, bounded catch-up work, and entity
  caps so frame rate cannot change simulation behavior or cause runaway work.
- Original SVG assets provide resolution-independent machinery without a font,
  component framework, analytics bundle, or other third-party runtime cost.
- Every image declares intrinsic dimensions, noncritical route imagery is lazy
  decoded, and all ambient effects honor the global motion preference.
- The site regression suite enforces a 30 KiB gzip budget for the HTML, shared
  stylesheet, and boot controller combined.

This keeps the first paint small while preserving deterministic engineering
projects that can be inspected and tested independently of the page shell.

## Repository Structure

```text
.
├── index.html
└── assets/
    ├── css/
    │   ├── cpu.css
    │   ├── ecosystem.css
    │   └── site.css
    ├── documents/
    │   └── README.md
    ├── icons/
    │   ├── biosphere-module.svg
    │   ├── contact-radar.svg
    │   ├── cpu-core.svg
    │   ├── favicon.svg
    │   ├── github-uplink.svg
    │   ├── linkedin-relay.svg
    │   ├── project-assembler.svg
    │   └── resume-archive.svg
    └── js/
        ├── cpu.js
        ├── ecosystem.js
        └── site.js
```

All production artwork is original to the portfolio. The factory theme is an
independent visual interpretation and does not include or redistribute
third-party sprites, textures, fonts, audio, logos, or other game assets.
