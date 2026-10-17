/**
 * gate.ts — the page's transitions, asked per flight which engine moves the board.
 *
 * While the WebKit engine flies (from the swap to the landing; Safari only, and only for the flights it
 * knows, see state/navigate.ts) it poses and moves every arriving element itself and keeps every leaving one
 * mounted with `depart`, so Svelte's own transitions stand down: `in:` does nothing, `out:` becomes
 * `depart`, `animate:flip` does nothing (the engine glides survivors). At every other moment, and always in
 * Chrome, each of these IS Hooker's transition, called with the same arguments: Chrome's code path does not
 * change by a single call.
 */
import { flip } from 'svelte/animate';
import { growFrom, shrinkTo, morphIn, markPending, flyOut, chipExit } from '../flight.js';
import { depart, engineFlying } from './flight.js';

const NONE = { duration: 0 };

export const growFromGated = (node: Element) => (engineFlying() ? NONE : growFrom(node));

export const shrinkToGated = (node: Element, params: { id: string }) =>
	engineFlying() ? depart(node, { key: params.id, card: true }) : shrinkTo(node, params);

export const morphInGated = (node: Element, params: { id: string }) =>
	engineFlying() ? NONE : morphIn(node, params);

export const markPendingGated = (node: Element) => (engineFlying() ? NONE : markPending(node));

export const flyOutGated = (node: Element, params: { key: string }) =>
	engineFlying() ? depart(node, { key: params.key }) : flyOut(node, params);

export const chipExitGated = (node: Element, params: { key: string }) =>
	engineFlying() ? depart(node, { key: params.key }) : chipExit(node, params);

export const flipGated = (
	node: Element,
	rects: { from: DOMRect; to: DOMRect },
	params: Parameters<typeof flip>[2]
) => (engineFlying() ? NONE : flip(node, rects, params));
