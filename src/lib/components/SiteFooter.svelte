<script lang="ts">
	import { stage } from '#lib/state/stage.svelte.js';
	/**
	 * SiteFooter — the bottom-right corner (Sam, Oct 9): "About", "Contact", "Sources", "Privacy" and "© 2026".
	 * About and Contact were one link, "About / Contact", until Oct 26 (Sam: "separate the two items, About goes to my
	 * card, Contact opens the Contact modal from whatever page the person is on").
	 *
	 * It took the seat of the Manuscript ground toggle (removed Oct 9, see Field.svelte), and it takes
	 * the corner chrome's type rather than inventing its own: 500 12px Inter in the house ink, one step back at
	 * rest, full on hover, cream in the zone — SearchTrigger's rules, so the two corners read as one family.
	 *
	 * ABOUT IS A PERSON, not a page. It flies to Samuel Talcott Hooker's card — the compiler's own
	 * entry, whose blocks say who built this and why, with the contact form one click away in its NB 3 — on
	 * the standard lateral CC flight. CONTACT is a pop-up like Privacy and Sources: it opens over the card the reader
	 * is on, and its address is /contact (surfaces.ts). The link in Sam's NB 3 stays. ccFlyTo is the shared "fly to a named person from something that is not
	 * a chip" path (the Notable People button and the timeline portraits use it), and the two guards are the
	 * portraits' own: nothing while a flight is running, nothing when that card is already the one on screen.
	 */
	import { ccFlyTo } from '#lib/state/shuffle.svelte.js';
	import { isFlightLocked } from '#lib/state/flightLock.js';
	import { featured } from '#lib/state/featured.svelte.js';
	import { GROUNDS, groundState } from '#lib/state/ground.svelte.js';
	import { ascension } from '#lib/state/ascension.svelte.js';
	import { openModal } from '#lib/state/modal.svelte.js';
	import { trackEvent } from '#lib/state/analytics.svelte.js';
	import { personHref } from '#lib/paths.js';
	import { surfaceHref, type SurfaceKind } from '#lib/surfaces.js';

	/** HD3386's slug. Living, so the year is withheld from it; if his name ever changes, redirects.json maps
	 *  the old slug and the warm path falls back to a real navigation that follows it. */
	const ABOUT_SLUG = 'samuel-hooker';
	/**
	 * INLINE — the PHONE footer (Sam, Oct 24: "on a phone i want all footer items… all four items oriented
	 * horizontally right aligned with 2026 at the right"). Not the fixed corner: on a phone the page scrolls, so the
	 * footer is the last thing in the stage's own column, a fixed gap below the last child chip (+page.svelte
	 * `.phone-footer`), and it moves with the content rather than floating over it. The two rows simply sit side
	 * by side, which is exactly the order asked for: Privacy · Sources · About · Contact · © 2026.
	 */
	let { inline = false }: { inline?: boolean } = $props();
	const YEAR = 2026;

	const onDark = $derived(GROUNDS[groundState.idx]?.kind === 'dark');
	const inZone = $derived(ascension.active);

	// REAL LINKS SINCE OCT 26 (SEO_PLAN §5.8): Google reads an <a href>, never a button, and these are the pages
	// that say who made the site and what it keeps. A plain click is unchanged — the flight, or the pop-up in
	// place; a modified or middle click is the browser's (a new tab at the real address).
	const plainClick = (e: MouseEvent) =>
		e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
	function onAbout(e: MouseEvent) {
		if (!plainClick(e)) return;
		e.preventDefault(); // before the guards: a swallowed click must not fall through to a page load
		if (isFlightLocked() || featured.current?.person.slug === ABOUT_SLUG) return;
		trackEvent('About', { card: featured.current?.person.slug ?? '' }); // a custom event, like the pop-ups (modal.svelte.ts)
		void ccFlyTo(e.currentTarget as HTMLElement, { slug: ABOUT_SLUG, t: null }, { via: 'About' });
	}
	function onSurface(e: MouseEvent, kind: SurfaceKind) {
		if (!plainClick(e)) return;
		e.preventDefault();
		openModal(kind);
	}
</script>

<!-- TWO SHORT ROWS, RIGHT-ALIGNED (Sam, Oct 9: "we can't just build out to the left"). The corner shares its
     height with the children row, so the footer grows UP into empty paper rather than LEFT into the chips:
     the primary row (About, Contact and the year) at 11px, 8% under the corner chrome's 12, nearest the corner;
     the secondary links above it, smaller again. Narrower than the one-row footer was with half the links. -->
<footer
	class="site-footer"
	class:on-dark={onDark}
	class:in-zone={inZone}
	class:stacked={stage.tabletLandscape && !inline}
	class:inline
>
	<!-- THE SMALL ROW ON TOP (Sam, Oct 9): Privacy then Sources, right-aligned, so Sources holds the corner's edge.
	     PRIVACY IS FOR EVERYONE NOW (Oct 24). It was signed-in only, but the contact form collects a visitor's name and
	     email whether or not they have an account, and a privacy statement is something Google's quality guidelines and
	     California's CalOPPA both expect to be conspicuous. PrivacyModal already reads correctly signed out ("When you
	     sign in, this site keeps…", and the contact form's note); its Delete button stays signed-in only. -->
	<div class="row secondary">
		<a class="about" href={surfaceHref('privacy')} onclick={(e) => onSurface(e, 'privacy')}>Privacy</a>
		<a class="about" href={surfaceHref('sources')} onclick={(e) => onSurface(e, 'sources')}>Sources</a>
	</div>
	<div class="row primary">
		<a class="about" href={personHref(ABOUT_SLUG)} onclick={onAbout}>About</a>
		<a class="about" href={surfaceHref('contact')} onclick={(e) => onSurface(e, 'contact')}>Contact</a>
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
	/* STACKED, one item to a line, on an iPad mini or Air in landscape (Oct 21, Sam): the corner beside the blade is
	   narrow there. Privacy, Sources, About, Contact, © — right-aligned as before; five lines since About and Contact
	   split (Oct 26). */
	.site-footer.stacked .row {
		flex-direction: column;
		align-items: flex-end;
		gap: 0;
	}
	/* …all five lines one size, evenly spaced, the primary row a step smaller so it clears the blade (Oct 21, Sam). */
	.site-footer.stacked {
		gap: 0;
	}
	.site-footer.stacked .row,
	.site-footer.stacked .row.primary,
	.site-footer.stacked .row.secondary {
		font-size: 10px;
		line-height: 15px;
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
		display: inline-block;
		text-decoration: none;
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
	/* THE PHONE ROW (Oct 24): in the page's flow, one line, right-aligned, © last. One size for all five — a phone
	   reader taps these, so 12px with a taller hit area rather than the corner's 10/11 split. */
	.site-footer.inline {
		position: static;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		gap: 14px;
		width: 100%;
	}
	.site-footer.inline .row,
	.site-footer.inline .row.primary,
	.site-footer.inline .row.secondary {
		gap: 14px;
		font-size: 12px;
	}
	.site-footer.inline .about {
		padding: 10px 2px;
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
