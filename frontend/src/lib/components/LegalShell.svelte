<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import '$lib/styles/legal.css';

	let { title, description, children }: { title: string; description: string; children: Snippet } = $props();
</script>

<main class="legal-page">
	<div class="legal-shell">
		<header class="legal-header">
			<a class="legal-back" href="/" aria-label="Voltar ao TrackRide"><ArrowLeft size={17} /> Voltar</a>
			<div class="legal-brand"><img src="/brand/trackride-mark.png" alt="" /><span>TrackRide</span></div>
			<h1>{title}</h1>
			<p>{description}</p>
		</header>

		<article class="legal-content">
			{@render children()}
		</article>

		<footer class="legal-footer">
			<a href="/privacidade">Privacidade</a>
			<a href="/termos">Termos de Uso</a>
			<a href="/excluir-conta">Excluir conta</a>
		</footer>
	</div>
</main>
