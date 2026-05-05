#!/usr/bin/env python3
"""Generate Dune deck visuals through Replicate.

Reads prompts from deck.json. REPLICATE_API_KEY can come from the environment,
this deck's .env.local, or the existing Katechon pitch/app env files.
"""

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(os.environ.get("DUNE_DECK_MANIFEST", ROOT / "deck.json"))
MODEL = os.environ.get("REPLICATE_MODEL", "black-forest-labs/flux-schnell")


def read_key() -> str:
    for env_name in ("REPLICATE_API_TOKEN", "REPLICATE_API_KEY"):
        key = os.environ.get(env_name, "").strip()
        if key:
            return key

    candidates = [
        ROOT / ".env.local",
        (ROOT / "../../.." / ".env").resolve(),
        (ROOT / "../../.." / ".env.local").resolve(),
        Path("/home/bigsky/dev/katechon/katechon-pitch/.env"),
        Path("/home/bigsky/dev/katechon/katechon-pitch/.env.local"),
        Path("/home/bigsky/dev/katechon/katechon-app/.env.local"),
    ]

    for path in candidates:
        if not path.exists():
            continue
        lines = path.read_text().splitlines()
        for key_name in ("REPLICATE_API_TOKEN", "REPLICATE_API_KEY"):
            for line in lines:
                if line.startswith(f"{key_name}="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


HEADERS = {}


def configure_api():
    api_key = read_key()
    if not api_key:
        raise SystemExit("REPLICATE_API_KEY not found. Set it in env or public/decks/dune/.env.local.")
    HEADERS.update({
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    })


def request_json(method: str, url: str, payload=None, prefer_wait=False):
    body = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=body, method=method)
    for key, value in HEADERS.items():
        req.add_header(key, value)
    if prefer_wait:
        req.add_header("Prefer", "wait")
    with urllib.request.urlopen(req, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def download(url: str, dest: Path):
    req = urllib.request.Request(url, method="GET")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=180) as response:
        dest.write_bytes(response.read())


def model_input(prompt: str):
    if MODEL == "black-forest-labs/flux-schnell":
        return {
            "prompt": prompt,
            "go_fast": True,
            "megapixels": "1",
            "num_outputs": 1,
            "aspect_ratio": "16:9",
            "output_format": "jpg",
            "output_quality": 92,
            "num_inference_steps": 4,
        }

    return {
        "prompt": prompt,
        "width": 1536,
        "height": 864,
        "num_outputs": 1,
        "output_format": "jpg",
        "output_quality": 92,
    }


def output_url(output):
    if isinstance(output, list):
        return output[0]
    if isinstance(output, dict):
        for value in output.values():
            if isinstance(value, str) and value.startswith("http"):
                return value
            if isinstance(value, list) and value and isinstance(value[0], str):
                return value[0]
    if isinstance(output, str):
        return output
    raise RuntimeError(f"Unsupported Replicate output: {output!r}")


def deck_asset_path(value: str) -> Path:
    clean = value.removeprefix("./")
    path = (ROOT / clean).resolve()
    if ROOT not in path.parents and path != ROOT:
        raise ValueError(f"Refusing to write outside deck root: {value}")
    return path


def load_visuals():
    manifest = json.loads(MANIFEST.read_text())

    for visual in manifest.get("visuals", []):
        file_path = visual.get("file") or visual.get("image")
        prompt = visual.get("prompt")
        if file_path and prompt:
            slug = visual.get("slug") or Path(file_path).stem
            yield slug, file_path, prompt

    for index, slide in enumerate(manifest.get("slides", []), start=1):
        image = slide.get("image")
        prompt = slide.get("visualPrompt")
        if image and prompt:
            slug = slide.get("slug") or f"slide-{index:02d}"
            yield slug, image, prompt


def matches(selectors, slug: str, file_path: str) -> bool:
    if not selectors:
        return True

    path = Path(file_path)
    aliases = {slug, file_path, path.name, path.stem}
    return any(selector in aliases for selector in selectors)


def generate(slug: str, file_path: str, prompt: str, force: bool):
    dest = deck_asset_path(file_path)
    if dest.exists() and dest.stat().st_size > 24_000 and not force:
        print(f"skip {slug} ({dest.relative_to(ROOT)})")
        return

    print(f"generate {slug} ({dest.relative_to(ROOT)})", flush=True)
    try:
        prediction = request_json(
            "POST",
            f"https://api.replicate.com/v1/models/{MODEL}/predictions",
            {"input": model_input(prompt)},
            prefer_wait=True,
        )
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Replicate HTTP {exc.code}: {detail[:500]}") from exc

    while prediction.get("status") not in {"succeeded", "failed", "canceled"}:
        time.sleep(2)
        prediction = request_json("GET", f"https://api.replicate.com/v1/predictions/{prediction['id']}")

    if prediction.get("status") != "succeeded":
        raise RuntimeError(f"Replicate failed for {slug}: {prediction.get('error')}")

    download(output_url(prediction["output"]), dest)
    print(f"wrote {dest.relative_to(ROOT)}")


def parse_args():
    parser = argparse.ArgumentParser(description="Generate Dune deck visuals from deck.json.")
    parser.add_argument("selectors", nargs="*", help="Slide slug, visual slug, filename, or asset path to generate.")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the asset already exists.")
    return parser.parse_args()


def main():
    args = parse_args()
    print(f"model {MODEL}")
    print(f"manifest {MANIFEST}")
    selected = [
        (slug, file_path, prompt)
        for slug, file_path, prompt in load_visuals()
        if matches(set(args.selectors), slug, file_path)
    ]
    if not selected:
        print("no matching visuals")
        return

    configure_api()
    for slug, file_path, prompt in selected:
        generate(slug, file_path, prompt, args.force)


if __name__ == "__main__":
    main()
