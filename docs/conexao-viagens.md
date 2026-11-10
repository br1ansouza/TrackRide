# Conexão e registro de viagens

A viagem encerrada é gravada no IndexedDB antes de tentar enviar. O resumo distingue
salvamento local, sincronização confirmada e falha de armazenamento. Uma falha local
mantém o resultado em memória e oferece nova tentativa, sem afirmar que foi salvo.

Cada percurso recebe `client_id` (UUID). A API registra a viagem e a conclusão de
uma rota pública na mesma transação. Repetir o UUID para a mesma conta devolve o
registro existente; uma nova viagem no mesmo trajeto recebe outro UUID.
A fila só remove um item após receber a confirmação com o UUID correspondente.
Falhas de rede, autenticação, validação e respostas inválidas preservam a fila.
Viagens pendentes são vinculadas à conta e sobrevivem ao logout.

A conexão da rede, a disponibilidade da API e o GPS são estados separados.
A verificação de inicialização é compartilhada, espera no máximo 60 segundos e
mostra “Ligando o servidor” após 2,5 segundos. Chamadas de escrita não são repetidas
automaticamente pela camada HTTP. Retomar a tela e recuperar rede verificam a API;
pendências voltam a ser tentadas a cada 15 segundos com o app aberto.

O encerramento continua sendo manual. O resumo aparece mesmo offline. A chegada
só é marcada com uma posição recente a até 120 metros do destino. O app mostra a
perda de GPS, mas não inventa pontos percorridos durante a interrupção.

## Publicação

1. Publicar o backend e executar `bin/rails db:migrate`.
2. Publicar o frontend / gerar o novo APK.

A migração adiciona `client_id`, sua unicidade por conta e índices para proximidade
e histórico. Frontends antigos continuam usando o contrato anterior. O frontend
novo preserva pendências quando um backend antigo não confirma o UUID.

## Verificações

- `node scripts/connection-sync.test.mjs` (14 cenários de rede, fila, sessão e GPS).
- `cd frontend && npx playwright install chromium && npm run test:e2e` (inicialização, viagem offline, reabertura e falha de armazenamento).
- `cd frontend && npm run check && npm run build && npm run build:standalone`.
- `cd backend && RAILS_ENV=test bin/rails db:prepare` e
  `RAILS_ENV=test bin/rails test test/record_ride_test.rb` com PostgreSQL/PostGIS de teste.
- No aparelho: iniciar uma viagem, perder rede/GPS, encerrar offline, conferir o
  resumo, reabrir o app e recuperar rede. A viagem deve sincronizar uma única vez.

O cache local do usuário permite abrir o mapa enquanto a sessão é revalidada.
O histórico usa páginas de 20 resultados e omite geometrias nas listagens;
mapa e painéis são carregados sob demanda. O fundo foi comprimido para WebP.

A restauração aguarda o mapa estar pronto. Uma rota sem previsão de clima continua
disponível para navegação, sem atribuir uma nota de segurança fictícia. No navegador,
o GPS usa a API web; no Android, o watcher nativo é removido mesmo se sua inicialização
terminar depois de o usuário encerrar a viagem. Os watchers do mapa e da viagem
são independentes.
