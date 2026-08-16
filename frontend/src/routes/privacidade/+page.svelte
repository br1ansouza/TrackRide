<script lang="ts">
	import LegalShell from '$lib/components/LegalShell.svelte';
</script>

<svelte:head>
	<title>Política de Privacidade | TrackRide</title>
	<meta name="description" content="Saiba como o TrackRide trata dados da conta, rotas e localização." />
</svelte:head>

<LegalShell title="Política de Privacidade" description="Esta política explica quais dados o TrackRide utiliza, por que eles são necessários e como você pode controlá-los. Última atualização: 16 de agosto de 2026.">
	<section>
		<h2>1. Dados que tratamos</h2>
		<ul>
			<li>Nome, email e credencial protegida por hash para criar e proteger sua conta.</li>
			<li>Preferência de pilotagem, autonomia de combustível, rotas, paradas, histórico, curtidas e conclusões que você decide registrar.</li>
			<li>Localização precisa durante o planejamento e, quando você inicia uma rota, também em segundo plano para registrar o percurso, acompanhar sua posição e recalcular desvios.</li>
			<li>Dados técnicos mínimos, como endereço IP e registros de erro e segurança mantidos pelos provedores de infraestrutura.</li>
		</ul>
	</section>

	<section>
		<h2>2. Como usamos os dados</h2>
		<p>Usamos esses dados para autenticar sua conta, planejar e salvar trajetos, mostrar clima ao longo do caminho, sugerir paradas, disponibilizar mapas offline, sincronizar percursos e manter o serviço seguro.</p>
		<p>A coleta em segundo plano ocorre somente durante uma rota iniciada por você e é encerrada quando você termina o acompanhamento. O TrackRide não vende seus dados pessoais nem utiliza localização para publicidade.</p>
	</section>

	<section>
		<h2>3. Serviços envolvidos</h2>
		<p>Para entregar os recursos do app, informações podem ser processadas pela infraestrutura do TrackRide e por serviços de hospedagem, banco de dados, mapas, geocodificação, rotas e clima. Isso pode incluir Cloudflare, Render, Neon, OpenStreetMap e provedores compatíveis usados pelo projeto. Coordenadas são enviadas apenas quando necessárias ao recurso solicitado.</p>
	</section>

	<section>
		<h2>4. Armazenamento e retenção</h2>
		<p>Dados da conta e rotas salvas são mantidos enquanto a conta existir. Mapas e pacotes offline ficam armazenados no seu dispositivo. Registros técnicos e cópias de segurança podem permanecer por um período limitado conforme as políticas dos provedores e obrigações de segurança.</p>
	</section>

	<section>
		<h2>5. Seus controles</h2>
		<p>Você pode negar ou revogar permissões do Android, apagar dados offline ao remover o app e excluir sua conta pelo Perfil ou pela página <a href="/excluir-conta">Excluir conta</a>. A exclusão remove o cadastro, rotas e demais registros vinculados no banco ativo.</p>
	</section>

	<section>
		<h2>6. Segurança e contato</h2>
		<p>Aplicamos controles de acesso, comunicação HTTPS em produção e senhas armazenadas por hash. Nenhum sistema é infalível; evite compartilhar sua senha e mantenha o aparelho protegido.</p>
		<p>Para dúvidas de privacidade, escreva para <a href="mailto:trackride.app@gmail.com">trackride.app@gmail.com</a> ou acesse o GitHub do desenvolvedor <a href="https://github.com/br1ansouza" target="_blank" rel="noreferrer">@br1ansouza</a>.</p>
	</section>
</LegalShell>
