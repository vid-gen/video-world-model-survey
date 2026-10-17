#!/usr/bin/env python3
"""Dependency-free regression checks for the interactive website assets."""
import argparse
from copy import deepcopy
import re
import runpy
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://www.w3.org/2000/svg"}
IMPORTER = runpy.run_path(str(ROOT / 'tools/import_interactive_timeline.py'))


def artwork_without_editorial_metadata(root):
    """Compare original scientific artwork independently of tooltip cleanup."""
    root = deepcopy(root)
    root.set('viewBox', '0 0 2336 3384')
    for child in list(root):
        tag = child.tag.split('}')[-1]
        if tag == 'desc' or (tag == 'text' and ((child.text or '') in IMPORTER['DUPLICATE_HEADINGS'] or (child.text or '').startswith('Time flows downward'))):
            root.remove(child)
    for anchor in root.findall('s:a', NS):
        anchor.find('s:title', NS).text = None
    for element in root.iter():
        if element.text is not None and not element.text.strip():
            element.text = None
        if element.tail is not None and not element.tail.strip():
            element.tail = None
    return ET.tostring(root, encoding='unicode')


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.local = []
        self.ids = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        for name in ("href", "src", "data-scene"):
            value = attrs.get(name, "")
            if value and not value.startswith("#") and not urlsplit(value).scheme:
                self.local.append(unquote(urlsplit(value).path))


def check(original_source=None):
    timeline = ROOT / "assets/timeline"
    for filename in (ROOT / "index.html", timeline / "index.html"):
        page = Page(filename.read_text())
        assert len(page.ids) == len(set(page.ids)), f"Duplicate IDs: {filename}"
        for link in page.local:
            assert (filename.parent / link).exists(), f"Missing asset: {filename}: {link}"
    document = (timeline / "index.html").read_text()
    inline = re.findall(r"<svg\b.*?</svg>", document, re.S)
    assert len(inline) == 1
    variants = [ET.parse(timeline / name).getroot() for name in ("with-affiliations.svg", "without-affiliations.svg")]
    links = [[(a.attrib, ET.tostring(a, encoding="unicode")) for a in variant.findall("s:a", NS)] for variant in variants]
    assert len(links[0]) == 160 and len(links[1]) == 160
    assert [attrs for attrs, _ in links[0]] == [attrs for attrs, _ in links[1]]
    for variant in variants:
        assert variant.get('viewBox') == '0 70 2336 3314'
        assert not IMPORTER['EDITORIAL_NOTE'].search(ET.tostring(variant, encoding='unicode'))
        assert not any((t.text or '') in IMPORTER['DUPLICATE_HEADINGS'] for t in variant.findall('s:text', NS))
    cleaner = IMPORTER['clean_tooltip']
    assert cleaner('I3D | 2017-05-22 | DeepMind; Oxford | CVPR 2017') == 'I3D | 2017-05-22 | DeepMind; Oxford | CVPR 2017'
    assert cleaner('Work | 2026-01-01 | NYU (Courant) | 正式 venue 未核实') == 'Work | 2026-01-01 | NYU (Courant)'
    assert cleaner('Work | 2026-01-01 | Lab | ICLR 2026 (arXiv publication comment)') == 'Work | 2026-01-01 | Lab'
    assert cleaner('Vega | 2026-06-30 | TikTok（作者主页称为报告；完整论文署名机构待核验） | 技术报告；未核实正式 venue') == 'Vega | 2026-06-30 | TikTok'
    assert cleaner('V-JEPA 2-AC（动作条件变体） | 2025-06-11 | Meta FAIR | 技术报告；未核实正式 venue').startswith('V-JEPA 2-AC（动作条件变体） |')
    if original_source:
        originals = re.findall(r'<svg\b.*?</svg>', original_source.read_text(), re.S)
        assert len(originals) == 2
        for original, presented in zip(originals, variants):
            before = ET.fromstring(original)
            assert artwork_without_editorial_metadata(before) == artwork_without_editorial_metadata(presented), 'Scientific artwork, labels or links changed'
            before_identity = [tuple(part.strip() for part in (a.find('s:title', NS).text or '').split('|')[:2]) for a in before.findall('s:a', NS)]
            after_identity = [tuple(part.strip() for part in (a.find('s:title', NS).text or '').split('|')[:2]) for a in presented.findall('s:a', NS)]
            assert before_identity == after_identity, 'Version-specific work names or dates changed'
    for source in inline:
        embedded = ET.fromstring(source)
        embedded_links = [ET.tostring(a, encoding="unicode") for a in embedded.findall("s:a", NS)]
        assert embedded_links == [markup for _, markup in links[0]], "Embedded paper entries changed"
        for element in embedded.iter():
            assert element.tag.split("}")[-1] not in {"script", "foreignObject", "image"}
            assert not any(key.lower().startswith("on") for key in element.attrib)
            if element.get("href"):
                assert element.get("href").startswith("https://")
        assert not any((e.text or '').startswith('Time flows downward') for e in embedded.findall('s:text', NS))
    for removed in ('affiliation-toggle', 'svg-download', 'print-button', 'reader-help', 'reader-heading', 'Manuscript work index', 'A4 portrait'):
        assert removed not in document, f"Authoring/export UI leaked into reader: {removed}"
    world = ET.parse(ROOT / "assets/world-observer.svg").getroot()
    ids = {element.get("id") for element in world.iter() if element.get("id")}
    for element in world.iter():
        href = element.get("href", "")
        if href.startswith("#"):
            assert href[1:] in ids, f"Missing world symbol: {href}"
    assert len([e for e in world.iter() if e.get("data-camera") is not None]) == 3
    template = (timeline / "reader-template.html").read_text()
    assert template.count("<!-- TIMELINE_ART -->") == 1
    assert "<!-- TIMELINE_" not in document
    assert "F02_manuscript_work_inventory.md" not in document
    print("PASS: clean tooltips/headings, 160 intact paper entries, version identities, SVG artwork/links, unique IDs, local assets, valid world SVG.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Optionally compare all scientific artwork and links with the original input HTML')
    check(parser.parse_args().source)
