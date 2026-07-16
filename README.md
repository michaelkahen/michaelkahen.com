# Michael Kahen - Portfolio Factory

A dependency-free portfolio for Michael Kahen, a computer engineer and Stony
Brook University Class of 2025 graduate. The site presents projects and contact
links as an original factory-automation interface.

## Run locally

No dependencies or build step are required.

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Navigation

- `#home` - interactive factory floor
- `#projects` - project assembly console
- `#ecosystem` - autonomous ASCII ecosystem
- `#resume` - resume archive
- `#contact` - direct contact console
- GitHub and LinkedIn open their external profiles in new tabs

The header includes Alt Mode for additional technical labels and a master motion
control. `Alt+A` toggles Alt Mode and `Alt+M` toggles ambient motion.

## Ecosystem controls

- `Space` - pause or resume
- `S` - cycle between 1x, 2x, and 4x speed
- `R` - generate a new ecosystem

The ecosystem script is loaded only when the simulation is opened. It suspends
itself when its view or browser tab is hidden.

## Add the resume

Place the PDF at:

```text
assets/documents/michael-kahen-resume.pdf
```

Then replace the pending document block in `index.html` with view and download
links to that file.

## Add a project

1. Add an original project illustration under `assets/icons/`.
2. Add a project slot inside `.project-catalog` in `index.html`.
3. Add the corresponding project detail article.
4. Add a hash route in `assets/js/site.js` if the project has an interactive view.

Project descriptions should identify the problem, implementation, important
engineering choices, technologies, and source or live links.

## Project structure

```text
index.html
assets/
  css/
    site.css
    ecosystem.css
  documents/
    README.md
    michael-kahen-resume.pdf  # added later
  icons/
    biosphere-module.svg
    contact-radar.svg
    favicon.svg
    github-uplink.svg
    linkedin-relay.svg
    project-assembler.svg
    resume-archive.svg
  js/
    site.js
    ecosystem.js
```

All machine artwork is original SVG. The site does not include or redistribute
Factorio sprites, textures, fonts, audio, or logos.

## Ecosystem model

The simulation advances in fixed steps of `1/30` second. Animals combine seek,
flee, wander, separation, boundary, and obstacle steering. Energy use depends
on metabolism and movement, eligible animals reproduce probabilistically, and
speed, sensing, and size traits can mutate across generations. Spatial hashing
limits nearby food, predator, prey, and separation searches.
