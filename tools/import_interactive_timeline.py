#!/usr/bin/env python3
"""Import the authors' self-contained timeline HTML, preserving both SVG variants.

Usage: python3 tools/import_interactive_timeline.py /path/to/timeline.html
The supplied file is read-only; generated assets are written into assets/timeline/.
"""
import argparse
from html import escape, unescape
import re
import xml.etree.ElementTree as ET
from pathlib import Path


EDITORIAL_NOTE = re.compile(
    r'未核实|待核验|待核实|最终录用|投稿记录|publication comment|作者主页称|完整论文署名',
    re.I,
)
DUPLICATE_HEADINGS = (
    'Reading, Writing, Sharing, and Interacting through Video',
    'Video foundation models · 2017–2026',
)


def clean_tooltip(value):
    """Omit uncertain publication claims instead of presenting them as facts."""
    fields = [part.strip() for part in value.split('|')]
    result = []
    for index, field in enumerate(fields):
        if index == 2:  # Institution: keep normal campus/version qualifiers.
            field = re.sub(
                r'[（(][^（）()]*[）)]',
                lambda match: '' if EDITORIAL_NOTE.search(match.group()) else match.group(),
                field,
            ).strip()
        if EDITORIAL_NOTE.search(field):
            if index < 3:
                raise ValueError('An identity/date/affiliation field needs manual review')
            continue  # Do not invent a venue or infer final acceptance.
        if field:
            result.append(field)
    return ' | '.join(result)


def presentation_svg(svg):
    """Clean presentation metadata only; retain work labels, geometry and URLs."""
    def anchor_tooltip(match):
        anchor = match.group()
        return re.sub(
            r'<title>(.*?)</title>',
            lambda title: '<title>' + escape(clean_tooltip(unescape(title.group(1))), quote=False) + '</title>',
            anchor, flags=re.S,
        )
    svg = re.sub(r'<a\b[^>]*>.*?</a>', anchor_tooltip, svg, flags=re.S)
    for text in DUPLICATE_HEADINGS:
        svg = re.sub(r'<text\b[^>]*>' + re.escape(text) + r'</text>\s*', '', svg)
    svg = re.sub(r'<text\b[^>]*>Time flows downward[^<]*</text>\s*', '', svg)
    svg = re.sub(r'<desc\b[^>]*>.*?</desc>', '<desc id="desc">Selected milestones in Reading, Writing, Sharing, and Interacting, 2017–2026. Work labels link to the corresponding papers.</desc>', svg, flags=re.S)
    # Only blank space occupied by the removed duplicate headings is cropped.
    svg = svg.replace('viewBox="0 0 2336 3384"', 'viewBox="0 70 2336 3314"')
    if EDITORIAL_NOTE.search(svg):
        raise ValueError('An editorial annotation remains in the public drawing')
    return svg


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    source = args.source.read_text(encoding="utf-8")
    svgs = re.findall(r"<svg\b.*?</svg>", source, flags=re.S)
    if len(svgs) != 2:
        raise ValueError("Expected the supplied affiliation and no-affiliation SVGs")
    ns = {"s": "http://www.w3.org/2000/svg"}
    roots = [ET.fromstring(svg) for svg in svgs]
    for root in roots:
        for element in root.iter():
            if element.tag.split("}")[-1] in ("script", "foreignObject", "image"):
                raise ValueError("Only self-contained vector artwork is supported")
            if any(key.lower().startswith("on") for key in element.attrib):
                raise ValueError("Unexpected event attribute")
            href = element.get("href")
            if href and not href.startswith("https://"):
                raise ValueError("Unexpected non-HTTPS link")
    links = [[a.attrib for a in r.findall("s:a", ns)] for r in roots]
    if links[0] != links[1]:
        raise ValueError("The two variants must preserve the same paper links")
    output = Path(__file__).resolve().parents[1] / "assets" / "timeline"
    output.mkdir(parents=True, exist_ok=True)
    presentations = [presentation_svg(svg) for svg in svgs]
    for name, svg in zip(("with-affiliations.svg", "without-affiliations.svg"), presentations):
        (output / name).write_text(svg + "\n", encoding="utf-8")

    # Use one default drawing, not the source HTML's authoring/export interface.
    # Both served variants use the same presentation cleanup. Original input HTML
    # stays read-only outside the public repository; all paper identities remain.
    template = (output / "reader-template.html").read_text(encoding="utf-8")
    display = presentations[0]
    (output / "index.html").write_text(template.replace("<!-- TIMELINE_ART -->", display), encoding="utf-8")

    # Reuse the original world, terrain, trees, buildings and camera outlines.
    # The only new illustrated elements are a moving subject and its path.
    world = next(e for e in roots[0].iter() if e.get("class") == "world-illustration")
    ET.register_namespace("", ns["s"])
    children = list(world)
    building = next(i for i, e in enumerate(children) if e.get("stroke") == "#849d9d")
    cameras = [e for e in children if e.get("class") == "camera"]
    serial = lambda es: "\n".join(ET.tostring(e, encoding="unicode") for e in es)
    base = serial(children[1:building])  # exclude the old, fixed field-of-view cones
    front = serial(children[building:building + 3])
    camera_svg = "\n".join(f'<g data-camera="{i}">{ET.tostring(e, encoding="unicode")}</g>' for i, e in enumerate(cameras))
    orb = '<ellipse cx="0" cy="2" rx="9" ry="3" fill="#47586b" opacity=".16"/><circle cy="-7" r="7" fill="#b35bd5" stroke="#783b92" stroke-width="1"/><circle cx="-2" cy="-9" r="2" fill="#f6e9fc"/>'
    scene = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-350 -215 700 385" role="img" aria-labelledby="observer-scene-title observer-scene-desc">
<title id="observer-scene-title">Observe a changing world through video</title>
<desc id="observer-scene-desc">A moving purple object passes through the paper's illustrated landscape. Cameras observe only part of the same world.</desc>
<defs><g id="observer-base">{base}
<path id="observer-route" d="M-168 26 C-110 47 -40 60 7 41 S91 -18 153 5" fill="none" stroke="#bccbc5" stroke-width="11"/>
<path d="M-168 26 C-110 47 -40 60 7 41 S91 -18 153 5" fill="none" stroke="#f1f3e7" stroke-width="8"/>
</g><g id="observer-front">{front}</g><g id="observer-subject">{orb}</g></defs>
<path d="M-350 -130 Q-230 -145 -215 -20" fill="none" stroke="#ffbf00" stroke-width="3" opacity=".65"/>
<path d="M-100 -215 Q-145 -100 -60 -55" fill="none" stroke="#06b0f0" stroke-width="3" opacity=".65"/>
<path d="M350 -170 Q240 -110 172 -32" fill="none" stroke="#82f5b1" stroke-width="3" opacity=".8"/>
<path d="M350 100 Q250 100 191 37" fill="none" stroke="#cd93e3" stroke-width="3" opacity=".7"/>
<use href="#observer-base"/><g data-subject="" transform="translate(-168 26)"><use href="#observer-subject"/></g><use href="#observer-front"/>
<rect data-view-field="" x="-200" y="-55" width="265" height="168" rx="3" fill="#e8f5fc" fill-opacity=".08" stroke="#4383a0" stroke-width="1" stroke-dasharray="5 5"/>
{camera_svg}
</svg>'''
    (output.parent / "world-observer.svg").write_text(scene, encoding="utf-8")
    print(f"Imported {len(links[0])} timeline entries in both variants; all source paper links preserved.")


if __name__ == "__main__":
    main()
