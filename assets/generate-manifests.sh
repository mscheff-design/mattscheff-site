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
      sips -s format jpeg -Z 480 "$f" --out "$thumb" >/dev/null
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
