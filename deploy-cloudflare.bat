:: // deploy-cloudflare.bat
@echo off
echo Deploying Tip-n-Split AI to Cloudflare Pages...
npx wrangler pages deploy "app/src/main/assets" --project-name="tip-n-split-ai" --branch="main"
pause