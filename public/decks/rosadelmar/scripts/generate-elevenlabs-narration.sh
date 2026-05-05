#!/usr/bin/env bash
# Generate the Rosadelmar deck narration MP3s with ElevenLabs.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/assets/narration"
MODEL_ID="${ELEVENLABS_MODEL_ID:-eleven_turbo_v2}"
VOICE_ID="${ELEVENLABS_VOICE_ID:-jqcCZkN6Knx8BJ5TBdYR}"
API_KEY="${ELEVENLABS_API_KEY:-}"

load_api_key() {
  local env_file="$1"
  local line
  if [ -n "$API_KEY" ] || [ ! -f "$env_file" ]; then
    return
  fi
  line="$(grep -E '^ELEVENLABS_API_KEY=' "$env_file" | head -n1 || true)"
  if [ -n "$line" ]; then
    API_KEY="$(printf '%s' "$line" | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi
}

load_api_key "$ROOT/.env.local"
load_api_key "$ROOT/../../../.env"
load_api_key "$ROOT/../../../.env.local"
load_api_key "/home/bigsky/dev/katechon/katechon-app/.env.local"
load_api_key "/home/bigsky/dev/katechon/katechon-pitch/.env.local"

if [ -z "$API_KEY" ]; then
  echo "ELEVENLABS_API_KEY not found." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

NARRATIONS=(
  "rosadelmar-01|Rosadelmar is an alpha search engine, turning strategy discovery from scarce craft into computable software."
  "rosadelmar-02|The team combines discretionary trading, Wintermute HFT experience, physics depth, and frontier tech company building."
  "rosadelmar-03|Today alpha research is handcrafted. Rosadelmar moves the loop to compute scale, where hypotheses can multiply."
  "rosadelmar-04|The cost curve is the argument: ten thousand hypotheses move from labor budgets to software economics."
  "rosadelmar-05|Small edges become attractive when search cost collapses. Rosadelmar targets the long tail humans cannot cover."
  "rosadelmar-06|The system discovers offline, refines online, and keeps a live registry of candidate strategies."
  "rosadelmar-07|Early runs show an order-of-magnitude lift across generations, suggesting search quality compounds."
  "rosadelmar-08|The frontier matters because better candidates emerged for less than a dollar of API cost per run."
  "rosadelmar-09|The open question is execution: turning cheap search into durable live P and L without overfitting."
  "rosadelmar-10|The memo frames the wedge: start in software-speed HFT, learn fast, then expand wherever alpha search is manual."
)

for entry in "${NARRATIONS[@]}"; do
  SLUG="${entry%%|*}"
  TEXT="${entry#*|}"
  MP3_FILE="$OUT_DIR/${SLUG}.mp3"
  TMP_FILE="$OUT_DIR/${SLUG}.tmp"

  echo "generating $SLUG"
  HTTP_STATUS="$(curl -sS -X POST \
    "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
    -H "xi-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg text "$TEXT" \
      --arg model "$MODEL_ID" \
      '{
        text: $text,
        model_id: $model,
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.78,
          style: 0.08,
          use_speaker_boost: true
        }
      }')" \
    --output "$TMP_FILE" \
    --write-out "%{http_code}")"

  if [ "$HTTP_STATUS" != "200" ]; then
    echo "ElevenLabs returned HTTP $HTTP_STATUS for $SLUG" >&2
    cat "$TMP_FILE" >&2
    rm -f "$TMP_FILE"
    exit 1
  fi

  mv "$TMP_FILE" "$MP3_FILE"
done

echo "wrote $OUT_DIR"
