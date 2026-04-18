# TrackRide

App para planejar rotas de moto com análise de clima por trecho, alertas e sugestões de rotas alternativas.

## Stack

- **Frontend:** SvelteKit (TypeScript)
- **Backend:** Ruby on Rails (API mode)
- **Banco:** PostgreSQL + PostGIS
- **Cache:** Redis

## Estrutura

```
TrackRide/
├── frontend/          # SvelteKit
├── backend/           # Rails API
├── docker-compose.yml # PostgreSQL/PostGIS + Redis
└── README.md
```

## Setup

```bash
# Subir banco e redis
docker compose up -d

# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && bundle install && rails db:create db:migrate && rails s -p 3000
```
