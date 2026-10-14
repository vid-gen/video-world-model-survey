#!/usr/bin/env python3
"""Render only the manuscript figures explicitly selected for the public site.

Usage: python3 tools/render_figures.py /path/to/manuscript
Requires Poppler (pdftoppm) and cwebp. No manuscript source is copied.
"""
import argparse
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile

FIGURES = {
    "overview": "F01_teaser_B_video_bridge_v2.pdf",
    "timeline": "F02_field_timeline-5.pdf",
    "reading": "F04_representation_learning-1.pdf",
    "writing-latents": "F05_latent_representations-2.pdf",
    "writing-models": "F06_video_generation-1.pdf",
    "writing-planning": "F06_llm_video_generation-1.pdf",
    "writing-control": "F07_control_injection-2.pdf",
    "sharing-architectures": "F08_unified_architectures-2.pdf",
    "sharing-learning": "F10_unified_learning_paradigms-2.pdf",
    "interacting": "F11_world_model_taxonomy_concept.pdf",
    "challenge-1": "challenges/C01_long_horizon.png",
    "challenge-2": "challenges/C02_physical_causal.png",
    "challenge-3": "challenges/C03_measurable_synergy.png",
    "challenge-4": "challenges/C04_standardized_evaluation.png",
    "challenge-5": "challenges/C05_unlabeled_control.png",
    "challenge-6": "challenges/C06_scene_embodiment.png",
    "challenge-7": "challenges/C07_stochastic_rare.png",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manuscript", type=Path)
    args = parser.parse_args()
    for command in ("pdftoppm", "cwebp"):
        if not shutil.which(command):
            parser.error(f"Install {command} before rendering.")
    destination = Path(__file__).resolve().parents[1] / "assets" / "figures"
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {}
    with tempfile.TemporaryDirectory(prefix="survey-figures-") as temporary:
        for name, original in FIGURES.items():
            source = args.manuscript / "figures" / original
            if not source.is_file():
                parser.error(f"Missing figure: {original}")
            if source.suffix == ".pdf":
                target = Path(temporary) / name
                subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-scale-to-x", "2600",
                                "-scale-to-y", "-1", "-png", str(source), str(target)], check=True)
                raster = target.with_suffix(".png")
            else:
                raster = source
            with raster.open("rb") as file:
                header = file.read(24)
            width, height = struct.unpack(">II", header[16:24])
            output = destination / f"{name}.webp"
            subprocess.run(["cwebp", "-quiet", "-lossless", "-z", "7", str(raster), "-o", str(output)], check=True)
            manifest[name] = {"source": original, "file": f"assets/figures/{name}.webp",
                              "width": width, "height": height}
            print(f"{name}: {width} × {height}, {output.stat().st_size:,} bytes")
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
