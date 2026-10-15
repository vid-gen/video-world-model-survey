# Video World Model Survey

Companion website for **Revisiting Video Foundation Models through the Lens of
World Modeling**: Reading, Writing, Sharing, and Interacting with the World through
Video.

**[Visit the website](https://vid-gen.github.io/video-world-model-survey/)** ·
**[Browse the literature repository](https://github.com/vid-gen/awesome-video-world-model)**

The site presents the survey through its original artwork: the four-operation
overview, research timeline, representation and architecture diagrams, world-model
taxonomy, and seven challenge illustrations. A searchable collection contains 652
references, with links to the cited papers and their verified official resources.

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
