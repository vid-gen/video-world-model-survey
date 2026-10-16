# Video World Model Survey

Companion website for **Reading, Writing, Sharing, and Interacting with the World
through Video: A Survey Toward Unified Video World Models**.

**[Visit the website](https://vid-gen.github.io/video-world-model-survey/)** ·
**[Browse the literature repository](https://github.com/vid-gen/awesome-video-world-model)**

The site presents the survey through its original artwork: the four-operation
overview, research timeline, representation and architecture diagrams, world-model
taxonomy, and seven challenge illustrations. A searchable collection contains 652
references, with links to the cited papers and their verified official resources.
The overview also includes an interactive video–world observation illustration;
the vector timeline opens papers directly and supports zoom and year navigation.

## Editing and preview

This is a static, buildless website. Edit `index.html`, `assets/styles.css`, and
`assets/app.js` directly. To preview locally:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. No package installation is needed. Survey content
remains readable without JavaScript; the interactive literature library links to
the complete Markdown list as a fallback.

## Reference updates

The literature repository is the canonical source for `data/references.json` and
`references.bib`. After reviewing a literature update, copy both files together:

```sh
python3 tools/sync_references.py ../vid-gen-awesome-video-world-model
```

The helper accepts an absolute or relative local clone path, checks unique keys
and record agreement, and writes only these two public catalog files. Review the
diff and update visible total/category counts and the displayed update date if
they changed. In the browser, counts and filter options use the loaded catalog.

The site serves its checked-in snapshot first. If it cannot be loaded, the library
tries the public catalog in the literature repository and then offers direct
GitHub and BibTeX links.

## Publication

GitHub Pages is configured to serve the root of `main`. The `.nojekyll` file keeps
the files unchanged during publication. A push to `main` deploys the website at
the project URL above.

## Content and artwork

### Interactive world and timeline

`assets/world-observer.js` animates the original timeline's landscape and camera
outlines. A new moving subject follows a deterministic 16-second path. The video
panel and sampled frames crop the exact same scene at the indicated timestamps;
they are a conceptual illustration, not model outputs. Play/pause, scrubbing,
view selection and motion reversal work with a keyboard. Autoplay is disabled
for reduced-motion preferences, pauses outside the viewport or hidden tabs, and
stops at the end of the clip. A static SVG remains if JavaScript is unavailable.

The self-contained `assets/timeline/` reader displays the affiliation-visible
vector drawing from the authors' supplied `F02_updated_A4_selectable.html`, with
all 160 paper entries and URLs intact. The website keeps only compact zoom, year
and direction navigation; authoring/export controls and production notes are not
part of the presentation. Both exact source SVG variants are retained as assets.
The reader can be opened independently of the main page. Without JavaScript,
the complete vector timeline and paper links remain available; printing
the main page uses the original paper figure instead of a clipped viewport.

To import a replacement authored HTML timeline (the input is never modified):

```sh
python3 tools/import_interactive_timeline.py /path/to/F02_updated_A4_selectable.html
python3 tools/check_interactive.py
```

The importer reproduces `assets/timeline/index.html`, its two source SVGs,
and `assets/world-observer.svg`. Edit `assets/timeline/reader-template.html` for
reader markup, not the generated `index.html`; reader controls/styles live in
`reader.js` and `reader.css`. The animated scene's new route/subject are defined
in the importer. Bump changed asset version queries when publishing updates.

### Manuscript artwork

The 17 figures in `assets/figures/` are lossless web renderings of the original
manuscript artwork, not redrawn diagrams. `assets/figures/manifest.json` records
each exact source filename and rendered dimensions. `assets/survey-overview.png`
is retained for social previews. The four operation symbols reproduce the paper's
Font Awesome eye, pencil, exchange, and gamepad glyphs and ink colors.

See [artwork credits and provenance](assets/CREDITS.md). Only selected public
artwork is included; the manuscript sources are not part of this repository.

To re-export from a local manuscript, install Poppler and WebP utilities, then run:

```sh
python3 tools/render_figures.py /path/to/manuscript
```

For a single updated figure, add `--only overview` (or another figure name).
The overview export also refreshes the social-preview PNG.

Review the manifest and figure captions after any export. The source-file map is
explicit so an older similarly named figure cannot silently replace the active
version. Figures open in a keyboard-accessible viewer with fit/zoom controls;
original-image links remain functional without JavaScript. The generation and
unification galleries also expose all figures when JavaScript is unavailable.

Design references: [Physical2RSI](https://eurekaleo.github.io/Awesome-Physical2RSI/)
and [OmniScientist](https://omni-scientist.github.io/). The centered research cover,
large figure-led chapters, restrained controls, and chapter-dot navigation adapt
their presentation patterns. Their branding, illustrations, and code are not
copied. Scrolling stays native, including on mobile; reduced-motion preferences
are respected.
