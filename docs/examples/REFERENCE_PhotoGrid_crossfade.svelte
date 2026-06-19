<!--
═══════════════════════════════════════════════════════════════════════════════
 REFERENCE FILE — NOT PART OF THIS APP. DO NOT IMPORT.
═══════════════════════════════════════════════════════════════════════════════

 WHAT THIS IS
 A working Svelte 5 crossfade from a DIFFERENT, older project (a family-photo
 SPA, hand-built ~2023). It is kept here purely as a PATTERN REFERENCE for the
 genealogy app's person-card morph (the spouse-chip ↔ FeaturedCard transition).
 It works flawlessly in its original app — a photo flies smoothly from the grid
 into the modal and back — which is exactly the feel the genealogy app wants for
 a spouse chip growing into the featured card.

 ─────────────────────────────────────────────────────────────────────────────
 TAKE THIS (the transferable pattern — this is the whole point of the file):

   1. The `crossfade()` call returning `[send, receive]`, WITH a fallback that
      reads the node's computed transform and animates scale+opacity. The
      fallback is only for elements that have no counterpart; the MORPH happens
      when a key matches between a `send` and a `receive`.

   2. The single keyed `{#each filteredMax as photo (photo.id)}` where
      `in:receive`, `out:send`, AND `animate:flip` ALL sit on ONE element,
      in ONE list, in ONE component. This is the load-bearing fact.

   3. The principle: `send` and `receive` pair ONLY when they share a key AND
      are coordinated in the SAME render pass. Here they are, because the grid
      item and the modal target are peers driven by one keyed list. `animate:flip`
      handles the sibling reshuffle (the "everyone shifts seats" motion).

 ─────────────────────────────────────────────────────────────────────────────
 DO NOT TAKE (domain-specific to the photo app — irrelevant here, and copying
 it would be the mistake):

   - `issModal`, `maxPhotos`, `Modal`, `handleClick`, the "load more" button
   - photo `thumbnail` / `orientation` / lazy-loading, grid-column spanning
   - any of the styling specifics (green shadows, hover lifts, etc.)

 ─────────────────────────────────────────────────────────────────────────────
 WHY IT MATTERS FOR THE GENEALOGY APP

 The genealogy crossfade currently FAILS because the spouse chip (PersonBox) and
 the featured card (FeaturedCard) are TWO SEPARATE COMPONENTS recreated by TWO
 SEPARATE `{#key}` blocks. So the leaving chip's `out:send` and the arriving
 card's `in:receive` are never peers in one render pass → their keys never pair
 → BOTH ends fall back to scale+opacity → the jittery "fly in from the back"
 effect, not a morph.

 This file proves the fix: the morph works when the two states (small / large)
 are the SAME representation in ONE keyed list. That argues for unifying chip +
 featured into one `PersonNode` (rendered small-as-chip or large-as-featured via
 a prop), with the parent rendering ALL visible people from one keyed list +
 `animate:flip` — structurally identical to the grid-↔-modal pattern below.
═══════════════════════════════════════════════════════════════════════════════
-->

<script>
  import { innerWidth } from "svelte/reactivity/window";
  import { issModal } from "../../routes/state.svelte";
  import { maxPhotos } from "../../routes/state.svelte";
  import { crossfade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import BackToTop from "./BackToTop.svelte";
  import { quintOut } from "svelte/easing";
  import Modal from "$lib/components/Modal.svelte";
  let { baseData, photoArr, filtered } = $props()
  let filteredMax = $state([])

  let slide = $state()
  let slideArr = $state([])
  $inspect('maxp',maxPhotos)

  $effect(() => {
    filteredMax = filtered.slice(0,maxPhotos.photoCount)
  })

  $inspect('fm',filteredMax)

	// ── THE PATTERN: one crossfade pair, shared by every keyed item. ──
	const [send, receive] = crossfade({
		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: 600,
				easing: quintOut,
				css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
			};
		}
	});

  function handleClick(i) {
    if (!filtered || !filtered[i]) return;
    issModal.openModal();
    slide = i;
  }
</script>

<svelte:window onclick={(e) => console.log(e.target)}/>

