/**
 * True from the swap until the card lands, for flights the WebKit engine flies. The gate (gate.ts) reads it
 * to decide, per flight, whether Svelte's transitions or the engine move the board. A plain object, not
 * $state: it is read inside transition functions, where a reactive read would subscribe the effect to it.
 */
export const flightState = { active: false };
