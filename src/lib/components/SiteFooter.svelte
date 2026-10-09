<script lang="ts">
	/**
	 * SiteFooter — the bottom-right corner (Sam, Oct 9): "About / Contact", "Sources", "Privacy" (signed in only)
	 * and "© 2026".
	 *
	 * It took the seat of the Manuscript ground toggle (removed Oct 9, see Field.svelte), and it takes
	 * the corner chrome's type rather than inventing its own: 500 12px Inter in the house ink, one step back at
	 * rest, full on hover, cream in the zone — SearchTrigger's rules, so the two corners read as one family.
	 *
	 * ABOUT / CONTACT IS A PERSON, not a page. It flies to Samuel Talcott Hooker's card — the compiler's own
	 * entry, whose blocks say who built this and why, with the contact form one click away in its NB 3 — on
	 * the standard lateral CC flight. ccFlyTo is the shared "fly to a named person from something that is not
	 * a chip" path (the Notable People button and the timeline portraits use it), and the two guards are the
	 * portraits' own: nothing while a flight is running, nothing when that card is already the one on screen.
	 */
	import { ccFlyTo } from '#lib/state/shuffle.svelte.js';
	import { isFlightLocked } from '#lib/state/flightLock.js';
	import { featured } from '#lib/state/featured.svelte.js';
	import { GROUNDS, groundState } from '#lib/state/ground.svelte.js';
	import { ascension } from '#lib/state/ascension.svelte.js';
	import { auth } from '#lib/state/auth.svelte.js';
	import { openModal } from '#lib/state/modal.svelte.js';

	/** HD3386's slug. Living, so the year is withheld from it; if his name ever changes, redirects.json maps
	 *  the old slug and the warm path falls back to a real navigation that follows it. */
	const ABOUT_SLUG = 'samuel-hooker';
	const YEAR = 2026;

	const onDark = $derived(GROUNDS[groundState.idx]?.kind === 'dark');
	const inZone = $derived(ascension.active);

	function onAbout(e: MouseEvent) {
		if (isFlightLocked() || featured.current?.person.slug === ABOUT_SLUG) return;
		void ccFlyTo(e.currentTarget as HTMLElement, { slug: ABOUT_SLUG, t: null });
	}
</script>

<!-- TWO SHORT ROWS, RIGHT-ALIGNED (Sam, Oct 9: "we can't just build out to the left"). The corner shares its
     height with the children row, so the footer grows UP into empty paper rather than LEFT into the chips:
     the primary row (About / Contact and the year) at 11px, 8% under the corner chrome's 12, nearest the corner;
     the secondary links above it, smaller again. Narrower than the one-row footer was with half the links. -->
<footer class="site-footer" class:on-dark={onDark} class:in-zone={inZone}>
	<!-- THE SMALL ROW ON TOP (Sam, Oct 9): Privacy then Sources, right-aligned, so Sources holds the corner's edge and
	     Privacy appears beside it only for a signed-in reader (it is about what an account stores, and holds the delete). -->
	<div class="row secondary">
		{#if auth.signedIn}
			<button type="button" class="about" onclick={() => openModal('privacy')}>Privacy</button>
		{/if}
		<button type="button" class="about" onclick={() => openModal('sources')}>Sources</button>
	</div>
	<div class="row primary">
		<button type="button" class="about" onclick={onAbout}>About / Contact</button>
		<span class="copy" aria-label="Copyright {YEAR}">© {YEAR}</span>
	</div>
</footer>

<style>
	.site-footer {
		position: fixed;
		right: 16px;
		bottom: 12px;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1px;
		font-family: var(--font-inter, sans-serif);
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0.02em;
	}
	.row {
		display: flex;
		align-items: center;
	}
	.row.primary {
		gap: 12px;
		font-size: 11px; /* 8% under the corner chrome's 12px (Sam) */
	}
	.row.secondary {
		gap: 10px;
		font-size: 10px;
	}
	.about {
		padding: 4px 1px;
		border: 0;
		background: none;
		font: inherit;
		letter-spacing: inherit;
		color: rgba(43, 38, 32, 0.7);
		cursor: pointer;
		transition: color 180ms ease-out;
	}
	.about:hover,
	.about:focus-visible {
		color: rgba(43, 38, 32, 0.98);
		outline: none;
	}
	/* The copyright is information, not a control: a step further back than the link beside it. */
	.copy {
		color: rgba(43, 38, 32, 0.5);
		user-select: none;
	}
	.site-footer.on-dark .about {
		color: rgba(255, 250, 240, 0.72);
	}
	.site-footer.on-dark .about:hover,
	.site-footer.on-dark .about:focus-visible {
		color: rgba(255, 250, 240, 0.96);
	}
	.site-footer.on-dark .copy {
		color: rgba(255, 250, 240, 0.5);
	}
	/* The zone outranks the ground, as it does for Search — this rule comes last. */
	.site-footer.in-zone .about {
		color: rgba(247, 241, 230, 0.82);
	}
	.site-footer.in-zone .about:hover,
	.site-footer.in-zone .about:focus-visible {
		color: rgba(247, 241, 230, 1);
	}
	.site-footer.in-zone .copy {
		color: rgba(247, 241, 230, 0.55);
	}
</style>
