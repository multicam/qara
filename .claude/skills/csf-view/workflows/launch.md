# Launch csf-view

Start the tldraw web app, open the browser, and arm the SSE listener.

## Steps

### 1. Resolve views directory

```bash
VIEWS_DIR="$(pwd)/thoughts/shared/views"
mkdir -p "$VIEWS_DIR"
```

The views dir is relative to the **current working directory** (the calling repo), not hardcoded.

### 2. Check if already running

```bash
lsof -i :7201 -t 2>/dev/null
```

If running, check if it's serving the right project:
```bash
curl -s http://localhost:7201/health | jq -r .viewsDir
```

If the `viewsDir` doesn't match the current project, kill the old instance:
```bash
kill $(lsof -t -i :7201) 2>/dev/null
```

### 3. Start the app

**Production mode** (default — used from any repo):
```bash
cd ~/Code/csf-view && VIEWS_DIR="$VIEWS_DIR" bun run start &
```
Serves pre-built frontend from `dist/` + API from a single Bun server on `:7201`.

**Dev mode** (only when cwd is `~/Code/csf-view`):
```bash
cd ~/Code/csf-view && VIEWS_DIR="$VIEWS_DIR" bun run dev &
```
Vite dev server (HMR on `:5173`) + API server (`:7201`). Vite proxies `/api/*`, `/events`, `/health` to `:7201`.

If `dist/` is missing or stale, rebuild:
```bash
cd ~/Code/csf-view && bun run build
```

Wait for the server to be ready (up to 5 seconds):
```bash
for i in {1..10}; do curl -sf http://localhost:7201/health && break; sleep 0.5; done
```

### 4. Open browser

Production mode (single server):
```bash
xdg-open http://localhost:7201
```

With portless configured (`portless alias tlview 5173` or direct to `:7201`):
```bash
xdg-open http://tlview.localhost:1111
```

To open a specific file:
```bash
xdg-open "http://localhost:7201?file=my-idea-v2"
```

### 5. Arm SSE listener

Run in background — Claude gets notified when save/rename events arrive:
```bash
curl -sN http://localhost:7201/events
```

Use `run_in_background: true`. When this command produces output, an SSE event was received — proceed to the **interpret** workflow.

### 6. On SSE disconnect

If curl exits (server restart, network issue), log it. The next `/csf-view` invocation automatically re-arms.

## After Launch

Tell JM the canvas is ready. Wait for SSE events (saves) to trigger interpretation.
