<script lang="ts">
	import { HardDriveDownload } from 'lucide-svelte';
	import { useSettings } from '$lib/stores/settings.svelte';
	import { vibrate } from '$lib/utils/haptics';

	const settings = useSettings();

	function toggle() {
		vibrate();
		settings.setAutoOfflineMaps(!settings.autoOfflineMaps);
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-xs font-medium text-surface-400">Mapa offline</span>
	<button
		type="button"
		onclick={toggle}
		role="switch"
		aria-checked={settings.autoOfflineMaps}
		class="flex items-center justify-between gap-3 rounded-lg bg-surface-700 p-3"
	>
		<div class="flex items-center gap-3">
			<HardDriveDownload size={18} class="shrink-0 text-surface-300" />
			<div class="flex flex-col text-left">
				<span class="text-sm text-white">Baixar mapa automaticamente</span>
				<span class="text-xs text-surface-400">
					{settings.autoOfflineMaps
						? 'Toda rota buscada salva o mapa no aparelho'
						: 'Baixe manualmente pelo botão na rota'}
				</span>
			</div>
		</div>
		<div
			class="h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors {settings.autoOfflineMaps ? '' : 'bg-surface-600'}"
			style={settings.autoOfflineMaps ? 'background-color: var(--color-ride-safe-500);' : ''}
		>
			<div class="h-5 w-5 rounded-full bg-white shadow transition-transform {settings.autoOfflineMaps ? 'translate-x-5' : ''}"></div>
		</div>
	</button>
</div>
