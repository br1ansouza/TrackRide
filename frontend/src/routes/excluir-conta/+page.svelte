<script lang="ts">
	import { LoaderCircle, Trash2 } from 'lucide-svelte';
	import LegalShell from '$lib/components/LegalShell.svelte';
	import { useAuth } from '$lib/stores/auth.svelte';
	import { toaster } from '$lib/stores/toaster';

	const auth = useAuth();
	let password = $state('');
	let submitting = $state(false);

	async function handleDelete(event: SubmitEvent) {
		event.preventDefault();
		if (!password || submitting) return;

		submitting = true;
		try {
			await auth.deleteAccount(password);
			toaster.success({ title: 'Conta excluída', description: 'Seus dados vinculados foram removidos.' });
		} catch (error) {
			toaster.error({ title: 'Não foi possível excluir', description: (error as Error).message });
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Excluir conta | TrackRide</title>
	<meta name="description" content="Solicite a exclusão da sua conta e dos dados vinculados ao TrackRide." />
</svelte:head>

<LegalShell title="Excluir conta" description="Exclua permanentemente sua conta do TrackRide e os dados vinculados a ela.">
	{#if auth.loading}
		<section><p>Verificando sua sessão…</p></section>
	{:else if !auth.isLoggedIn}
		<section>
			<h2>Confirme sua identidade</h2>
			<p>Entre na conta que deseja excluir. Depois da autenticação, você voltará diretamente para esta página.</p>
			<a class="legal-primary-link" href="/login?redirect=%2Fexcluir-conta">Entrar para continuar</a>
		</section>
	{:else}
		<section>
			<h2>O que será removido</h2>
			<p>Seu cadastro, preferências, rotas, paradas, histórico, curtidas e conclusões serão removidos do banco ativo. Pacotes de rota e dados pessoais armazenados localmente também serão apagados deste dispositivo.</p>
			<p class="legal-note">Esta ação não pode ser desfeita. Para confirmar, informe a senha atual da conta.</p>

			<form class="legal-form" onsubmit={handleDelete}>
				<label for="delete-account-password">Senha atual</label>
				<input id="delete-account-password" class="legal-input" type="password" bind:value={password} autocomplete="current-password" required />
				<button class="legal-danger-button" type="submit" disabled={!password || submitting} aria-busy={submitting}>
					{#if submitting}<LoaderCircle size={17} class="animate-spin" />{:else}<Trash2 size={17} />{/if}
					{submitting ? 'Excluindo…' : 'Excluir minha conta'}
				</button>
			</form>
		</section>
	{/if}
</LegalShell>
