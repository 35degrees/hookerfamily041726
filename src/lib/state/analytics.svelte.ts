/**
 * analytics.svelte.ts — WHO READS THE SITE, NOT COUNTING SAM (Oct 25).
 *
 * Vercel Web Analytics: cookieless, first-party (the script and its beacons are served from
 * hookerverse.com's own /_vercel/insights/), no consent banner, no Google. SEO_PLAN §10a.
 *
 * THE NUMBERS ARE OUTSIDE READERS ONLY, and three fences make them so:
 *
 *   1. ONLY ON hookerverse.com. hooker-test.vercel.app is the same build and Sam's testing host — he
 *      plows through it clicking everything — so the script is never even loaded there, nor on localhost
 *      or a per-deploy address.
 *   2. NOT WHILE SAM IS SIGNED IN. The account is matched by the SHA-256 of its email, so the address
 *      itself never ships in public JS.
 *   3. NEVER AGAIN ON A DEVICE SAM HAS SIGNED IN ON. The match leaves a flag in that browser's
 *      localStorage, so signing out on his phone does not start counting him.
 *
 * THE FIRST PAGEVIEW WAITS FOR THE SESSION. inject() reports a view the moment it runs; run before the
 * session resolves and Sam's own landing would be counted before he was recognised. So inject waits
 * for auth.isPending to clear (or ~4s, if the session never answers), and `beforeSend` re-checks on
 * every view after that — signing in mid-visit stops the count from the next view on.
 *
 * Person-to-person navigation is shallow routing (navigate.ts: goto(…, { shallow: true }) →
 * history.pushState), which the script's own pushState tracking reports as a pageview per person.
 */
import { inject } from '@vercel/analytics';
import { auth } from '#lib/state/auth.svelte.js';

const HOST = 'hookerverse.com';
/** sha256('samhooker@gmail.com') */
const OWNER_SHA256 = '5ce8aab131e53d461d0da4b2844208132eebbcebe40764e8c3794c23cda71366';
const OWNER_KEY = 'hv-owner';
const SESSION_WAIT_MS = 4000;

let ownerDevice = false;
let injected = false;

function readOwnerFlag(): boolean {
	try {
		return localStorage.getItem(OWNER_KEY) === '1';
	} catch {
		return false;
	}
}

async function sha256(text: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function recognise(email: string | null | undefined): Promise<void> {
	if (!email || ownerDevice) return;
	if ((await sha256(email.trim().toLowerCase())) !== OWNER_SHA256) return;
	ownerDevice = true;
	try {
		localStorage.setItem(OWNER_KEY, '1');
	} catch {
		// private window: still not counted for this visit, just not remembered
	}
}

function start(): void {
	if (injected) return;
	injected = true;
	inject({ mode: 'production', beforeSend: (event) => (ownerDevice ? null : event) });
}

/** Called once from the root layout's onMount. Returns the cleanup. */
export function startAnalytics(): () => void {
	if (location.hostname !== HOST) return () => {};
	ownerDevice = readOwnerFlag();
	const timer = setTimeout(start, SESSION_WAIT_MS);
	const stop = $effect.root(() => {
		$effect(() => {
			if (auth.isPending) return;
			const email = auth.user?.email;
			void recognise(email).then(() => {
				clearTimeout(timer);
				start();
			});
		});
	});
	return () => {
		clearTimeout(timer);
		stop();
	};
}
