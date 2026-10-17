/**
 * bakeWear — the card's worn edge as plain pictures, in Safari (Kennedy, 14 Oct 2026).
 *
 * The worn edge (`.card-wear`, layout.css) is a 14-layer CSS mask: the crinkle texture, the "reach"
 * texture, and twelve gradient bands and pools along the card's edges, corners and notch, intersected and
 * filled with the card's line ink. Safari draws a mask separately from the card and late: filmed, the wear
 * vanished for a whole frame at landing (density 4.9% → 0.4% → 3.3%) when the flat flying outline gave way
 * to the notched one and the mask had to be redrawn, and it flickers while the card flies (Sam: a big part
 * of Safari's "messy, hairy" look).
 *
 * So in WebKit the same recipe is drawn ONCE, onto two canvases: the flat outline the card flies with, and
 * the notched one it rests with. CSS shows one or the other (`.featured-flight.flat`), so landing swaps
 * which picture is visible and Safari never redraws a mask during or at the end of a flight. Redrawn only
 * at rest, if the card's size changes. Chrome keeps the CSS mask untouched.
 */
import { isWebKit } from '#lib/state/engine.js';

const CRINKLE_URL = '/textures/card-wear-1100.webp';
const REACH_URL = '/textures/card-wear-reach.png';
/** The textures' drawn width (layout.css: `--wear-size`, "1100px auto"). */
const TILE_W = 1100;

let textures: Promise<[HTMLImageElement, HTMLImageElement]> | null = null;
function loadTextures() {
	if (!textures) {
		const load = (src: string) => {
			const img = new Image();
			img.src = src;
			return img.decode().then(() => img);
		};
		textures = Promise.all([load(CRINKLE_URL), load(REACH_URL)]);
	}
	return textures;
}

const px = (v: string, fallback = 0) => {
	const n = parseFloat(v);
	return Number.isFinite(n) ? n : fallback;
};
const pair = (v: string): [number, number] => {
	const [a, b] = v.trim().split(/\s+/);
	return [px(a ?? '0'), px(b ?? '0')];
};

type Recipe = {
	w: number;
	h: number;
	band: number;
	corner: number;
	notchW: number;
	notchH: number;
	wearAt: [number, number];
	reachAt: [number, number];
	ink: string;
};

/** Draws one outline's worn edge, exactly as layout.css's mask composes it. */
function draw(
	canvas: HTMLCanvasElement,
	r: Recipe,
	crinkle: HTMLImageElement,
	reach: HTMLImageElement
) {
	const dpr = window.devicePixelRatio || 1;
	canvas.width = Math.round(r.w * dpr);
	canvas.height = Math.round(r.h * dpr);
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.scale(dpr, dpr);
	const { w, h, band, corner } = r;
	const black = '#000';
	const mid = 'rgba(0, 0, 0, 0.55)';
	const none = 'rgba(0, 0, 0, 0)';

	// 1. The union of the bands and pools ("add" in the CSS mask = source-over on alpha).
	const edge = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		box: [number, number, number, number]
	) => {
		const len = Math.hypot(x1 - x0, y1 - y0) || 1;
		const g = ctx.createLinearGradient(x0, y0, x1, y1);
		g.addColorStop(0, black);
		g.addColorStop(Math.min(1, band / len), mid);
		g.addColorStop(Math.min(1, (band * 2) / len), none);
		ctx.fillStyle = g;
		ctx.fillRect(...box);
	};
	const pool = (cx: number, cy: number) => {
		const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, corner);
		g.addColorStop(0, black);
		g.addColorStop(1, none);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
	};
	const all: [number, number, number, number] = [0, 0, w, h];
	edge(0, 0, w, 0, all); // to right
	edge(w, 0, 0, 0, all); // to left
	edge(0, 0, 0, h, all); // to bottom
	edge(0, h, 0, 0, all); // to top
	pool(0, 0);
	pool(w, 0);
	pool(0, h);
	pool(w, h);
	// The notch's left edge and underside (zero-sized, so not drawn, when there is no notch)…
	if (r.notchW > 0 && r.notchH > 0) {
		const nx = w - r.notchW;
		edge(nx, 0, nx - band * 2, 0, [nx - band * 2, 0, band * 2, r.notchH]);
		edge(0, r.notchH, 0, r.notchH + band * 2, [nx, r.notchH, r.notchW, band * 2]);
	}
	// …and its two outer corners (both land on the card's top-right corner when there is no notch).
	pool(w - r.notchW, 0);
	pool(w, r.notchH);

	// 2. Intersected with the reach tile and the crinkle tile ("intersect" = destination-in on alpha).
	ctx.globalCompositeOperation = 'destination-in';
	for (const [img, at] of [
		[reach, r.reachAt],
		[crinkle, r.wearAt]
	] as const) {
		const pattern = ctx.createPattern(img, 'repeat');
		if (!pattern) continue;
		const k = TILE_W / img.naturalWidth;
		pattern.setTransform(new DOMMatrix().translate(at[0], at[1]).scale(k));
		ctx.fillStyle = pattern;
		ctx.fillRect(0, 0, w, h);
	}

	// 3. Filled with the card's ink.
	ctx.globalCompositeOperation = 'source-in';
	ctx.fillStyle = r.ink;
	ctx.fillRect(0, 0, w, h);
}

export function bakeWear(node: HTMLElement) {
	if (!isWebKit()) return;
	const flat = document.createElement('canvas');
	const notched = document.createElement('canvas');
	flat.className = 'wear-flat';
	notched.className = 'wear-notched';
	let size = '';
	let alive = true;

	const render = async () => {
		const [crinkle, reach] = await loadTextures();
		if (!alive || !node.isConnected) return;
		const w = node.offsetWidth;
		const h = node.offsetHeight;
		if (!w || !h || `${w}x${h}` === size) return;
		size = `${w}x${h}`;
		// HOOKER: a re-bake (the window resized, so the card did) runs with `.wear-baked` already on, and that
		// class sets `background: none`, so the ink would read as transparent. Lift it for the read and put it
		// back in the same task: nothing paints in between, and the canvases keep showing.
		node.classList.remove('wear-baked');
		const cs = getComputedStyle(node);
		const ink = cs.backgroundColor;
		node.classList.add('wear-baked');
		const recipe: Recipe = {
			w,
			h,
			band: px(cs.getPropertyValue('--wear-band'), 11.4),
			corner: px(cs.getPropertyValue('--wear-corner'), 49.4),
			// The card's own notch, from its inline style (a flying card overrides the computed one to 0).
			notchW: px(node.style.getPropertyValue('--notch-w')),
			notchH: px(node.style.getPropertyValue('--notch-h')),
			wearAt: pair(node.style.getPropertyValue('--wear-at') || '0 0'),
			reachAt: pair(node.style.getPropertyValue('--wear-reach-at') || '0 0'),
			ink
		};
		draw(flat, { ...recipe, notchW: 0, notchH: 0 }, crinkle, reach);
		draw(notched, recipe, crinkle, reach);
		if (!flat.isConnected) node.append(flat, notched);
		node.classList.add('wear-baked');
	};

	void render();
	// Only at rest: a card's layout box does not change while a transform moves it.
	const ro = new ResizeObserver(() => void render());
	ro.observe(node);
	return {
		destroy() {
			alive = false;
			ro.disconnect();
		}
	};
}

// Start fetching the textures as soon as the card component is loaded, so the first card bakes at once.
if (typeof window !== 'undefined' && isWebKit()) void loadTextures();
