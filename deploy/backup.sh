#!/usr/bin/env bash
# Nightly PostgreSQL backup for the Learnlab stack. Installed on the server by
# deploy/learnlab-backup.{service,timer}; see docs/deploy.md.
#
# Writes backups/learnlab-<UTC timestamp>.sql.gz, checks the file really is a
# complete dump (gzip test + pg_dump's end marker), then deletes dumps older
# than KEEP_DAYS but never the newest MIN_KEEP. Exits non-zero on any failure,
# so systemd marks the run failed (`systemctl status learnlab-backup`).
set -euo pipefail

DIR="${LEARNLAB_DIR:-/opt/learnlab}"
KEEP_DAYS="${KEEP_DAYS:-14}"
MIN_KEEP="${MIN_KEEP:-3}"
cd "$DIR"
umask 077
mkdir -p backups

stamp=$(date -u +%Y%m%dT%H%M%SZ)
final="backups/learnlab-$stamp.sql.gz"
tmp="$final.partial"
trap 'rm -f "$tmp"' EXIT

# --env-file keeps compose from warning about unset variables; the image tag is
# irrelevant for `exec`, but the variable must exist for the file to parse.
export LEARNLAB_IMAGE="${LEARNLAB_IMAGE:-learnlab:unused}"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U postgres --no-owner postgres | gzip -9 > "$tmp"

gzip -t "$tmp"
zcat "$tmp" | tail -n 5 | grep -q "PostgreSQL database dump complete" \
  || { echo "backup incomplete: no end marker in $tmp" >&2; exit 1; }
size=$(stat -c %s "$tmp")
[ "$size" -gt 1024 ] || { echo "backup suspiciously small ($size bytes)" >&2; exit 1; }

mv "$tmp" "$final"
echo "ok $final $size bytes"

# Retention: delete old dumps, but always keep the newest MIN_KEEP.
mapfile -t old < <(ls -1t backups/learnlab-*.sql.gz | tail -n +"$((MIN_KEEP + 1))")
for f in "${old[@]}"; do
  if [ -n "$(find "$f" -mtime +"$KEEP_DAYS" -print)" ]; then rm -f -- "$f"; echo "pruned $f"; fi
done
