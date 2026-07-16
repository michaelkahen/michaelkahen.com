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

## Autonomous Ecosystem

The Biosphere Unit is the portfolio's primary interactive software project. It
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
  project, resume, contact, and ecosystem views.
- `assets/css/site.css` contains the shared industrial design system, factory
  layout, responsive behavior, animation states, and component styling.
- `assets/css/ecosystem.css` contains the terminal presentation and responsive
  simulation viewport.
- `assets/js/site.js` manages hash routing, view focus, navigation state,
  display preferences, contact interactions, and lazy ecosystem loading.
- `assets/js/ecosystem.js` contains procedural world generation, simulation
  entities and behavior, ASCII rendering, telemetry, controls, and lifecycle
  management.
- `assets/icons/` contains the original SVG machine artwork and site identity.
- `assets/documents/` is reserved for portfolio documents.

## Repository Structure

```text
.
├── index.html
└── assets/
│   ├── css/
│   │   ├── site.css
│   │   └── ecosystem.css
│   ├── documents/
│   │   └── README.md
│   ├── icons/
│   │   ├── biosphere-module.svg
│   │   ├── contact-radar.svg
│   │   ├── favicon.svg
│   │   ├── github-uplink.svg
│   │   ├── linkedin-relay.svg
│   │   ├── project-assembler.svg
│   │   └── resume-archive.svg
│   └── js/
│       ├── site.js
│       └── ecosystem.js
```

All production artwork is original to the portfolio. The factory theme is an
independent visual interpretation and does not include or redistribute
third-party sprites, textures, fonts, audio, logos, or other game assets.
