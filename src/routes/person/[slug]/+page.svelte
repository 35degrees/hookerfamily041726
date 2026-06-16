<script lang="ts">
	import type { PageData } from './$types';
	import PersonBox from '$lib/components/PersonBox.svelte';
	import FeaturedCard from '$lib/components/FeaturedCard.svelte';
	import { cardinalWord, cardinalWordLower, possessive } from '$lib/utils/dates';
	let { data }: { data: PageData } = $props();

	const hasParents = $derived(
		!!(data.neighborhood.parents.father || data.neighborhood.parents.mother)
	);

	const childrenTotal = $derived(data.childrenTotal ?? 0);
	const childrenDiedYoung = $derived(data.childrenDiedYoung ?? 0);
	const isEasterEgg = $derived(data.person.classification?.is_easter_egg ?? false);

	const focalFirstName = $derived(
		data.person.bio?.first_name ?? data.person.name?.first_name ?? null
	);

	const parentsLabel = $derived(
		focalFirstName ? `${possessive(focalFirstName)} parents` : 'Parents'
	);

	const childrenLabel = $derived.by(() => {
		if (childrenTotal === 0) return null;
		const countWord = cardinalWord(childrenTotal);
		const childWord = childrenTotal === 1 ? 'child' : 'children';
		let base = `${countWord} ${childWord}`;
		if (childrenDiedYoung > 0) {
			const dyWord = cardinalWordLower(childrenDiedYoung);
			base += ` (${dyWord} died young)`;
		}
		return base;
	});
</script>

<div class="page-container">
	<div class="parents-slot">
		{#if data.neighborhood.parents.father}
			<PersonBox person={data.neighborhood.parents.father} relation="parent" />
		{/if}
		{#if data.neighborhood.parents.mother}
			<PersonBox person={data.neighborhood.parents.mother} relation="parent" />
		{/if}
	</div>

	<div class="connector connector-parents">
		{#if hasParents}
			<div class="connector-line"></div>
			<span class="connector-label">{parentsLabel}</span>
			<div class="connector-line"></div>
		{/if}
	</div>

	<FeaturedCard
		person={data.person}
		spouses={data.neighborhood.spouses}
		generationLabels={data.generationLabels}
		burialCemetery={data.burialCemetery}
		crossConnections={data.crossConnections}
		institutionsById={data.institutionsById}
	/>
	{#if childrenTotal > 0}
		<div class="connector connector-children" class:connector-no-label={isEasterEgg}>
			{#if !isEasterEgg}
				<div class="connector-line"></div>
				<span class="connector-label">{childrenLabel}</span>
				<div class="connector-line"></div>
			{:else}
				<div class="connector-line connector-line-full"></div>
			{/if}
		</div>
	{/if}

	<div class="children-slot">
		{#each data.neighborhood.spouses as marriage (marriage.spouse?.id ?? marriage.order)}
			{#each marriage.children as child (child.id)}
				<PersonBox person={child} relation="child" dimmed={child.dy_young} />
			{/each}
		{/each}
	</div>
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		padding-top: 80px;
		padding-bottom: 80px;
		padding-left: 32px;
		padding-right: 32px;
	}

	.parents-slot {
		min-height: 100px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 16px;
		margin-bottom: 0;
	}

	.connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 6px 0;
		opacity: 0.75;
		min-height: 70px; /* Reserve space even when empty (e.g., no parents) */
	}

	.connector-line {
		width: 1px;
		height: 16px;
		background-color: rgb(168, 162, 158);
	}

	/* Parents: bottom line is closer to FeaturedCard → shorter */
	.connector-parents .connector-line:last-child {
		height: 12px;
	}

	/* Children: top line is closer to FeaturedCard → shorter */
	.connector-children .connector-line:first-child {
		height: 12px;
	}

	.connector-label {
		font-size: 11px;
		font-weight: 500;
		color: rgb(87, 83, 78);
		letter-spacing: 0.05em;
	}

	.children-slot {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
		max-width: 72rem;
		margin-top: 0;
	}

	.connector-children .connector-line.connector-line-full {
		height: 50px;
	}

	.cross-connections {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px 24px;
	}
</style>
