<script lang="ts">
	/**
	 * SourcesModal — where the tree comes from (Sam, Oct 9: "add privacy and sources links"; the full Sources
	 * work — design §9's credibility apparatus — is his to do later).
	 *
	 * THE TEXT IS A DRAFT for Sam to rewrite, assembled only from what he has already written: canonical's
	 * metadata.primary_source and his own card's "What was your main source material?" block (HD3386 NB 3).
	 * Nothing here is new research. canonical's `bibliography` is research-grade — internal notes and record
	 * IDs — and is deliberately not rendered.
	 *
	 * The shell is ContactModal's — the house veil and the cream sheet — copied per §46.2.
	 */
	import { modal, closeModal } from '#lib/state/modal.svelte.js';
	import { ascension } from '#lib/state/ascension.svelte.js';
	import { linear, cubicOut } from 'svelte/easing';

	const VEIL_IN_MS = 340;
	const VEIL_BLUR = 10;
	const PANEL_OUT_MS = 250;
	const VEIL_OUT_DELAY = 90;
	const VEIL_OUT_MS = 430;

	const open = $derived(modal.kind === 'sources');
	let leaving = $state(false);
	$effect(() => {
		if (open) leaving = false;
	});

	function dismiss() {
		leaving = true;
		closeModal();
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

	<div class="sheet-layer" role="dialog" aria-modal="true" aria-label="Sources">
		<div class="panel" in:panel={{ duration: 300, delay: 40 }} out:panel={{ duration: PANEL_OUT_MS }}>
			<div class="head">
				<span class="head-title">Sources</span>
				<button type="button" class="head-x" onclick={dismiss} aria-label="Close">
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
						></path>
					</svg>
				</button>
			</div>
			<div class="body">
				<p>
					The backbone of this project is Edward Hooker’s genealogy, <cite
						>Descendants of Rev. Thomas Hooker, Hartford, Connecticut, 1586–1908</cite
					>, published in Rochester, New York, in 1909 and completed by Margaret Huntington Hooker after Edward’s
					death.
				</p>
				<p>
					Each of the major founding Hartford families has its own published genealogy, and those were used
					alongside it, together with online records from FamilySearch and Ancestry.
				</p>
			</div>
			<div class="acts"><button type="button" class="btn go" onclick={dismiss}>Close</button></div>
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
	.body cite {
		font-style: italic;
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
		transition: background 150ms ease-out;
	}
	.btn.go {
		background: var(--color-inkblue);
		color: #fbf8f1;
	}
	.btn.go:hover {
		background: rgba(43, 38, 32, 0.92);
	}
	.btn:focus-visible {
		outline: 2px solid var(--color-inkblue);
		outline-offset: 2px;
	}
</style>
