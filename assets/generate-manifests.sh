#!/usr/bin/env bash
# Regenerates manifest.json + missing thumbnails for every project folder under assets/.
#
# Run this after dropping a new folder of photos into assets/, or after adding
# photos to an existing project folder. It is safe to re-run at any time —
# existing thumbnails are left untouched, only missing ones are generated.
#
# Requires macOS `sips` for thumbnail generation.
set -euo pipefail
cd "$(dirname "$0")"

for dir in */; do
  dir="${dir%/}"

  shopt -s nullglob nocaseglob
  photos=("$dir"/*.webp "$dir"/*.jpg "$dir"/*.jpeg "$dir"/*.png)
  shopt -u nullglob nocaseglob
  [ ${#photos[@]} -eq 0 ] && continue

  mkdir -p "$dir/thumbs"
  names=()
  for f in "${photos[@]}"; do
    base="$(basename "$f")"
    name="${base%.*}"
    names+=("$name")
    thumb="$dir/thumbs/$name.jpg"
    if [ ! -f "$thumb" ]; then
      # 960px longest edge, quality 85 — the old -Z 480 default (sips'
      # unspecified default quality) read soft/blurry once these became
      # tiles' single static lead image rather than one of several
      # auto-cycling frames: level-1 master-grid tiles can render up to
      # ~360px wide even at fairly ordinary desktop widths, which needs
      # ~720px of source at 2x/retina — 480px total was already short of
      # that before any compression softness on top. 960/q85 covers that
      # with headroom while staying a fraction of a full-res webp's size.
      sips -s format jpeg -Z 960 -s formatOptions 85 "$f" --out "$thumb" >/dev/null
      echo "generated thumb: $thumb"
    fi
  done

  sorted=($(printf '%s\n' "${names[@]}" | sort))

  manifest="$dir/manifest.json"
  {
    printf '['
    for i in "${!sorted[@]}"; do
      [ "$i" -gt 0 ] && printf ','
      printf '"%s"' "${sorted[$i]}"
    done
    printf ']\n'
  } > "$manifest"
  echo "wrote $manifest (${#sorted[@]} photos)"
done
