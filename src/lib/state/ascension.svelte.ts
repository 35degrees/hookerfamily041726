/**
 * ascension.svelte.ts — THE ZONE'S MEMORY (roadmap §40).
 *
 * An orbit entry is a person the tree reaches ONLY by cross-connection, and arriving at one is THE
 * ASCENSION: the card comes head-on out of the foreground, the ground goes to midnight, and an X
 * appears to come back down. Sam: "it's like the user is entering a new special zone, like an
 * ascension… the X is an exit to the holy zone."
 *
 * THIS FILE HOLDS ONE FACT: the slug the user was on when they ascended. Everything else the zone
 * needs is already derivable — `featured.current.person.orbit` says whether we are IN it, and the
 * flight's axis is a DELTA across a navigation rather than a state anybody has to store.
 *
 * WHY A REFERRER AT ALL, when the browser has history. Because the X must NOT be a back button.
 * Back/forward goes through the popstate reconcile in +page.svelte, which calls `loadFeatured(slug)`
 * with no flight captures — so it SNAPS, with no flight of any kind. The X has to perform the descent,
 * which means knowing where to descend to. It is also the only return path that survives a missing
 * reciprocal, and there is at least one (William Wadsworth → John Talcott has none).
 *
 * A SINGLE SLOT, NOT A STACK, and deliberately. Moving around inside the zone (Lincoln → his son, a
 * spouse swap) must not deepen anything — those are ordinary navigations that happen to occur in the
 * dark, and the X still means "leave, back to where I came in". The slot is written on the way IN and
 * never on a move within, so it always names the tree card that opened the door.
 */
import { featured } from './featured.svelte';

const HARTFORD = 'hartford_founder';
/** Thomas Hooker carries the tag and is excluded by name — see the note on `founder` below. */
const isFounder = (f: any): boolean =>
	f?.person?.id !== 'H00001' && Array.isArray(f?.person?.tags) && f.person.tags.includes(HARTFORD);
/**
 * MARRIED TO ONE. Answered in buildFeatured rather than here, because the spouse's tags live in the
 * payload's `context` and the builder is the last thing holding it — see the note there. The first
 * attempt read `featured.current.context` and silently got `undefined`: FeaturedData is an EXPLICIT
 * MAP, so anything not named in it does not exist downstream. Same trap that swallowed the Ascension's
 * own orbit flag on its first run.
 */
const isFounderSpouse = (f: any): boolean => f?.founderSpouse === true;

/** The tree card the user ascended FROM. Null whenever we are not in the zone. */
let enteredFrom = $state<string | null>(null);

export const ascension = {
	/** Are we in the zone right now? The one predicate; the ground, the X and the rail all read it. */
	get active(): boolean {
		return featured.current?.orbit === true;
	},
	/**
	 * ── THE FOUNDER ZONE ────────────────────────────────────────────────────────────────────────────
	 * Sam: "let's call this the founder zone, along the lines of us calling the orbits entering and
	 * exiting the ascension zone… re-use the existing ascension zone styling for the cards and
	 * background but change the background colour from midnight blue to GREEN."
	 *
	 * It is a SKIN ON THE ASCENSION, not a second zone. Everything — the depth flight, the veil's
	 * schedule, the X, the sprites, the rail's day/night crossing — is identical; two colours differ.
	 * Building it as a parallel mechanism would have doubled the surface area of the hardest feature in
	 * the app to change a ground and a rule.
	 *
	 * MEMBERSHIP IS THE EXISTING TAG. `hartford_founder` was already in the schema's founding tag family
	 * and ten people already carried it — so there is no `is_hartford_founder` boolean, and adding one
	 * would have created a second way to say one thing. It reaches the client because person payloads
	 * already carry `tags`; no pipeline change was needed.
	 *
	 * THOMAS HOOKER IS EXCLUDED BY NAME. He carries the tag — he did found Hartford — but Sam: "the
	 * Hartford founders, excluding Thomas Hooker himself of course." He is the tree's origin, not one of
	 * its orbiting figures, and he is not in a detached component anyway; the guard is belt and braces.
	 */
	get founder(): boolean {
		return isFounder(featured.current) || isFounderSpouse(featured.current);
	},
	/** True only for the MARRIED-IN case — the card needs it to word its own title. */
	get founderSpouse(): boolean {
		return !isFounder(featured.current) && isFounderSpouse(featured.current);
	},
	/** Where the X goes. Null means the zone was entered cold (a direct URL) — see exitTarget. */
	get from(): string | null {
		return enteredFrom;
	}
};

/** Record the door on the way in. Called from the click that crosses INTO the zone, never on a move
 *  within it — see the single-slot note above. */
export function markAscent(fromSlug: string | null): void {
	enteredFrom = fromSlug;
}

/** Forget it on the way out, so a later cold load into the zone cannot inherit a stale door. */
export function clearAscent(): void {
	enteredFrom = null;
}
