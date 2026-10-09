// soak.js — probe-soak.mjs's hop mix, run INSIDE real Safari (roadmap §6.2, Oct 9).
// Memory is read from OUTSIDE (footprint on the tab's WebContent process), so this only drives and counts.
// Start:  osascript -e 'tell application "Safari" to do JavaScript (read POSIX file ".../soak.js") in current tab of front window'
// Poll:   osascript -e 'tell application "Safari" to do JavaScript "JSON.stringify(window.__soak)" in current tab of front window'
// window.__soakN (default 200) sets the hop count; window.__soakStop = true ends it early.
(() => {
	const N = window.__soakN ?? 200;
	const SETTLE = 2800;
	const KINDS = [
		[0.3, '.shuffle-notables'],
		[0.3, '.cc-blade a[href^="/"]'],
		[0.2, '.rail .anchor'],
		[0.2, '.parents-slot a[href^="/"], [class*="children"] a[href^="/"]']
	];
	const S = (window.__soak = { hop: 0, dead: 0, done: false, paths: [] });
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
	};
	function target() {
		const order = [...KINDS].sort((a, b) => Math.random() * b[0] - Math.random() * a[0]);
		for (const [, sel] of order) {
			const els = [...document.querySelectorAll(sel)].filter(visible);
			if (els.length) return els[Math.floor(Math.random() * els.length)];
		}
		return null;
	}
	(async () => {
		for (let i = 1; i <= N && !window.__soakStop; i++) {
			const before = location.pathname;
			const el = target();
			if (!el) break;
			el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
			el.dispatchEvent(new PointerEvent('pointerenter'));
			await sleep(120);
			el.click();
			const t0 = performance.now();
			while (location.pathname === before && performance.now() - t0 < 4000) await sleep(50);
			if (location.pathname === before) S.dead++;
			await sleep(SETTLE);
			S.hop = i;
			S.paths.push(location.pathname);
		}
		S.done = true;
	})();
	return 'started';
})();
