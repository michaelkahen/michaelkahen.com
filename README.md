# michaelkahen.com

This repository contains the source for my personal engineering portfolio. I
present the site as an interactive industrial control system rather than a
conventional collection of pages.

I draw the visual language from factory automation, logistics networks, rugged
control panels, and monochrome terminals. I use original SVG machinery,
animated belts and signals, technical readouts, and compact system controls to
support the theme without relying on external frameworks or game assets.

## Experience

I built the portfolio as a single-page experience centered on my work as a
computer engineer and Stony Brook University Class of 2025 graduate.
Hash-based views preserve the feeling of operating one connected system while
giving each major section a distinct route.

I designed the interface for keyboard, pointer, and touch use. It includes
focus management, live announcements, semantic controls, responsive layouts,
and reduced-motion support.

## Architecture

I intentionally keep the production site self-contained:

- `index.html` defines the site's semantic structure.
- `assets/css/site.css` contains the shared industrial design system,
  responsive behavior, animation states, and component styling.
- `assets/js/site.js` manages routing, focus, navigation state, display
  preferences, and interactions.
- `assets/icons/` contains the original SVG artwork and site identity.
- `assets/documents/` contains portfolio documents.

## Performance

I keep the initial loading path small and defer nonessential resources until
they are needed. I also stop inactive animation loops, avoid unnecessary DOM
updates, lazy-load noncritical imagery, and honor the global reduced-motion
preference.

The site does not require a component framework, analytics bundle, external
font, or other third-party runtime dependency. Every image declares intrinsic
dimensions, and the regression suite enforces a 30 KiB gzip budget for the
HTML, shared stylesheet, and boot controller combined.

## Verification

Run the test suite with:

```sh
node --test tests/*.test.js
```

The suite checks site behavior, accessibility-related markup, resource budgets,
unique IDs, image dimensions, and new-tab link isolation.

## Repository Structure

```text
.
├── .gitattributes
├── .gitignore
├── README.md
├── _headers
├── index.html
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── site.webmanifest
│   ├── css/
│   │   ├── cpu.css
│   │   ├── ecosystem.css
│   │   └── site.css
│   ├── documents/
│   │   ├── Michael_Kahen_Resume.pdf
│   │   └── README.md
│   ├── icons/
│   │   ├── apple-touch-icon.png
│   │   ├── biosphere-module.svg
│   │   ├── contact-radar.svg
│   │   ├── cpu-core.svg
│   │   ├── favicon-48x48.png
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── github-uplink.svg
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── linkedin-relay.svg
│   │   ├── project-assembler.svg
│   │   └── resume-archive.svg
│   ├── images/
│   │   └── michael-kahen-social-card.png
│   └── js/
│       ├── cpu.js
│       ├── ecosystem.js
│       └── site.js
└── tests/
    ├── cpu.test.js
    └── site.test.js
```

I created all production artwork specifically for this portfolio. My factory
theme is an independent visual interpretation, and I do not include or
redistribute third-party sprites, textures, fonts, audio, logos, or other game
assets.
