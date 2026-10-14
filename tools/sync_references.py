"""Sync the two public bibliography files from a reviewed local literature clone."""
import argparse
import json
import re
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('literature_repository', type=Path)
    args = parser.parse_args()
    source = args.literature_repository.resolve()
    target = Path(__file__).resolve().parents[1]
    catalog_path = source / 'data/references.json'
    bib_path = source / 'references.bib'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    papers = catalog['papers']
    keys = [paper['key'] for paper in papers]
    if not papers or len(keys) != len(set(keys)):
        raise SystemExit('The catalog is empty or contains duplicate citation keys.')
    bibliography = bib_path.read_text(encoding='utf-8')
    bib_keys = re.findall(r'^@\w+\s*\{\s*([^,\s]+)\s*,', bibliography, re.M)
    if len(bib_keys) != len(keys) or set(bib_keys) != set(keys):
        raise SystemExit('Catalog keys and bibliography keys do not match.')
    for paper in papers:
        if paper['bibtex'].strip() not in bibliography:
            raise SystemExit(f"BibTeX differs for {paper['key']}.")
        if not paper['url'].startswith('https://'):
            raise SystemExit(f"Invalid source URL for {paper['key']}.")
    (target / 'data').mkdir(exist_ok=True)
    shutil.copyfile(catalog_path, target / 'data/references.json')
    shutil.copyfile(bib_path, target / 'references.bib')
    print(f'Synced {len(papers)} references, updated {catalog.get("updated", "unknown")}.')
    print('Review the diff and any visible counts and dates before committing.')


if __name__ == '__main__':
    main()
