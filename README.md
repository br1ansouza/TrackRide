# TrackRide

App para planejar rotas de moto com análise de clima por trecho. Mostra alertas de chuva, vento e visibilidade ao longo do caminho, calcula um score de segurança e sugere paradas estratégicas.

Projeto pessoal, de uso real. Ando de moto em SC e queria algo que cruzasse rota com previsão do tempo antes de sair — não só o clima do destino, mas de cada trecho no horário que vou estar passando ali.

## Por que essa stack?

**SvelteKit + Svelte 5** — Queria testar Svelte em algo real. É leve, o bundle é pequeno, e a reatividade com runes ($state, $derived) é simples de entender. Pra um app mobile-first que precisa ser rápido, fez sentido.

**Ruby on Rails 8.1 (API mode)** — Produtividade. Levantar autenticação, CRUD, PostGIS, jobs e mailer em Rails é rápido. Não precisava de nada mais complexo pro backend.

**Capacitor** — Esse era o teste principal. Queria saber se dá pra pegar um app SvelteKit rodando no browser e empacotar como app Android nativo sem reescrever nada. Spoiler: funciona. GPS, haptics, background location — tudo via plugins nativos, com fallback pro browser.

A ideia era validar se Capacitor serve como caminho de migração pra mobile em projetos web existentes, sem precisar de React Native ou Flutter.

## Stack

- **Frontend:** SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4, Skeleton UI
- **Backend:** Rails 8.1 API-only, Ruby 3.3
- **Banco:** PostgreSQL 16 + PostGIS 3.4
- **Mobile:** Capacitor 6 (Android)
- **Mapas:** MapLibre GL JS + OSRM (rotas) + Photon (geocoding)
- **Clima:** OpenWeatherMap (free tier)
- **Infra local:** Docker Compose (PostgreSQL/PostGIS + Redis + Mailpit)

## Estrutura

```
TrackRide/
├── frontend/          # SvelteKit + Capacitor
├── backend/           # Rails API
├── scripts/           # dev.sh, preview.sh
├── docker-compose.yml # PostgreSQL/PostGIS + Redis + Mailpit
└── .kiro/             # Contexto e regras do projeto
```

## Setup local

```bash
# Infra (banco, redis, mailpit)
docker compose up -d

# Backend
cd backend && bundle install && rails db:create db:migrate db:seed && rails s -p 3000 -b 0.0.0.0

# Frontend
cd frontend && npm install && npm run dev

# Ou tudo junto:
./scripts/dev.sh
```

Para testar no celular (preview + APK):
```bash
./scripts/preview.sh
cd frontend && npm run cap:build  # gera APK debug
```

## Premissas

- Apenas APIs e libs gratuitas/open source
- Escopo geográfico: Brasil
- Uso pessoal (sem Play Store por enquanto)
