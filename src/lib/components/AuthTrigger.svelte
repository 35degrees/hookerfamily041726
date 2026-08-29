<script lang="ts">
	/**
	 * AuthTrigger — ONE SLOT, TWO LABELS. Signed out it reads "Sign In"; signed in it reads
	 * "Hi, <name>!". Same element, same position, same handler.
	 *
	 * A WORD, NOT AN AVATAR DISC, and Sam's answer was better than the proposal it replaced. I had
	 * suggested collapsing to a disc on sign-in to stop the corner growing. But §45.15 built this
	 * corner on the rule that a control CHANGES STATE, NOT COSTUME — the Shuffle's own doctrine —
	 * and swapping a word for a disc is a costume change in the one place this app has been most
	 * careful about them. A label that re-reads is the same object saying something new.
	 *
	 * It also answers the crowding without a new species: the corner gains ONE control (My Bookmarks,
	 * slice 5) rather than two, because this slot is reused rather than added to.
	 *
	 * IT TAKES SEARCH'S TREATMENT EXACTLY, not approximately — same type, same ground-awareness, same
	 * zone rule. Two bare words in one cluster that agreed only roughly would read as a bug the first
	 * time both were on screen, which they always are. Copied rather than shared, per §46.2: these are
	 * two controls that happen to look alike, not one control rendered twice.
	 */
	import { openModal } from '$lib/state/modal.svelte';
	import { auth } from '$lib/state/auth.svelte';
	import { GROUNDS, groundState } from '$lib/state/ground.svelte';
	import { ascension } from '$lib/state/ascension.svelte';

	/** §29 / §41.3, as SearchTrigger records at length: five of the seven grounds are LIGHT, so ink
	 *  tuned against midnight is invisible on the sheet the reader sees most of the time. */
	const onDark = $derived(GROUNDS[groundState.idx]?.kind === 'dark');
	/** The zone paints over whatever the ground was, so it outranks it and this rule comes last. */
	const inZone = $derived(ascension.active);

	/**
	 * RENDER NOTHING WHILE THE SESSION IS RESOLVING.
	 *
	 * Treating pending as signed-out would flash "Sign In" on every visit by a signed-in reader and
	 * then swap a beat later. That is §30's "the stage must not move" applied to two words: the label
	 * arrives once, already correct, and an empty slot for ~100ms is invisible where a swap is not.
	 */
	const label = $derived(auth.signedIn ? `Hi, ${auth.greetingName}!` : 'Sign In');
</script>

{#if !auth.isPending}
	<span
		class="auth-trigger"
		class:on-dark={onDark}
		class:in-zone={inZone}
		role="button"
		tabindex="0"
		title={auth.signedIn ? 'Your account' : 'Sign in to save entries and set your home card'}
		onclick={() => openModal('auth')}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openModal('auth');
			}
		}}
	>
		{label}
	</span>
{/if}

<style>
	/* SEARCHTRIGGER'S TYPE, TO THE VALUE. 500 12px Inter is what all the fixed chrome uses, so the
	   corner reads as one typographic family even though the Shuffle has a shell and these two do not. */
	.auth-trigger {
		display: inline-flex;
		align-items: center;
		font: 500 12px/1 var(--font-inter, sans-serif);
		letter-spacing: 0.02em;
		color: rgba(43, 38, 32, 0.7);
		cursor: pointer;
		user-select: none;
		padding: 6px 2px;
		transition: color 180ms ease-out;
		/* The greeting is longer than "Sign In" and varies by name. Nothing else in the cluster may
		   move when it changes, so it does not wrap — the flex row absorbs the width. */
		white-space: nowrap;
	}
	.auth-trigger:hover,
	.auth-trigger:focus-visible {
		color: rgba(43, 38, 32, 0.98);
		outline: none;
	}
	/* DARK GROUNDS (Midnight, Pine) — §41.3: cream ink is defined entirely by the dark behind it. */
	.auth-trigger.on-dark {
		color: rgba(255, 250, 240, 0.72);
	}
	.auth-trigger.on-dark:hover,
	.auth-trigger.on-dark:focus-visible {
		color: rgba(255, 250, 240, 0.96);
	}
	/* THE ZONE OUTRANKS THE GROUND — painted over whatever the ground was, so this wins for light and
	   dark alike. The timeline rail's own cream at the rail's own 0.82, same as SearchTrigger. */
	.auth-trigger.in-zone {
		color: rgba(247, 241, 230, 0.82);
	}
	.auth-trigger.in-zone:hover,
	.auth-trigger.in-zone:focus-visible {
		color: rgba(247, 241, 230, 1);
	}
</style>
