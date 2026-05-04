#!/usr/bin/env python3
"""Generate Dune deck visuals through Replicate.

Reads REPLICATE_API_KEY from the environment, this directory's parent .env.local,
or the existing Katechon pitch repo .env.local. The key is never printed.
"""

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "visuals"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = os.environ.get("REPLICATE_MODEL", "black-forest-labs/flux-schnell")

VISUALS = [
    (
        "00-dashboard-header.jpg",
        "Cinematic 16:9 dashboard header for the Katechon x Dune fundraise deck: live software channels arranged like a premium media control room, luminous application surfaces, avatar narration energy suggested through abstract signal waves, dark full-bleed investor demo aesthetic, refined red ember and emerald signal accents, no readable text, no logos, no watermark",
    ),
    (
        "01-live-software-channel.jpg",
        "Cinematic investor deck hero image for a new media format: a dark full-bleed live software feed floating in space, multiple luminous application dashboards as channels, maps, event rooms, agent timelines, market pulse panels, game-state overlays, elegant red and green signal accents, premium interactive media aesthetic, deep black background, sharp glass UI, no readable text, no logos, no watermark, 16:9 composition",
    ),
    (
        "02-interactive-media.jpg",
        "A high-end interactive media cockpit that feels half dashboard, half game spectator mode: live map surface, avatar narration presence represented as an abstract glowing voice core, feed tiles, game-like state indicators, cinematic dark interface, red orange accent, emerald signal lights, premium venture deck visual, no readable text, no logos, no watermark, 16:9",
    ),
    (
        "03-state-not-pixels.jpg",
        "Abstract split between flat video pixels and structured software state: left side dissolving into video scanlines, right side clean inspectable data objects, nodes, panels, live application state layers, cinematic black environment, crisp technical realism, red blue green accents, sophisticated investor presentation visual, no readable text, no logos, no watermark, 16:9",
    ),
    (
        "04-dune-fit.jpg",
        "Futuristic network of live application channels becoming a consumer feed: strange beautiful frontier interface, games, simulations, event rooms, agent dashboards connected as glowing surfaces, ambitious interactive media platform energy, dark premium cinematic lighting, red ember highlights, green signal paths, no readable text, no logos, no watermark, 16:9",
    ),
]


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
        for line in path.read_text().splitlines():
            if line.startswith("REPLICATE_API_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
        for line in path.read_text().splitlines():
            if line.startswith("REPLICATE_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


API_KEY = read_key()
if not API_KEY:
    raise SystemExit("REPLICATE_API_KEY not found. Set it in env or dune-deck/.env.local.")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


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


def generate(filename: str, prompt: str):
    dest = OUT_DIR / filename
    if dest.exists() and dest.stat().st_size > 24_000:
        print(f"skip {filename}")
        return

    print(f"generate {filename}", flush=True)
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
        raise RuntimeError(f"Replicate failed for {filename}: {prediction.get('error')}")

    download(output_url(prediction["output"]), dest)
    print(f"wrote {dest.relative_to(ROOT)}")


def main():
    print(f"model {MODEL}")
    for filename, prompt in VISUALS:
        generate(filename, prompt)


if __name__ == "__main__":
    main()
