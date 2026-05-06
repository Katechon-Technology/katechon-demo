#!/usr/bin/env bash
# Generate Katechon Technology narration MP3s with ElevenLabs.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="${DUNE_DECK_MANIFEST:-$ROOT/deck.json}"
MODEL_ID="${ELEVENLABS_MODEL_ID:-eleven_turbo_v2}"
# Default to the standard Katechon pitch voice used by this demo.
VOICE_ID="${ELEVENLABS_VOICE_ID:-jqcCZkN6Knx8BJ5TBdYR}"
KATECHON_PHONEME='<phoneme alphabet="ipa" ph="ˈkætəkɒn">Katechon</phoneme>'
API_KEY="${ELEVENLABS_API_KEY:-}"
SELECTORS=()

if [ -n "${DUNE_SLIDES:-}" ]; then
  read -r -a env_selectors <<< "$(printf '%s' "$DUNE_SLIDES" | tr ',' ' ')"
  SELECTORS+=("${env_selectors[@]}")
fi

if [ "$#" -gt 0 ]; then
  SELECTORS+=("$@")
fi

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

should_generate() {
  local slug="$1"
  local audio="$2"
  local audio_stem
  audio_stem="$(basename "$audio" .mp3)"

  if [ "${#SELECTORS[@]}" -eq 0 ]; then
    return 0
  fi

  local selector
  for selector in "${SELECTORS[@]}"; do
    if [ -z "$selector" ]; then
      continue
    fi
    if [ "$selector" = "$slug" ] || [ "$selector" = "$audio" ] || [ "$selector" = "$audio_stem" ]; then
      return 0
    fi
  done

  return 1
}

audio_path() {
  local audio="$1"
  audio="${audio#./}"
  if [[ "$audio" == /* ]]; then
    printf '%s\n' "$audio"
    return
  fi
  printf '%s/%s\n' "$ROOT" "$audio"
}

while IFS=$'\t' read -r SLUG AUDIO TEXT; do
  if ! should_generate "$SLUG" "$AUDIO"; then
    continue
  fi

  MP3_FILE="$(audio_path "$AUDIO")"
  TMP_FILE="${MP3_FILE%.mp3}.tmp"
  mkdir -p "$(dirname "$MP3_FILE")"

  echo "generating $SLUG"
  HTTP_STATUS="$(curl -sS -X POST \
    "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
    -H "xi-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg text "$TEXT" \
      --arg model "$MODEL_ID" \
      --arg katechon "$KATECHON_PHONEME" \
      '{
        text: ($text | gsub("\\bKatechon\\b"; $katechon)),
        model_id: $model,
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.26,
          speed: 1.1
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
done < <(jq -r '.slides[] | select((.narration // "") != "" and (.audio // "") != "") | [(.slug // (.audio | split("/")[-1] | sub("\\.mp3$"; ""))), .audio, .narration] | @tsv' "$MANIFEST")

echo "wrote narration assets from $MANIFEST"
