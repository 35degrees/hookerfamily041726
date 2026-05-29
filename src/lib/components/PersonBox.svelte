<script lang="ts">
	import type { PersonCompact } from '$lib/types/neighborhood';

	type Props = {
		person: PersonCompact;
		relation: 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'grandchild';
		marriageYear?: number | null;
		compact?: boolean;
		dimmed?: boolean;
	};

	let { person, relation, marriageYear = null, compact = false, dimmed = false }: Props = $props();

	let displayName = $derived(person.sn ?? person.n);
	let href = $derived(person.slug ? `/person/${person.slug}` : null);
</script>

{#if href}
	<a
		{href}
		class="person-box flex overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md {!compact
			? 'h-[75px] w-[220px]'
			: 'h-[65px] w-[160px]'} {dimmed ? 'opacity-65' : ''}"
		data-relation={relation}
	>
		<div
			class="photo aspect-square shrink-0 bg-stone-100"
			class:w-[25%]={!compact}
			class:w-[30%]={compact}
		>
			{#if person.p}
				<img
					src={person.p}
					alt={person.n}
					class="h-full w-full object-cover object-top"
					loading="lazy"
				/>
			{/if}
		</div>

		<div class="text-area flex flex-col justify-center gap-0.5 px-2.5 py-2 leading-tight">
			<div
				class="font-medium text-stone-900"
				class:text-[13px]={!compact}
				class:text-[11px]={compact}
			>
				{displayName}
			</div>
			<div class="text-stone-500" class:text-xs={!compact} class:text-[10px]={compact}>
				{person.by ?? '?'}–{person.dy ?? '?'}{#if relation === 'child' && dimmed}
					{' '}(died young){/if}
			</div>
			{#if relation === 'spouse' && marriageYear}
				<div class="text-stone-500" class:text-xs={!compact} class:text-[10px]={compact}>
					m. {marriageYear}
				</div>
			{/if}
		</div>
	</a>
{:else}
	<div
		class="person-box flex overflow-hidden rounded-lg bg-white shadow-sm {!compact
			? 'h-[75px] w-[220px]'
			: 'h-[65px] w-[160px]'} {dimmed ? 'opacity-65' : ''}"
		data-relation={relation}
	>
		<div
			class="photo h-full shrink-0 bg-stone-100"
			class:w-[25%]={!compact}
			class:w-[30%]={compact}
		>
			{#if person.p}
				<img
					src={person.p}
					alt={person.n}
					class="h-full w-full object-cover object-top"
					loading="lazy"
				/>
			{/if}
		</div>

		<div class="text-area flex flex-col justify-center gap-0.5 px-2.5 py-2 leading-tight">
			<div
				class="font-medium text-stone-900"
				class:text-[13px]={!compact}
				class:text-[11px]={compact}
			>
				{displayName}
			</div>
			<div class="text-stone-500" class:text-xs={!compact} class:text-[10px]={compact}>
				{person.by ?? '?'}–{person.dy ?? '?'}{#if relation === 'child' && dimmed}
					{' '}(died young){/if}
			</div>
			{#if relation === 'spouse' && marriageYear}
				<div class="text-stone-500" class:text-xs={!compact} class:text-[10px]={compact}>
					m. {marriageYear}
				</div>
			{/if}
		</div>
	</div>
{/if}
