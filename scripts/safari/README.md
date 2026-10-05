# Safari measuring kit (roadmap §58.1, §58.3b, §58.3c)

Headless WebKit cannot show Safari's bugs, so these drive **Sam's real Safari** from the Mac. That needs
Safari › Settings › Developer › "Allow JavaScript from Apple Events", and Terminal needs the Screen Recording
permission. Run them outside the command sandbox. **Never run them while Sam is using that Safari tab.**

Run a page script and read its result back:

    osascript -e 'tell application "Safari" to do JavaScript (read POSIX file "'$PWD'/scripts/safari/busy.js") in current tab of front window'
    osascript -e 'tell application "Safari" to do JavaScript "window.__busy" in current tab of front window'

| File | What it does |
|---|---|
| `busy.js` | Clicks a relation chip (`window.__rel`, default `parent`) and records main-thread busy blocks plus rAF frame times for 700ms, into `window.__busy`. The per-frame cost numbers in §58.3c came from this. |
| `measure.js` | Records every `.featured-flight` rect per frame for one click, into `window.__m`: the animation's clock, not the pixels. |
| `hoverclick-parent.js` / `hoverclick-spouse.js` / `hoverclick-sibling.js` | Hover, then click, the way a real mouse does, which triggers SvelteKit's hover preload and changes the timing (§58.3b). |
| `dupcheck.js` | The seven-promotion twin-chip check: spouse, spouse, parent, child, sibling, child, parent. Logs any person visible twice. |
| `stripvars.js` | Experiment from §58.3c that drops the per-frame custom properties. Kept so the "it isn't the custom properties" result can be re-run. |
| `recclick.sh <name> <startSlug> <clickJs> [scale]` | Films a click on display 2 with `screencapture`, then splits the film into frames. |
| `recexperiment.sh <name> <startSlug> "<css>"` | The same, with CSS injected first. Builds a contact sheet of the flight's first ~170ms (`<name>_zoom.png`). `HCFILE` picks the click script. Needs numpy and Pillow. |
| `frames.swift <mov> <outdir> [scale] [startMs] [endMs]` | Extracts PNG frames with AVAssetReader. Playwright's ffmpeg can't decode H.264. |

Added October 4–5 for the promotion jump (roadmap §58.7):

| File | What it does |
|---|---|
| `cardw.py <film>…` | **The objective verdict.** Run in `$OUT` on filmed promotions (`recclick.sh … hoverclick-parent.js 0.35`, Sarah Dwight → Josiah Dwight). Prints the arriving card's width per frame as % of its final width, found by its background colour. A smooth flight steps a little every frame; the jump shows as one step of 25–50 points. |
| `budget.js` | Clicks a relation chip (`window.__rel`) and records, into `window.__bud`: mount time, forced-layout cost at mount, first rAF after mount (`raf1`), the next one (`raf2`, ≈ the card's first frame on screen), and main-thread busy blocks. |
| `calls.js` | The same click, totalling every layout-forcing read (`getBoundingClientRect`, `scrollWidth/Height`, `offsetWidth`…) from click to first render, with the top call sites. Into `window.__calls`. |
| `stall-early.js` / `stall-late-parent.js` | A parent hover-click with a 150ms main-thread stall 70ms / 200ms after the card mounts. Early: the card cannot appear until the stall ends. Late: the compositor carries the growth straight through it. |
| `plainstall.js` | A plain red square animated with WAAPI through a 300ms stall: proves Safari's compositor does run animations off the main thread. |
| `dupflight.js` | `dupcheck.js` that also samples for duplicate chips **every frame mid-flight**, not only 2s after landing. |

`recclick.sh` takes `PORT=…` to film another build (an old commit in a `git worktree` with `node_modules`, `static/data` and `.env` symlinked in, `npx vite dev --port 5175`).

Recordings and frames go to `$OUT` (default `/tmp/safari-rec`), never into the repo. The scripts point at
`localhost:5173`; edit the URL to judge a production build on 4173.
