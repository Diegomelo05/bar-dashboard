#!/bin/bash
# Rebuild e redeploy do frontend do Bar Dashboard
set -e

source /root/.credentials

echo "==> Rebuilding frontend..."
cd /root/bar/frontend
echo "VITE_API_URL=https://bar-api.dmelo.uk" > .env
npm run build

echo "==> Deploying to Cloudflare Pages..."
CLOUDFLARE_API_TOKEN="$CF_TOKEN_PAGES" \
CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" \
npx wrangler@3 pages deploy dist \
  --project-name=bar-dashboard \
  --branch=main \
  --commit-message="Deploy $(date '+%Y-%m-%d %H:%M')"

echo "==> Deploy concluído! https://bar.dmelo.uk"
