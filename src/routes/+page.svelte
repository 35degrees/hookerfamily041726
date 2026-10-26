<script lang="ts">
	/**
	 * `/` — the intro (100226). Renders nothing itself: the overlay is in the layout. On mount it starts
	 * the intro and replaces this entry with the arriving card's page, which mounts UNDER the overlay and
	 * holds itself blank until the overlay has faded to paper (#lib/state/intro.svelte.ts). replaceState,
	 * so there is no `/` entry to go Back to and a refresh lands on the card — the intro never replays.
	 * Direct `/<slug>` links never come through here, so they never see it.
	 *
	 * WHICH CARD: YOUR HOME CARD IF YOU HAVE ONE, else Thomas (Sam, 100526: "the entry that I've tagged
	 * as my home card should be the one that appears when i move forward from the painting. instead its
	 * always thomas hooker"). The spec always said so (§50.3); this is the wiring.
	 *
	 * THE GOTO WAITS FOR THE ANSWER, and that is safe because nothing is waiting on it yet. The overlay
	 * shows its Enter arrow only once the page beneath has mounted (`intro.ready`), which is ~5s in — the
	 * title, the light and the painting all play first. Resolving the home card takes the session (~100ms)
	 * and, for a signed-in reader, the search index: heroes are stored by ID and payloads are keyed by
	 * slug, and the index is the app's one id → slug resolver (HomeTrigger and My Bookmarks resolve
	 * through it too, so it is the index those will want anyway). Capped at RESOLVE_MS so a slow network
	 * still gets Thomas in time for the arrow rather than a stalled intro.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { personHref } from '#lib/paths.js';
	import { SITE_ORIGIN, SITE_TITLE } from '#lib/site.js';
	import { DEFAULT_PREVIEW, PREVIEW_W, PREVIEW_H } from '#lib/seo.js';
	import { startIntro } from '#lib/state/intro.svelte.js';
	import { auth, refreshSession } from '#lib/state/auth.svelte.js';
	import { load, personById } from '#lib/state/search.svelte.js';

	const THOMAS_SLUG = 'thomas-hooker-1586';
	const RESOLVE_MS = 3500;

	// The one sentence under the site's name in a search result or a shared link (SEO_PLAN §5.7).
	const HOME_DESCRIPTION =
		'The descendants of Rev. Thomas Hooker, who founded Hartford, Connecticut, in 1636: four centuries of American history told through one family.';
	const websiteJsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': `${SITE_ORIGIN}/#website`,
		url: `${SITE_ORIGIN}/`,
		name: SITE_TITLE,
		description: HOME_DESCRIPTION,
		inLanguage: 'en-US',
		author: {
			'@type': 'Person',
			'@id': `${SITE_ORIGIN}${personHref('samuel-hooker')}#person`,
			name: 'Samuel Talcott Hooker',
			url: `${SITE_ORIGIN}${personHref('samuel-hooker')}`
		}
	}).replace(/</g, '\\u003c');

	async function homeSlug(): Promise<string> {
		while (auth.isPending) await new Promise((r) => setTimeout(r, 40));
		if (!auth.signedIn) return THOMAS_SLUG;
		// FROM THE DATABASE, not the 24h cookie (100626): a home card chosen in another browser must be the
		// one that rises here. One read per intro — see refreshSession in auth.svelte.ts.
		const fresh = await refreshSession();
		const id = fresh ? (fresh.heroPersonId ?? null) : auth.heroPersonId;
		if (!id || id === 'H00001') return THOMAS_SLUG;
		await load();
		// severed or merged since it was chosen — Thomas rather than a 404 under the painting
		return personById(id)?.slug ?? THOMAS_SLUG;
	}

	onMount(() => {
		startIntro();
		const cap = new Promise<string>((r) => setTimeout(() => r(THOMAS_SLUG), RESOLVE_MS));
		void Promise.race([homeSlug().catch(() => THOMAS_SLUG), cap]).then((slug) =>
			goto(personHref(slug), { replace: true })
		);
	});
</script>

<svelte:head>
	<title>{SITE_TITLE}</title>
	<link rel="canonical" href="{SITE_ORIGIN}/" />
	<!-- THE HOME PAGE'S TAGS (SEO_PLAN §5.7, step 6): invisible, the intro unchanged (Sam, Oct 24: "it all speaks for
	     itself"). The WebSite node is the one every person page's ProfilePage points at (`isPartOf` #website), and it
	     names Sam's own card as the author — how a search engine learns there is a real compiler behind the site. -->
	<meta name="description" content={HOME_DESCRIPTION} />
	<meta property="og:site_name" content={SITE_TITLE} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={SITE_TITLE} />
	<meta property="og:description" content={HOME_DESCRIPTION} />
	<meta property="og:url" content="{SITE_ORIGIN}/" />
	<meta property="og:image" content={DEFAULT_PREVIEW} />
	<meta property="og:image:width" content={String(PREVIEW_W)} />
	<meta property="og:image:height" content={String(PREVIEW_H)} />
	<meta property="og:image:alt" content={SITE_TITLE} />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${websiteJsonLd}</script>`}
</svelte:head>
