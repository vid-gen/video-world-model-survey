# Video World Model Survey

Companion website for **Revisiting Video Foundation Models through the Lens of
World Modeling**: Reading, Writing, Sharing, and Interacting with the World through
Video.

**[Visit the website](https://vid-gen.github.io/video-world-model-survey/)** ·
**[Browse the literature repository](https://github.com/vid-gen/awesome-video-world-model)**

The site presents the survey framework, four operations, world-model taxonomy,
evidence ladder, seven open questions, and a searchable collection of 652
references. The manuscript is forthcoming; no paper download or publication
identifier is implied by this website.

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

`assets/survey-overview.png` is a web rendering of the survey authors' overview
figure. `assets/world-lens.svg`, `assets/mark.svg`, and the occlusion illustration
are original web diagrams. The occlusion interaction is a conceptual illustration,
not model output or an empirical benchmark. Third-party research remains credited
through its individual bibliographic records and source links.

Design references: [Physical2RSI](https://eurekaleo.github.io/Awesome-Physical2RSI/)
and [OmniScientist](https://omni-scientist.github.io/). The site uses original layout,
code, and artwork; it does not copy their assets.
