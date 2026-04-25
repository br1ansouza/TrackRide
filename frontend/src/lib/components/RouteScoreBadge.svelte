<script lang="ts">
	import { CloudRain, Wind, Eye } from 'lucide-svelte';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';
	import type { RouteAlert, AlertType } from '$lib/services/alerts';
	import type { RouteScore } from '$lib/services/routeScore';
	import { cssVar } from '$lib/utils/color';

	interface Props {
		score: RouteScore;
		alerts: RouteAlert[];
	}

	let { score, alerts }: Props = $props();

	const ICONS: Record<AlertType, typeof CloudRain> = {
		rain: CloudRain,
		wind: Wind,
		visibility: Eye
	};

	const RADIUS = 28;
	const CIRCUMFERENCE = Math.PI * RADIUS;
	let offset = $derived(CIRCUMFERENCE - (score.value / 100) * CIRCUMFERENCE);

	function alertColor(severity: 'warning' | 'danger'): string {
		return cssVar(severity === 'danger' ? '--color-ride-danger-300' : '--color-ride-alert-300');
	}
</script>

<div class="flex items-center gap-3 py-1">
	<div class="relative h-16 w-16 shrink-0">
		<svg viewBox="0 0 64 64" class="h-full w-full -rotate-90">
			<circle
				cx="32" cy="32" r={RADIUS}
				fill="none"
				stroke="var(--color-surface-600)"
				stroke-width="5"
				stroke-dasharray="{CIRCUMFERENCE} {CIRCUMFERENCE}"
				stroke-dashoffset={CIRCUMFERENCE / 2}
				stroke-linecap="round"
			/>
			<circle
				cx="32" cy="32" r={RADIUS}
				fill="none"
				stroke="var(--color-ride-{score.color}-500)"
				stroke-width="5"
				stroke-dasharray="{CIRCUMFERENCE} {CIRCUMFERENCE}"
				stroke-dashoffset={offset + CIRCUMFERENCE / 2}
				stroke-linecap="round"
				class="transition-all duration-500"
			/>
		</svg>
		<span
			class="absolute inset-0 flex items-center justify-center pt-1 text-lg font-bold"
			style="color: var(--color-ride-{score.color}-300);"
		>
			{score.value}
		</span>
	</div>
	<div class="flex flex-col gap-1">
		<span
			class="text-sm font-medium"
			style="color: var(--color-ride-{score.color}-100);"
		>
			{score.label}
		</span>
		{#if alerts.length > 0}
			<div class="flex gap-2">
				{#each alerts as alert}
					{@const Icon = ICONS[alert.type]}
					<Tooltip positioning={{ placement: 'top' }} openDelay={200} closeDelay={0}>
						<Tooltip.Trigger>
							<Icon size={14} color={alertColor(alert.severity)} />
						</Tooltip.Trigger>
						<Tooltip.Positioner>
							<Tooltip.Content class="rounded bg-surface-900 px-2 py-1 text-xs text-white shadow-lg">
								{alert.message}
							</Tooltip.Content>
						</Tooltip.Positioner>
					</Tooltip>
				{/each}
			</div>
		{/if}
	</div>
</div>
