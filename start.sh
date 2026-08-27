#!/bin/sh
set -u

mkdir -p /app/data/caddy-data /app/data/caddy-config

cat > /tmp/Caddyfile <<'EOF'
{
  admin 127.0.0.1:2019
}

:80 {
  respond "MTG Practice Table remote access is waiting for configuration." 200
}
EOF

export XDG_DATA_HOME=/app/data/caddy-data
export XDG_CONFIG_HOME=/app/data/caddy-config

# Remote ingress is intentionally non-critical: if Caddy fails, the MTG app
# still starts normally through Umbrel's app proxy.
caddy run --config /tmp/Caddyfile --adapter caddyfile &
CADDY_PID=$!

cleanup() {
  if kill -0 "$CADDY_PID" 2>/dev/null; then
    kill "$CADDY_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

exec npm run start
