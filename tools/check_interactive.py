#!/usr/bin/env python3
"""Dependency-free regression checks for the interactive website assets."""
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://www.w3.org/2000/svg"}


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


def check():
    timeline = ROOT / "assets/timeline"
    for filename in (ROOT / "index.html", timeline / "index.html"):
        page = Page(filename.read_text())
        assert len(page.ids) == len(set(page.ids)), f"Duplicate IDs: {filename}"
        for link in page.local:
            assert (filename.parent / link).exists(), f"Missing asset: {filename}: {link}"
    document = (timeline / "index.html").read_text()
    inline = re.findall(r"<svg\b.*?</svg>", document, re.S)
    assert len(inline) == 2
    variants = [ET.parse(timeline / name).getroot() for name in ("with-affiliations.svg", "without-affiliations.svg")]
    links = [[(a.attrib, ET.tostring(a, encoding="unicode")) for a in variant.findall("s:a", NS)] for variant in variants]
    assert len(links[0]) == 160 and len(links[1]) == 160
    assert [attrs for attrs, _ in links[0]] == [attrs for attrs, _ in links[1]]
    for index, source in enumerate(inline):
        embedded = ET.fromstring(source)
        embedded_links = [ET.tostring(a, encoding="unicode") for a in embedded.findall("s:a", NS)]
        assert embedded_links == [markup for _, markup in links[index]], "Embedded paper entries changed"
        for element in embedded.iter():
            assert element.tag.split("}")[-1] not in {"script", "foreignObject", "image"}
            assert not any(key.lower().startswith("on") for key in element.attrib)
            if element.get("href"):
                assert element.get("href").startswith("https://")
    world = ET.parse(ROOT / "assets/world-observer.svg").getroot()
    ids = {element.get("id") for element in world.iter() if element.get("id")}
    for element in world.iter():
        href = element.get("href", "")
        if href.startswith("#"):
            assert href[1:] in ids, f"Missing world symbol: {href}"
    assert len([e for e in world.iter() if e.get("data-camera") is not None]) == 3
    template = (timeline / "reader-template.html").read_text()
    assert template.count("<!-- TIMELINE_WITH -->") == 1
    assert template.count("<!-- TIMELINE_WITHOUT -->") == 1
    assert "<!-- TIMELINE_" not in document
    assert "F02_manuscript_work_inventory.md" not in document
    print("PASS: unique HTML IDs, local assets, 160 intact entries per variant, HTTPS paper links, self-contained valid world SVG, generated reader.")


if __name__ == "__main__":
    check()
