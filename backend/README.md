# TrackRide — Backend

API Rails 8.1 (API-only, Ruby 3.3) que cuida de autenticação, persistência de rotas com PostGIS e email de reset de senha. Tudo que é mapa/clima/roteamento fica no frontend — aqui não tem chamada a API externa.

## Requisitos

PostgreSQL 16 + PostGIS 3.4, Redis 7 e Mailpit — sobem juntos com o `docker-compose.yml` da raiz:

```bash
docker compose up -d        # na raiz do repo
```

## Setup

```bash
bundle install
rails db:create db:migrate db:seed
rails s -p 3000 -b 0.0.0.0
```

O seed cria um usuário de teste e as rotas públicas da comunidade (6 rotas reais de SC — Serra do Rio do Rastro, Praia do Rosa etc.) pra tela Explore não nascer vazia.

## API (`/api/v1`)

**Auth** (`auth_controller`)
- `POST /auth/register`, `POST /auth/login` — retornam JWT (expira em 7 dias)
- `GET /auth/me`, `PATCH /auth/profile` — perfil, preferência de pilotagem, autonomia da moto
- `POST /auth/forgot_password`, `POST /auth/reset_password` — reset por email; o banco guarda só o SHA-256 do token, resposta sempre genérica (não revela se o email existe)
- Rate limiting nativo do Rails 8: 10/min no login/register, 5/15min no reset

**Rotas** (`routes_controller`)
- CRUD de rotas salvas, isolado por usuário (`current_user.routes`), com paginação
- `route_stops_attributes` aninhado — paradas (posto/restaurante/descanso/mirante) criadas junto com a rota; no PATCH, substituídas em transação
- `GET /routes/explore?lat=&lon=&radius=` — rotas públicas por proximidade (PostGIS `ST_DWithin`, default 80km)
- `POST /routes/:id/like` / `DELETE /routes/:id/unlike` — curtidas
- `POST /routes/:id/complete` — registra percurso completado e incrementa contador

Health check em `GET /up` — é ele que o frontend usa como probe de conectividade no modo offline.

## Modelos

- `User` — `has_secure_password`, enum de preferência de pilotagem, autonomia opcional
- `Route` — coordenadas como geometria PostGIS (recebidas como `[lon, lat]`, sanitizadas antes do WKT), flag pública com validações de distância (5–1000km) e bloqueio de duplicata por proximidade
- `RouteStop` — parada com tipo, posição PostGIS e ordenação
- `RouteLike` / `RouteCompletion` — social: curtida única por usuário, completions ilimitadas

## Email

Dev usa Mailpit (SMTP `localhost:1025`, UI em `localhost:8025`) — todo email fica capturado local. Template do reset em HTML com cores fixas do tema (email não suporta CSS variables). Produção (planejado): Amazon SES.

## Qualidade

Os mesmos checks do CI rodam local:

```bash
bin/rubocop          # estilo (rubocop-rails-omakase)
bin/brakeman         # análise estática de segurança
bin/bundler-audit    # CVEs nas gems
```

Sem suite de testes por enquanto — validação manual pelo app e por chamadas diretas à API.
