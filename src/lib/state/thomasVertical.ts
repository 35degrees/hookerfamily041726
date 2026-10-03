/**
 * thomasVertical.ts — THE THOMAS EXCEPTION (Sam, 2 Oct 2026). One rule, shared by the timeline portraits
 * and search, so the two can never disagree.
 *
 * Thomas is "above" everyone in the tree, so the move between him and his line reads VERTICALLY:
 *   • to THOMAS from a Hooker-line person or a Hooker spouse → 'up' (he is their ancestor);
 *   • FROM Thomas's card to a Hooker-line person or Hooker spouse → 'down' (they are his line).
 * Every other navigation is untouched — lateral as it always was (PFC Gridley Strong to J.P. Morgan is a
 * sideways move between cousins, not a descent). Also lateral: Thomas's father and siblings (not his line —
 * the father is an easter egg, the siblings neither), in-law easter eggs, and Thomas's own wife, who is his
 * generation rather than below him (on the rail her click becomes the spouse swap before this is asked).
 *
 * Surgical by Sam's instruction: "only to Thomas", never a general vertical rule. An earlier version sent
 * every Hooker-line rail portrait UP from anywhere, and was reverted for exactly that.
 */
import { featured } from './featured.svelte';

export const THOMAS_SLUG = 'thomas-hooker-1586';
const THOMAS_ID = 'H00001';

/** `targetIsLine` — the target is Hooker line or married into it (payload hd || sp; search CAT.HD | CAT.SPOUSE). */
export function thomasVertical(targetSlug: string, targetIsLine: boolean): 'up' | 'down' | undefined {
	const cur = featured.current;
	if (!cur || cur.person.slug === targetSlug) return undefined;
	if (targetSlug === THOMAS_SLUG) {
		const focus = cur.neighborhood?.focus;
		const onLine = !!(focus?.hd || focus?.sp);
		const hisWife = (cur.neighborhood?.spouses ?? []).some((m) => m.spouse?.id === THOMAS_ID);
		return onLine && !hisWife ? 'up' : undefined;
	}
	if (cur.person.slug === THOMAS_SLUG && targetIsLine) return 'down';
	return undefined;
}
