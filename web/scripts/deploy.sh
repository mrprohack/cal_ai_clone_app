#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Cal AI — Production Deploy Script
# Usage: bash scripts/deploy.sh
# Requires: ssh alias "host" configured in ~/.ssh/config
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REMOTE="host"
REMOTE_DIR="/home/u697986122/domains/lightgreen-spider-622425.hostingersite.com"
PUBLIC_HTML="$REMOTE_DIR/public_html"
APP_NAME="cal-ai-web"

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│        Cal AI — Production Deploy            │"
echo "└─────────────────────────────────────────────┘"
echo ""

# ── Step 1: Build locally ─────────────────────────────────────────────────────
echo "▶ [1/5] Building Next.js production bundle…"
cd "$(dirname "$0")/.."   # cd to web/ root
npm run build
echo "✅ Build complete"

# ── Step 2: Sync app source files (excluding node_modules, .next) ─────────────
echo ""
echo "▶ [2/5] Uploading source files via rsync…"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '*.tar.gz' \
  --exclude 'FoodData_Central_csv_2023-10-26' \
  --exclude 'foods_10k.*' \
  --exclude 'fetch_10k.py' \
  --exclude '.env.local' \
  ./ "$REMOTE:$REMOTE_DIR/"
echo "✅ Source files uploaded"

# ── Step 3: Upload .next build output ─────────────────────────────────────────
echo ""
echo "▶ [3/5] Uploading .next build output…"
rsync -avz --progress \
  .next/ "$REMOTE:$REMOTE_DIR/.next/"
echo "✅ .next build uploaded"

# ── Step 4: Update public_html proxy files ─────────────────────────────────────
echo ""
echo "▶ [4/5] Updating public_html proxy files…"
scp index.php "$REMOTE:$PUBLIC_HTML/index.php"
scp .htaccess_fallback "$REMOTE:$PUBLIC_HTML/.htaccess"
echo "✅ index.php and .htaccess updated"

# ── Step 5: Restart pm2 on remote ─────────────────────────────────────────────
echo ""
echo "▶ [5/5] Installing deps + restarting pm2 on server…"
ssh "$REMOTE" bash <<ENDSSH
  set -e
  cd $REMOTE_DIR
  echo "→ Installing production deps…"
  npm install --omit=dev --prefer-offline
  echo "→ Restarting pm2 process '$APP_NAME'…"
  if pm2 describe $APP_NAME > /dev/null 2>&1; then
    pm2 restart $APP_NAME
  else
    pm2 start npm --name $APP_NAME -- start
  fi
  pm2 save
  echo "→ pm2 status:"
  pm2 status
ENDSSH

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  ✅ Deploy complete!                          │"
echo "│  🌐 https://lightgreen-spider-622425.         │"
echo "│        hostingersite.com                     │"
echo "└─────────────────────────────────────────────┘"
echo ""
