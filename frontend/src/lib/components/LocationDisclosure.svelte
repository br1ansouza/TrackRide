<script lang="ts">
	import { MapPin } from 'lucide-svelte';

	let { onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void } = $props();
</script>

<div class="location-disclosure-backdrop" role="presentation">
	<div class="location-disclosure" role="dialog" aria-modal="true" aria-labelledby="location-disclosure-title" aria-describedby="location-disclosure-description">
		<div class="location-disclosure-icon" aria-hidden="true"><MapPin size={21} /></div>
		<h2 id="location-disclosure-title">Localização durante a rota</h2>
		<p id="location-disclosure-description">Para registrar o percurso, acompanhar sua posição e recalcular desvios, o TrackRide coleta sua localização precisa <strong>em segundo plano</strong> enquanto uma rota estiver em andamento, inclusive quando o app não estiver visível ou a tela estiver bloqueada.</p>
		<p>O rastreamento começa somente depois que você toca em “Começar rota” e termina quando você encerra a rota.</p>
		<a href="/privacidade">Ver Política de Privacidade</a>
		<div class="location-disclosure-actions">
			<button type="button" class="location-disclosure-later" onclick={onCancel}>Agora não</button>
			<button type="button" class="location-disclosure-confirm" onclick={onConfirm}>Continuar</button>
		</div>
	</div>
</div>

<style>
	.location-disclosure-backdrop {
		position: fixed;
		inset: 0;
		z-index: 2400;
		display: grid;
		place-items: center;
		padding: 22px max(18px, env(safe-area-inset-right)) max(22px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
		background: color-mix(in oklch, black 64%, transparent);
		backdrop-filter: blur(5px);
	}

	.location-disclosure {
		width: min(100%, 410px);
		border: 1px solid var(--color-surface-700);
		border-radius: 18px;
		background: var(--color-surface-900);
		padding: 22px;
		box-shadow: 0 24px 70px rgb(0 0 0 / 0.48);
	}

	.location-disclosure-icon {
		display: grid;
		height: 38px;
		width: 38px;
		place-items: center;
		margin-bottom: 16px;
		border-radius: 11px;
		background: color-mix(in oklch, var(--color-ride-route-500) 20%, var(--color-surface-800));
		color: var(--color-ride-route-100);
	}

	h2 {
		color: var(--color-surface-50);
		font-size: 19px;
		font-weight: 720;
		letter-spacing: -0.02em;
	}

	p {
		margin-top: 10px;
		color: var(--color-surface-400);
		font-size: 13px;
		line-height: 1.6;
	}

	strong {
		color: var(--color-surface-200);
		font-weight: 650;
	}

	a {
		display: inline-block;
		margin-top: 12px;
		color: var(--color-ride-route-300);
		font-size: 12px;
		font-weight: 600;
		text-decoration: none;
	}

	.location-disclosure-actions {
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 9px;
		margin-top: 20px;
	}

	.location-disclosure-actions button {
		height: 44px;
		border-radius: 11px;
		font-size: 13px;
		font-weight: 650;
	}

	.location-disclosure-later {
		background: var(--color-surface-800);
		color: var(--color-surface-300);
	}

	.location-disclosure-confirm {
		background: var(--color-ride-route-500);
		color: white;
	}
</style>
