# PDF generation on Linux (Puppeteer / Chromium)

Purchase order and document PDFs use Puppeteer. On a headless VPS, Chromium fails if system libraries are missing.

## Symptom

```text
PDF engine failed to start Chromium ... libgbm.so.1: cannot open shared object file
```

## Fix (Ubuntu / Debian API server)

```bash
cd /opt/Inventory-control   # or your deploy path
sudo bash retail-ims/deploy/api/install-chromium-pdf-deps.sh
```

Or manually:

```bash
sudo apt-get update
sudo apt-get install -y chromium-browser libgbm1 libasound2t64 libnss3 libatk-bridge2.0-0 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libpangocairo-1.0-0 libcups2 libgtk-3-0 fonts-liberation
```

## Point the API at system Chromium (recommended)

Add to the API environment (`.env`, PM2, or systemd):

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

On some distros the path is `/usr/bin/chromium`.

## Restart API

```bash
pm2 list                    # find your API process name (often retail-api, not api)
pm2 restart retail-api      # use the name from pm2 list
```

If you changed environment variables in `.env` or an ecosystem file:

```bash
pm2 restart retail-api --update-env
```

## Important: set env in `.env`, not the shell

This **does not persist** (only affects the current SSH session):

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser   # wrong place
```

Add to the API `.env` file instead (path varies by deploy):

```bash
# Example: retail-ims/apps/api/.env or /opt/Inventory-control/.env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Then `pm2 restart <name> --update-env`.

On Ubuntu 24.04, `chromium-browser` is often a Snap stub. After installing `libgbm1`, Puppeteer’s bundled Chrome usually works **without** this variable. Prefer restart first; only set `PUPPETEER_EXECUTABLE_PATH` if PDFs still fail.

Find a real Chromium binary:

```bash
command -v chromium-browser chromium google-chrome 2>/dev/null
ls -la /usr/bin/chromium* /snap/bin/chromium 2>/dev/null
```

## Verify Chromium starts

Bundled Puppeteer Chrome (matches your error path):

```bash
CHROME=$(find /root/.cache/puppeteer -name chrome -type f 2>/dev/null | head -1)
"$CHROME" --headless --no-sandbox --disable-gpu --dump-dom about:blank >/dev/null && echo OK
```

System Chromium:

```bash
chromium-browser --headless --no-sandbox --disable-gpu --dump-dom about:blank >/dev/null && echo OK
```
