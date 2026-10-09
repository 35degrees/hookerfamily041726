<script lang="ts">
	/**
	 * ContactModal — THE SIXTH SURFACE, and a sixth FILE (Sam, 100926).
	 *
	 * Opened from an NB body link — `[here](contact)` on Samuel Talcott Hooker's "How can you reach me?"
	 * (NarrativeBlocks) — and from nowhere else yet. Same rule as the five before it (§46.2): it shares the
	 * veil's VALUES (copied from AuthModal, which copied them from search and the ladder) and the single slot
	 * in `modal.svelte.ts`, and shares nothing that renders.
	 *
	 * THE WINDOW IS THE HOME-CARD CONFIRM'S, not search's floating column: a cream sheet (#fbf8f1) with the
	 * house's soft shadow, because a form needs a ground of its own to sit on — five fields printed straight
	 * onto the blurred veil would read as the tree with boxes drawn over it.
	 *
	 * DELIVERY is `/api/contact` (SES →
	 * CONTACT_TO, visitor as Reply-To). `website` is a honeypot for that route: hidden from people,
	 * filled by bots, and a non-empty value will be dropped server-side.
	 */
	import { modal, closeModal } from '#lib/state/modal.svelte.js';
	import { ascension } from '#lib/state/ascension.svelte.js';
	import { auth } from '#lib/state/auth.svelte.js';
	import { linear, cubicOut } from 'svelte/easing';
	import { tick } from 'svelte';

	/** AuthModal's numbers, to the value — two overlays that agreed only roughly would read as a bug. */
	const VEIL_IN_MS = 340;
	const VEIL_BLUR = 10;
	const PANEL_OUT_MS = 250;
	const VEIL_OUT_DELAY = 90;
	const VEIL_OUT_MS = 430;

	/** Sam's list (100926): his "technical questions" and "report an error or bug" merged into one, plus the
	 *  two a genealogy site actually gets — a record to correct, and a relative with material to share (no "or photos": it would promise an upload, Sam 100926). */
	const REASONS = [
		'General questions and feedback',
		'Technical questions or bugs',
		'Correct a family record',
		'Share family information'
	] as const;

	const open = $derived(modal.kind === 'contact');
	let leaving = $state(false);

	let reason = $state<string>(REASONS[0]);
	let subject = $state('');
	let name = $state('');
	let email = $state('');
	let message = $state('');
	let website = $state(''); // honeypot — see the header
	let sent = $state(false);
	let tried = $state(false);

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const emailOk = $derived(EMAIL_RE.test(email.trim()));
	const messageOk = $derived(message.trim().length > 0);

	let firstField = $state<HTMLSelectElement | null>(null);

	/** Each opening starts clean, and a signed-in reader's name and email are already filled in. */
	$effect(() => {
		if (!open) return;
		leaving = false;
		sent = false;
		tried = false;
		failed = false;
		reason = REASONS[0];
		subject = '';
		message = '';
		website = '';
		name = auth.user?.name ?? '';
		email = auth.user?.email ?? '';
		tick().then(() => firstField?.focus());
	});

	/** The thank-you closes itself after 5s (Sam, 100926); Close and Escape still work sooner. The cleanup
	 *  cancels the timer if the reader closes it first, so a later opening is never shut by a stale one. */
	const THANKS_MS = 5000;
	$effect(() => {
		// `open` too: closed early by hand, the timer must die with the modal, or it would fire later and
		// close whatever surface the reader had opened since (the slot is shared).
		if (!open || !sent) return;
		const t = setTimeout(dismiss, THANKS_MS);
		return () => clearTimeout(t);
	});

	function dismiss() {
		leaving = true;
		closeModal();
	}

	let sending = $state(false);
	let failed = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		tried = true;
		if (!emailOk || !messageOk || sending) return;
		sending = true;
		failed = false;
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ reason, subject, name, email, message, website, page: location.href })
			});
			if (res.ok) sent = true;
			else failed = true;
		} catch {
			failed = true;
		} finally {
			sending = false;
		}
	}

	/** §45.11's Svelte trap: a custom transition silently ignores any option it does not destructure. */
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
			// Alpha and blur on ONE `t` — opacity does not scale an element's own backdrop-filter.
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

