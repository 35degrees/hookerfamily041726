<script lang="ts">
	/**
	 * PrivacyModal — what the site keeps about a SIGNED-IN reader, and the door to delete it (Sam, Oct 9).
	 * DEPLOYMENT §18.8 / §16-O: "a plain statement of what is stored and why, and a way to delete an account".
	 *
	 * Opened from SiteFooter, whose "Privacy" link exists only while signed in (Sam: "privacy button only
	 * appears if someone is signed in"). The shell is ContactModal's — the house veil and the cream sheet —
	 * copied per §46.2: shares the veil's values and the modal slot, nothing that renders.
	 *
	 * DELETION IS TWO STEPS AND SAYS WHAT IT DESTROYS. It cannot be undone (server/auth.ts `deleteUser`: the
	 * user row and, by cascade, their sign-in links and bookmarks), so the button first turns the sheet into a
	 * confirmation that names exactly what goes. A stale session — Better Auth requires one created within a
	 * day — gets plain instructions rather than an error code.
	 */
	import { modal, closeModal } from '#lib/state/modal.svelte.js';
	import { ascension } from '#lib/state/ascension.svelte.js';
	import { auth, deleteAccount } from '#lib/state/auth.svelte.js';
	import { linear, cubicOut } from 'svelte/easing';

	const VEIL_IN_MS = 340;
	const VEIL_BLUR = 10;
	const PANEL_OUT_MS = 250;
	const VEIL_OUT_DELAY = 90;
	const VEIL_OUT_MS = 430;

	const open = $derived(modal.kind === 'privacy');
	let leaving = $state(false);
	/** read → confirm → (deleting) → deleted | stale | failed */
	let step = $state<'read' | 'confirm' | 'deleting' | 'deleted' | 'stale' | 'failed'>('read');

	$effect(() => {
		if (!open) return;
		leaving = false;
		step = 'read';
	});

	function dismiss() {
		leaving = true;
		closeModal();
	}

	async function onDelete() {
		step = 'deleting';
		step = await deleteAccount();
	}

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
			css: (t: number) => {
				const e = t * t * (3 - 2 * t);
				const b = (VEIL_BLUR * e).toFixed(2);
				return `opacity: ${e}; backdrop-filter: blur(${b}px); -webkit-backdrop-filter: blur(${b}px);`;
			}
		};
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && step !== 'deleting') {
			e.preventDefault();
			dismiss();
		}
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined}></svelte:window>

{#if open}
	<div
		class="veil"
		class:zone={ascension.active}
		class:leaving
		in:veil={{ duration: VEIL_IN_MS }}
		out:veil={{ duration: VEIL_OUT_MS, delay: VEIL_OUT_DELAY }}
		onclick={() => step !== 'deleting' && dismiss()}
		role="presentation"
	></div>

	<div class="sheet-layer" role="dialog" aria-modal="true" aria-label="Privacy">
		<div class="panel" in:panel={{ duration: 300, delay: 40 }} out:panel={{ duration: PANEL_OUT_MS }}>
			<div class="head">
				<span class="head-title">Privacy</span>
				<button type="button" class="head-x" onclick={dismiss} aria-label="Close" disabled={step === 'deleting'}>
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
						></path>
					</svg>
				</button>
			</div>

			{#if step === 'read'}
				<div class="body">
					<p>
						When you sign in, this site keeps your name, your email address and your profile picture link from
						Google or Microsoft, along with the people you bookmark, your list names and your chosen home card.
					</p>
					<p>
						They are used only to show you your own bookmarks and home card. They are never shared or sold, and
						the site has no advertising and no tracking. One cookie keeps you signed in.
					</p>
					<p>
						Messages sent through the contact form are emailed to the site’s compiler and are not kept on the site.
					</p>
				</div>
				{#if auth.signedIn}
					<div class="acts">
						<button type="button" class="btn go danger first" onclick={() => (step = 'confirm')}>Delete my account</button>
						<button type="button" class="btn go" onclick={dismiss}>Close</button>
					</div>
				{/if}
			{:else if step === 'confirm' || step === 'deleting'}
				<div class="body">
					<p>
						This permanently deletes your account{auth.user?.email ? ` (${auth.user.email})` : ''}, your bookmarks,
						your list names and your home card. It cannot be undone.
					</p>
				</div>
				<div class="acts">
					<button type="button" class="btn ghost" onclick={() => (step = 'read')} disabled={step === 'deleting'}>
						Cancel
					</button>
					<button type="button" class="btn go danger" onclick={onDelete} disabled={step === 'deleting'}>
						{step === 'deleting' ? 'Deleting…' : 'Delete permanently'}
					</button>
				</div>
			{:else if step === 'deleted'}
				<div class="body"><p>Your account and everything saved with it have been deleted.</p></div>
				<div class="acts"><button type="button" class="btn go" onclick={dismiss}>Close</button></div>
			{:else if step === 'stale'}
				<div class="body">
					<p>
						For your security, deleting an account needs a recent sign-in. Please sign out, sign back in, and then
						delete your account from here.
					</p>
				</div>
				<div class="acts"><button type="button" class="btn go" onclick={dismiss}>Close</button></div>
			{:else}
				<div class="body"><p>Your account couldn’t be deleted just now. Please try again in a moment.</p></div>
				<div class="acts">
					<button type="button" class="btn ghost" onclick={dismiss}>Close</button>
					<button type="button" class="btn go" onclick={() => (step = 'confirm')}>Try again</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ContactModal's veil and sheet, to the value (§46.2). -webkit- first: the minifier keeps the last. */
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
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
	}
	.veil.zone {
		background: radial-gradient(
			120% 90% at 50% 42%,
			rgba(233, 231, 223, 0.74) 0%,
			rgba(229, 227, 219, 0.78) 55%,
			rgba(224, 222, 214, 0.82) 100%
		);
	}
	.sheet-layer {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		pointer-events: none;
	}
	.panel {
		pointer-events: auto;
		width: min(460px, 100%);
		max-height: calc(100vh - 32px);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 20px 18px;
		border-radius: 9px;
		background: #fbf8f1;
		box-shadow:
			0 8px 26px rgba(20, 28, 46, 0.24),
			0 0 0 0.5px rgba(43, 38, 32, 0.1);
	}
	.head {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.head-title {
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
	.body p {
		margin: 0 0 9px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--color-inkblue);
	}
	.body p:last-child {
		margin-bottom: 0;
	}
	.acts {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 2px;
	}
	.btn {
		padding: 8px 15px;
		border: 0;
		border-radius: 6px;
		font: 500 12.5px/1 var(--font-inter, sans-serif);
		cursor: pointer;
		transition:
			opacity 150ms ease-out,
			background 150ms ease-out;
	}
	.btn.ghost {
		background: transparent;
		color: var(--color-inkblue);
		opacity: 0.62;
	}
	.btn.ghost:hover:not(:disabled) {
		opacity: 1;
	}
	/* The delete button sits at the far LEFT, away from Close — red with white text (Sam, Oct 9). */
	.btn.first {
		margin-right: auto;
	}
	.btn.go {
		background: var(--color-inkblue);
		color: #fbf8f1;
	}
	.btn.go:hover:not(:disabled) {
		background: rgba(43, 38, 32, 0.92);
	}
	.btn.go.danger {
		background: rgb(150, 40, 30);
	}
	.btn.go.danger:hover:not(:disabled) {
		background: rgb(120, 30, 22);
	}
	.btn:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.btn:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: 2px;
	}
</style>
