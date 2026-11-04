# Revisão local — 2026-11-04

Escopo: código e artefatos locais. Sem acesso aos domínios publicados, bancos remotos ou credenciais reais. Branch baseada em origin/dev fff0db7. Revisão não equivale a pentest completo.

## Arquitetura

SvelteKit com adapter Cloudflare: `frontend/wrangler.jsonc` publica `.svelte-kit/cloudflare`, separando `_worker.js` dos assets via `.assetsignore` gerado. APK usa adapter-static e build-standalone. Rails API no Render, Postgres/PostGIS no Neon segundo contexto local; Docker Compose local possui Postgres, Redis e Mailpit. API serve `backend/public`, não a raiz Rails. Não há SQLite ou painel administrativo dedicado nesta implementação.

## Achados

- **Confirmado, alta sob acesso ao token:** JWT válido por sete dias continuava válido depois de redefinir senha (`backend/app/services/jwt_service.rb:4`; concern `authenticatable.rb:7`). Corrigido com versão de sessão derivada por HMAC do digest da senha, verificada no backend; claims obrigatórias. Nenhum hash de senha aparece no JWT. Tokens anteriores à mudança serão recusados, exigindo novo login quando o backend for implantado. Sem migração ou alteração de senha/dados.
- **Confirmado, alta se seed executado com e-mail sem senha:** `backend/db/seeds/demo_user.rb:1` criava conta com senha padrão. Removido fallback; senha explícita obrigatória e seed demo proibido em produção. Não foi verificado se essa conta chegou a existir no ambiente publicado: caso tenha existido, trocar senha/revisar acesso, sem rotação automática aqui.
- **Confirmado, risco alto condicionado a XSS/extensão/acesso ao perfil:** token persistido em localStorage (`frontend/src/lib/services/api.ts:80`). Não foi demonstrado XSS. **Pendente:** sessão web HttpOnly por backend/proxy de mesma origem; APK com armazenamento nativo protegido; considerar offline, CSRF, CORS e renovação. Não migrar para cookie cross-site improvisado entre workers.dev e onrender.com. Logout atual remove token apenas no dispositivo; **revogação individual no servidor ainda pendente**, exigindo registro de sessões/jti ou versão persistida. Troca de senha agora invalida sessões antigas, mas não substitui logout revogável.
- **Confirmado, média se máquina alcançável pela rede:** Compose publicava Postgres, Redis sem senha e Mailpit em todas as interfaces (`docker-compose.yml:8`). Restringidos ao loopback. Contêineres já iniciados precisam ser recriados pelo operador para aplicar; nenhum serviço em execução foi alterado.
- **Risco de ambiente, média:** respostas autenticadas sem política explícita de cache. API agora usa no-store (`backend/app/controllers/api/v1/base_controller.rb:4`).
- **Risco de divulgação dependente do provedor, média:** forecast repassava corpo de erro externo; e-mail registrava mensagem completa da exceção. Agora forecast retorna erro genérico e envio de e-mail registra apenas classe. Nenhum vazamento de segredo foi demonstrado.

## Arquivos públicos e autorização

Verificados frontend/static, backend/public e assets compilados. Nenhum banco, dump, segredo identificado nesses diretórios. Busca de identificadores de backend/segredos no bundle público não encontrou correspondências; isso não constitui detecção exaustiva de segredos. Env reais locais não foram impressos. Git rastreia somente .env.example entre arquivos env encontrados; histórico completo não auditado.

Verificador `scripts/check-public-files.mjs` e regressão sintética adicionados ao CI para recusar dotfiles, bancos/auxiliares, dumps, backups, logs, chaves, source maps e symlinks nas entradas públicas. Extensões não detectam segredo dentro de JSON/JS permitido. `.assetsignore` gerado exclui `_worker.js` e controles do Cloudflare; não publicar essa pasta por servidor genérico que ignore essas regras.

API exige autenticação em BaseController. Rotas próprias usam `current_user.routes` (`routes_controller.rb:124`); interações comunitárias consultam somente rotas públicas. Senhas usam bcrypt/has_secure_password; reset guarda SHA256 do token aleatório e expira após duas horas. Login/reset possuem limites Rails, porém cache de produção é memory_store: limites são por processo e reiniciam com ele; limite compartilhado/na borda continua pendente. Não foram encontrados send_file/download arbitrário ou listagem explícita de diretórios.

## Validação realizada e pendências

- svelte-check: zero erros/warnings; build Cloudflare concluído.
- Testes sintéticos do JWT em Docker Ruby: 3 testes/8 assertivas; assinatura, claims, expiração e alteração de versão após troca de senha. Teste isolado não usa banco nem substitui teste HTTP de reset/autorização.
- Teste Node: arquivos privados/symlinks recusados, asset legítimo aceito; verificador aplicado às entradas públicas e `_app` compilado.
- Nenhuma validação HTTP de produção, origem alternativa, directory listing ou traversal/fallback SPA foi executada; configuração externa ainda precisa ser ensaiada. APK não recompilado nesta revisão.
- Antes de publicar: testar login/reset com banco sintético e usuários distintos, adicionar revogação de logout, migrar armazenamento de sessão, conferir cookies/CORS/CSRF, limites compartilhados e proteção de proxies públicos contra abuso/custos. Proxies de mapas/clima fazem trabalho remoto sem autenticação; não foi testada exploração ou capacidade externa.
- Se houver evidência de exposição anterior: preservar logs, revogar sessões, trocar segredos afetados e revisar usuários/ações. Não alterar produção automaticamente.

Backup/retenção e provedores deste projeto precisam de decisão própria; política de 12 backups da adega não foi automaticamente aplicada ao TrackRide.