<div class={`photo-grid grid sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 grid-rows-auto select-none mt-3 mb-4 relative ${issModal.modalOpen ? 'overflow-hidden' : ''}`}>

  <!-- ── THE PATTERN: in:receive + out:send + animate:flip, all on ONE element,
       in ONE keyed list, keyed by a stable id. This is what makes the morph
       work. ── -->
  {#each filteredMax as photo, i (photo.id)}

    <div
    in:receive={{ key: photo.id}} out:send={{key: photo.id}} animate:flip={{duration: 600}} onclick={() => handleClick(i)}
    class="relative -z-5 photo-holder cursor-pointer rounded-xl" class:top={photo.orientation}>

      <img src={photo.thumbnail} alt="" class="rounded-xl w-full" loading="lazy">
      <div class="absolute photo-detail top-0 left-0 h-full w-full rounded-xl z-20 flex justify-end text-right items-end p-3 {issModal.modalOpen ? 'pointer-events-none' : ''}">
        <p class="text-white opacity-70 absolute left-3 sm:text-[0.65rem] sm:bottom-2 md:bottom-[3px] ">Click for slideshow</p>
        <div class="photo-details z-40 text-white  ">
          <h1 class="text-lg -mb-1 font-medium sm:text-[1rem] md:text-[1.05rem]">{photo.month}</h1>
          <h3 class="text-md -mb-1 font-normal sm:text-[0.8rem] md:text-[0.82rem]">{photo.city}</h3>
          <p class="capitalize text-sm font-normal sm:text-[0.8rem] md:text-[0.82rem]">{photo.event}</p>
        </div>
      </div>
    </div>

  {/each}
  <BackToTop />
</div>
{#if maxPhotos.photoCount < filtered.length}
<button
onclick={() => maxPhotos.addPhotos()}
class="mt-2 mb-8 mx-auto py-2 px-5 rounded-full">
  <p class="text-white text-md uppercase flex flex-row gap-2">
    Load more
  </p>
</button>
{/if}

<Modal {filtered} bind:slide bind:slideArr/>

<style>
  .photo-holder {
    transition: all 0.15s ease;
    box-shadow: 10px 7px 7px -1px rgba(8,97,8,0.3);
    &:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 16px 13px 10px 0px rgba(8,97,8,0.3);
    }
  }
  .photo-holder img {
    object-fit: cover;
    width: 100%;
    height: 220px;
  }
  .top img { object-position: top; }
  .photo-detail {
    transition: all 0.15s ease;
    opacity: 0%;
    &:hover { opacity: 90%; background-color: #002a084d; }
  }
  .photo-details {
    color: rgb(216, 249, 236);
    text-shadow: 3px 3px 10px 3px rgba(0, 0, 0, 0.9);
  }
  button {
    background-color: rgba(4, 78, 4, 0.903);
    transition: all 0.15s ease;
    &:hover { background-color: #086108e5; transform: translateY(-1.2px) scale(99.8%); box-shadow: 4px 4px 5px -1px rgba(8,97,8,0.3); }
    &:active { transform: translateY(1px) scale(0.998); box-shadow: 1px 1px 3px -1px rgba(8,97,8,0.3); }
  }
  @media (min-width: 750px) {
    .photo-holder:nth-child(5n) { grid-column: span 2; }
  }
</style>

<!--
═══════════════════════════════════════════════════════════════════════════════
 SECOND REFERENCE — the MINIMAL crossfade (canonical Svelte two-list demo)
═══════════════════════════════════════════════════════════════════════════════

 This is the pattern stripped to nothing. It is the clearest possible proof of
 the ONE fact that matters for the genealogy morph:

   ▶ The send and receive are in TWO DIFFERENT `{#each}` lists (left & right),
     and the morph STILL WORKS — because the item leaving one list
     (out:send {key}) and the item arriving in the other (in:receive {key})
     share a key AND are reconciled in the SAME render pass.

   ▶ The single atomic state update is the load-bearing detail:
        [left, right] = move(item, left, right);
     BOTH lists change in ONE synchronous reassignment → Svelte coordinates the
     send and the receive in one flush → the button flies across.

 WHAT THIS TELLS US ABOUT THE GENEALOGY FIX
 You do NOT strictly need send and receive in the same list. You need them
 driven by ONE atomic state change, both keyed, both reconciled in one pass.
 The genealogy app fails because the chip leaves (old FeaturedCard torn down by
 one {#key}) and the card arrives (new FeaturedCard built by a SEPARATE {#key})
 as two loosely-coupled updates — not one coordinated pass with matching keys.

 So the real fix (either path) must guarantee: when focus changes, the outgoing
 chip and the incoming featured render are produced by ONE state update, with
 the SAME person-id key on both ends, in ONE flush. That is the bar to clear.

 (Note: this demo uses Svelte 4 `on:click` syntax. In this app's Svelte 5 use
 `onclick`. The transition mechanism is identical across versions.)
═══════════════════════════════════════════════════════════════════════════════

<script>
	import {flip} from 'svelte/animate';
	import {crossfade} from 'svelte/transition';
	const [send, receive] = crossfade({});

	let left = ['red', 'orange', 'green', 'purple'];
	let right = ['yellow', 'blue'];

	function move(item, from, to) {
		to.push(item);
		return [from.filter(i => i !== item), to];
	}
	function moveLeft(item)  { [right, left] = move(item, right, left); }
	function moveRight(item) { [left, right] = move(item, left, right); }
</script>

<main>
	<p>Click a button to move it to the opposite list.</p>
	<div class="list">
		{#each left as item (item)}
			<button animate:flip in:receive={{key: item}} out:send={{key: item}} on:click={() => moveRight(item)}>
				{item}
			</button>
		{/each}
	</div>
	<div class="list">
		{#each right as item (item)}
			<button animate:flip in:receive={{key: item}} out:send={{key: item}} on:click={() => moveLeft(item)}>
				{item}
			</button>
		{/each}
	</div>
</main>
-->