<svelte:window onkeydown={open ? onKey : undefined}></svelte:window>

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

	<div class="contact-layer" role="dialog" aria-modal="true" aria-label="Get in touch">
		<div class="panel" in:panel={{ duration: 300, delay: 40 }} out:panel={{ duration: PANEL_OUT_MS }}>
			<div class="head">
				<span class="head-title">Get in Touch</span>
				<button type="button" class="head-x" onclick={dismiss} aria-label="Close">
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path
							d="M6 6 L18 18 M18 6 L6 18"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						></path>
					</svg>
				</button>
			</div>

			{#if sent}
				<p class="thanks">Thanks for reaching out! Expect a reply within 48 hours.</p>
				<div class="acts">
					<button type="button" class="btn go" onclick={dismiss}>Close</button>
				</div>
			{:else}
				<form class="form" onsubmit={onSubmit} novalidate>
					<label class="field">
						<span class="label">Reason</span>
						<select class="input select" bind:value={reason} bind:this={firstField}>
							{#each REASONS as r (r)}
								<option value={r}>{r}</option>
							{/each}
						</select>
					</label>

					<label class="field">
						<span class="label">Subject</span>
						<input class="input" type="text" bind:value={subject} maxlength="160" />
					</label>

					<div class="pair">
						<label class="field">
							<span class="label">Your name</span>
							<input class="input" type="text" bind:value={name} autocomplete="name" maxlength="120" />
						</label>
						<label class="field">
							<span class="label">Your email</span>
							<input
								class="input"
								class:bad={tried && !emailOk}
								type="email"
								bind:value={email}
								autocomplete="email"
								maxlength="200"
								required
							/>
						</label>
					</div>

					<label class="field">
						<span class="label">Message</span>
						<textarea
							class="input area"
							class:bad={tried && !messageOk}
							bind:value={message}
							rows="6"
							maxlength="5000"
							required
						></textarea>
					</label>

					<!-- The honeypot: off-screen, out of the tab order, ignored by password managers. -->
					<input
						class="trap"
						type="text"
						name="website"
						bind:value={website}
						tabindex="-1"
						autocomplete="off"
						aria-hidden="true"
					/>

					{#if tried && (!emailOk || !messageOk)}
						<p class="hint">
							{!emailOk && !messageOk
								? 'Add your email and a message.'
								: !emailOk
									? 'That email address doesn’t look complete.'
									: 'Add a message.'}
						</p>
					{/if}
					{#if failed}
						<p class="hint">The message couldn’t be sent. Please try again in a moment.</p>
					{/if}

					<div class="acts">
						<button type="button" class="btn ghost" onclick={dismiss}>Cancel</button>
						<button type="submit" class="btn go" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* THE MARSHMALLOW VEIL — AuthModal's values, copied per §46.2. */
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
		/* -webkit- FIRST: the production minifier keeps only the LAST of the pair (Oct 9) */
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
	.contact-layer {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		pointer-events: none;
	}

	/* THE HOME-CARD CONFIRM'S SHEET (CardMarks), widened for a form. */
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

	/* HEADER — SearchModal's values, as AuthModal takes them. */
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

	.form {
		display: flex;
		flex-direction: column;
		gap: 11px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		flex: 1;
	}
	.pair {
		display: flex;
		gap: 10px;
	}
	@media (max-width: 480px) {
		.pair {
			flex-direction: column;
			gap: 11px;
		}
	}
	.label {
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-inkblue);
		opacity: 0.6;
	}
	.input {
		width: 100%;
		padding: 8px 10px;
		font: 400 13.5px/1.4 var(--font-inter, sans-serif);
		color: rgba(43, 38, 32, 0.92);
		background: #fff;
		border: 0;
		border-radius: 6px;
		box-shadow:
			inset 0 0 0 0.75px rgba(43, 38, 32, 0.18),
			inset 0 1px 2px rgba(20, 28, 46, 0.05);
		transition: box-shadow 150ms ease-out;
	}
	.input:focus {
		outline: none;
		box-shadow:
			inset 0 0 0 1.25px var(--color-inkblue),
			inset 0 1px 2px rgba(20, 28, 46, 0.05);
	}
	.input.bad {
		box-shadow: inset 0 0 0 1.25px rgba(150, 40, 30, 0.7);
	}
	/* The native arrow replaced by the house chevron, so the select reads as the same object as the fields. */
	.select {
		appearance: none;
		-webkit-appearance: none;
		padding-right: 30px;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 L6 6.5 L11 1.5' fill='none' stroke='%231a2b72' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' opacity='.6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 11px center;
		background-size: 11px 8px;
	}
	.area {
		resize: vertical;
		min-height: 110px;
	}
	.trap {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.hint {
		margin: 0;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 12px;
		color: rgba(150, 40, 30, 0.85);
	}
	.thanks {
		margin: 4px 0 2px;
		font-family: var(--font-opensans, 'Open Sans', sans-serif);
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--color-inkblue);
	}

	/* CANCEL / SEND — the home-card confirm's two buttons, to the value. */
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
	.btn.ghost:hover {
		opacity: 1;
	}
	.btn.go {
		background: var(--color-inkblue);
		color: #fbf8f1;
	}
	.btn.go:hover:not(:disabled) {
		background: rgba(43, 38, 32, 0.92);
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
