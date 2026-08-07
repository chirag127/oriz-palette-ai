cd "$(dirname "$0")" || exit 1
git init -b main
git add -A
git config user.name "Chirag Singhal"
git config user.email "chirag127@users.noreply.github.com"
git commit -m "feat: oriz-palette-ai — AI brand-kit generator — describe a brand → get palette + font pairing + tagline + logo-idea prompt, preview a mock landing card, export tokens (CSS/JSON)"
git remote add origin https://github.com/chirag127/oriz-palette-ai.git 2>/dev/null || git remote set-url origin https://github.com/chirag127/oriz-palette-ai.git
git push -u origin main
