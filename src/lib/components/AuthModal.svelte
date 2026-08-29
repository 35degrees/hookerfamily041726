<script lang="ts">
	/**
	 * AuthModal — THE FOURTH SURFACE, and a fourth FILE.
	 *
	 * Design §46.2 is the governing law and it is Sam's own words: "Paths to Thomas, Search and
	 * Connect to Anyone are all dependent on each other like you are trying to be code efficient and
	 * minimalize things. That is the wrong approach." Three modals are three files. Auth makes four.
	 *
	 *   shared      the veil's VALUES (copied, exactly as ConnectModal and SearchModal already copy
	 *               each other — the extraction TODO at SearchModal.svelte:630 stays undone), the
	 *               single slot in `modal.svelte.ts`, and §45.11's exit SHAPE
	 *   not shared  anything that renders
	 *
	 * The test before sharing anything: would a change made for one surface change the OTHER's
	 * behaviour? A fade written for connect-to-anyone once silently altered a shipped Paths-to-Thomas
	 * transition, and that is the failure §46.2 exists to prevent.
	 *
	 * THERE IS NO FORM, AND THAT IS THE DESIGN. Google-only (§18.1) removes every field — no email,
	 * no password, no confirm, no reset. Which lands this on the right side of §45.12: this app
	 * contains no widgets, every control is a physical object. A login form with two fields and a
	 * confirm-password would be the year-slider mistake in a new place; a single button is an object
	 * you press, which is the species everything else here already is.
	 *
	 * IT IS SMALL ON PURPOSE. The panel is 380px against search's 520, because a modal sized for a
	 * list when it holds one button reads as a room with one chair in it.
	 */
	import { modal, closeModal } from '$lib/state/modal.svelte';
	import { ascension } from '$lib/state/ascension.svelte';
	import { auth, signInWithGoogle, signOut } from '$lib/state/auth.svelte';
	import { linear, cubicOut } from 'svelte/easing';

	/**
	 * §45.11'S NUMBERS, TAKEN RATHER THAN RE-DERIVED. The content leaves first and the ground closes
	 * behind it; reverse that and the room disappears while the furniture is still in it. These are
	 * the trimmed values Sam settled on ("even a beat faster fade out"), and they are copied because
	 * two overlays over the same tree that agreed only roughly would read as a bug the moment you
	 * opened one after the other.
	 */
	const VEIL_IN_MS = 340;
	const VEIL_BLUR = 10;
	const PANEL_OUT_MS = 250;
	const VEIL_OUT_DELAY = 90;
	const VEIL_OUT_MS = 430;

	const open = $derived(modal.kind === 'auth');
	/** True from the moment a close begins until the transitions finish — see the pointer-events note. */
	let leaving = $state(false);
	$effect(() => {
		if (open) leaving = false;
	});

	let busy = $state(false);

	function dismiss() {
		leaving = true;
		closeModal();
	}

	async function onSignIn() {
		if (busy) return;
		busy = true;
		try {
			// Navigates away to Google; nothing after this runs on success. `busy` stays true so the
			// button cannot be double-fired during the beat before the browser leaves.
			await signInWithGoogle();
		} catch {
			busy = false;
		}
	}

	async function onSignOut() {
		if (busy) return;
		busy = true;
		try {
			await signOut();
			dismiss();
		} finally {
			busy = false;
		}
	}

	/** §45.11's Svelte trap, written down there and worth not re-learning: a custom transition
	 *  SILENTLY IGNORES any option it does not destructure. `delay` was missing once and the whole
	 *  choreography simply was not there — no warning, no error. */
	function panel(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${((1 - t) * -8).toFixed(2)}px);`
		};
	}

	function veil(_node: Element, { duration, delay = 0 }: { duration: number; delay?: number }) {
		return {
			delay,
			duration,
			easing: linear,
			// Alpha and blur on ONE `t` — an element's opacity does not scale the result of its own
			// backdrop-filter, so driving them separately blurs the tree before the ground arrives.
			css: (t: number) => {
				const e = t * t * (3 - 2 * t);
				const b = (VEIL_BLUR * e).toFixed(2);
				return `opacity: ${e}; backdrop-filter: blur(${b}px); -webkit-backdrop-filter: blur(${b}px);`;
			}
		};
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			dismiss();
		}
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

{#if open}
	<div
		class="veil"
		class:zone={ascension.active}
		class:leaving
		in:veil={{ duration: VEIL_IN_MS }}
		out:veil={{ duration: VEIL_OUT_MS, delay: VEIL_OUT_DELAY }}
		onclick={dismiss}
		role="presentation"
	></div>

	<div class="auth-layer" role="dialog" aria-modal="true" aria-label="Your account">
		<div class="panel" in:panel={{ duration: 300, delay: 40 }} out:panel={{ duration: PANEL_OUT_MS }}>
			<!-- THE LADDER'S HEADER, taken rather than reinvented: title left, X pushed right by
			     `margin-left: auto`, both inkblue and told apart from the content by WEIGHT and SIZE
			     rather than hue. ConnectModal records why they are not cream — §41.3, cream ink is
			     defined entirely by the dark behind it, and marshmallow is a shade of the PAGE. -->
			<div class="head">
				<span class="head-title">{auth.signedIn ? 'Account' : 'Sign In'}</span>
				<button type="button" class="head-x" onclick={dismiss} aria-label="Close">
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path
							d="M6 6 L18 18 M18 6 L6 18"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>

			{#if auth.signedIn}
				<div class="who">
					{#if auth.user?.image}
						<img class="avatar" src={auth.user.image} alt="" referrerpolicy="no-referrer" />
					{/if}
					<div class="who-text">
						<span class="who-name">{auth.user?.name}</span>
						<span class="who-email">{auth.user?.email}</span>
					</div>
				</div>
				<button type="button" class="act ghost" onclick={onSignOut} disabled={busy}>
					{busy ? 'Signing out…' : 'Sign out'}
				</button>
			{:else}
				<!-- WHAT SIGNING IN IS FOR, in one line. Sam: "the benefits of logging in will be solid
				     but minimal." A reader deciding whether to hand over an identity is owed the reason,
				     and the reason is small enough to state exactly rather than sell. -->
				<p class="why">
					Save entries you want to come back to, and choose whose card greets you instead of
					Thomas Hooker.
				</p>
				<button type="button" class="act google" onclick={onSignIn} disabled={busy}>
					<svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true">
						<path
							fill="#4285F4"
							d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
						/>
						<path
							fill="#34A853"
							d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
						/>
						<path
							fill="#FBBC05"
							d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
						/>
						<path
							fill="#EA4335"
							d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
						/>
					</svg>
					{busy ? 'Opening Google…' : 'Continue with Google'}
				</button>
				<p class="fine">
					We store your name and email, and the entries you save. Nothing else.
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* THE MARSHMALLOW VEIL — the same ground as the ladder's and search's, and deliberately the same
	   VALUES rather than an approximation of them. Duplicated per §46.2; see the header. */
	/* ONCE A CLOSE HAS STARTED THE VEIL IS SCENERY. It outlives the panel by half a second, and a
	   full-screen element with a click handler over a stage that is already moving would eat the next
	   click and offer a second dismiss for something already dismissed. */
	.veil.leaving {
		pointer-events: none;
	}
	.veil {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(228, 226, 216, 0.36) 0%,
			rgba(222, 220, 210, 0.43) 55%,
			rgba(216, 214, 204, 0.49) 100%
		);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	/* IN THE ZONE THE VEIL COVERS FAR MORE — §29 exactly: these alphas are a property of the PAIR, and
	   the originals were measured against parchment. Over midnight they leave the panel as a bright
	   blob in a dark surround. SearchModal carries the full measurement table; these are its numbers. */
	.veil.zone {
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(233, 231, 223, 0.74) 0%,
			rgba(229, 227, 219, 0.78) 55%,
			rgba(224, 222, 214, 0.82) 100%
		);
	}
	.auth-layer {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* Search sits at 12vh because its results grow DOWNWARD and a centred box would walk up the
		   screen as they arrived (§30, the stage must not move). This panel has a fixed height and
		   nothing to grow into, so it can sit where a small object should — near the optical centre,
		   slightly high. */
		padding-top: 22vh;
		pointer-events: none;
	}
	.panel {
		pointer-events: auto;
		/* 380, not search's 520. A panel sized for a list of results, holding one button, reads as a
		   room with one chair in it. */
		width: min(380px, 92vw);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* HEADER — SearchModal's values, copied. */
	.head {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.head-title {
		margin-left: 6px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.83;
	}
	.head-x {
		margin-left: auto;
		/* The ladder's six pixels: a 22px glyph centred in a 34px target sits 6px proud of the edge. */
		margin-right: -6px;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		padding: 0;
		color: var(--color-inkblue);
		background: none;
		border: 0;
		opacity: 0.55;
		cursor: pointer;
		transition: opacity 200ms ease-out;
	}
	.head-x:hover,
	.head-x:focus-visible {
		opacity: 1;
		outline: none;
	}

	.why {
		margin: 0 6px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-inkblue);
		opacity: 0.78;
	}
	.fine {
		margin: 0 6px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 11px;
		line-height: 1.45;
		color: var(--color-inkblue);
		opacity: 0.5;
	}

	/**
	 * THE BUTTON IS AN OBJECT, AND IT BORROWS THE SHUFFLE'S PHYSICS (§45.12: this app contains no
	 * widgets). Hover raises it, the press gives back a FRACTION of that height and never crosses
	 * below the surface — Sam's rule, recorded at length in ShuffleNotables: a real button does not
	 * change colour when you approach it, it changes HEIGHT. Lighting the surface as well would be
	 * saying the same thing twice, and the second saying is what reads as a web widget.
	 */
	.act {
		--lift: -1.32px;
		--lift-shadow: 0 1.98px 3.96px rgba(20, 28, 46, 0.28);
		--press: -0.53px;
		--press-shadow: 0 0.79px 1.58px rgba(20, 28, 46, 0.25);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		width: 100%;
		padding: 11px 14px;
		font: 500 13px/1 var(--font-inter, sans-serif);
		border: 0;
		border-radius: 7px;
		cursor: pointer;
		transform: translateY(0);
		box-shadow: 0 0.6px 1.4px rgba(20, 28, 46, 0.16);
		transition:
			transform 190ms cubic-bezier(0.34, 1.36, 0.64, 1),
			box-shadow 190ms ease-out,
			opacity 160ms ease-out;
	}
	.act:hover:not(:disabled) {
		transform: translateY(var(--lift));
		box-shadow: var(--lift-shadow);
	}
	/* Down is FAST and has no overshoot — a press must answer the finger instantly, and a button that
	   bounces on the way down feels like rubber. The bounce belongs on the way back up. */
	.act:active:not(:disabled) {
		transform: translateY(var(--press));
		box-shadow: var(--press-shadow);
		transition:
			transform 80ms ease-out,
			box-shadow 80ms ease-out;
	}
	.act:disabled {
		cursor: default;
		opacity: 0.62;
	}
	.act:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: 2px;
	}
	/* Google's own surface: their mark is only licensed on white or their blue, and white is the one
	   that sits on marshmallow without becoming the loudest thing in the room. */
	.act.google {
		background: #fff;
		color: rgba(43, 38, 32, 0.9);
	}
	/* Sign-out is not the reason anyone opened this, so it does not take the primary treatment. */
	.act.ghost {
		background: rgba(255, 255, 255, 0.55);
		color: var(--color-inkblue);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 11px;
		margin: 0 6px;
	}
	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		object-fit: cover;
		/* Google serves these from googleusercontent; a failed load leaves a circle rather than a gap. */
		background: rgba(255, 255, 255, 0.5);
	}
	.who-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.who-name {
		font: 500 14px/1.2 var(--font-inter, sans-serif);
		color: var(--color-inkblue);
	}
	.who-email {
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 12px;
		color: var(--color-inkblue);
		opacity: 0.62;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
