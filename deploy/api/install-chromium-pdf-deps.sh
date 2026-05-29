#!/usr/bin/env bash
# Install Chromium and shared libraries required for Puppeteer PDF generation on Debian/Ubuntu.
# Run on the API server as root: sudo bash deploy/api/install-chromium-pdf-deps.sh
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update

# Core browser + libraries Puppeteer/Chromium need on headless Linux (fixes libgbm.so.1, etc.)
PACKAGES=(
  chromium-browser
  chromium
  libgbm1
  libnss3
  libatk1.0-0
  libatk-bridge2.0-0
  libdrm2
  libxkbcommon0
  libxcomposite1
  libxdamage1
  libxfixes3
  libxrandr2
  libpangocairo-1.0-0
  libcups2
  libgtk-3-0
  libx11-xcb1
  libxshmfence1
  libasound2
  libasound2t64
  fonts-liberation
  fonts-noto-color-emoji
)

to_install=()
for pkg in "${PACKAGES[@]}"; do
  if apt-cache show "$pkg" &>/dev/null; then
    to_install+=("$pkg")
  fi
done

if ((${#to_install[@]} == 0)); then
  echo "No known Chromium packages found for this distro." >&2
  exit 1
fi

apt-get install -y --no-install-recommends "${to_install[@]}"

CHROME=""
for candidate in /usr/bin/chromium-browser /usr/bin/chromium /usr/bin/google-chrome-stable; do
  if [[ -x "$candidate" ]]; then
    CHROME="$candidate"
    break
  fi
done

echo ""
echo "Chromium PDF dependencies installed."
if [[ -n "$CHROME" ]]; then
  echo "Recommended API env (add to your .env or systemd unit):"
  echo "  PUPPETEER_EXECUTABLE_PATH=$CHROME"
else
  echo "No system Chromium binary found; Puppeteer bundled Chrome will be used after libs are installed."
fi
echo ""
echo "Restart the API process, then retry PDF download from Purchase Orders."
