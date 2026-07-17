# TrackRide — Frontend

App SvelteKit mobile-first que roda em três formatos com o mesmo código: web (dev/preview), PWA e APK Android standalone via Capacitor.

## Telas

**Principal (`/`)** — layout muda por dispositivo:

- *Desktop*: mapa em tela cheia com header de busca (origem/destino), sidebar de clima e dropdown de perfil
- *Mobile*: bottom nav com 4 abas
  - **Mapa** — MapLibre GL (tema CARTO Dark Matter), traçado da rota, markers de paradas/clima/posição GPS, botão de download do mapa offline e navegação ao vivo (câmera com bearing/pitch, recálculo ao sair da rota)
  - **Clima** — previsão por trecho (pontos a cada 90km no horário estimado de passagem), score 0–100 da rota, alertas (chuva, vento, visibilidade, frio/calor), gestão de paradas e botão salvar/atualizar rota
  - **Buscar** — painel flutuante com autocomplete (Photon, filtrado por Brasil) e "Minha localização" via reverse geocoding
  - **Perfil** — preferência de pilotagem (calm/mixed/sport), autonomia da moto, rotas públicas próximas (Explore), histórico com edição, auto-download de mapa offline e logout

**Auth** — `/login`, `/register`, `/forgot-password`, `/reset-password` (token via URL do email).

## Como o código se organiza

```
src/lib/
├── components/   # Map, RouteWeather, BottomNav, ProfilePanel, TrackingOverlay...
├── services/     # Lógica de dados: api, gateway, routes, weather, offline*
│   └── external/ # Clients puros das APIs externas (Photon, OSRM, OWM, Overpass)
├── stores/       # Estado com runes: auth, connectivity, useRouteSearch, useTracking
├── styles/       # tokens.css — design tokens --color-ride-* (nunca cor hardcoded)
├── utils/        # idb, tileMath, transitions, haptics, safeArea...
└── types/        # Tipos compartilhados
src/routes/api/   # Proxies server-side (geocode, route, forecast, fuel-stations)
```

Peça central: `services/gateway.ts`. No build web, chamadas externas passam pelos proxies em `src/routes/api/`; no build standalone (sem server SvelteKit) o gateway chama OWM/Photon/OSRM/Overpass direto do client.

## Modo offline

Pensado pra estrada sem sinal:

- `offlinePack.ts` — pacote da viagem no IndexedDB: traçado, paradas e snapshot de clima (TTL 3h)
- `offlineTiles.ts` — protocol `offline://` do MapLibre + prefetch de tiles num corredor ao longo da rota (zooms 7–14, ~30–40MB por 300km)
- `syncQueue.ts` — percursos encerrados sem rede sobem sozinhos quando a conexão volta
- `connectivity.svelte.ts` — detecção online/offline via probe no backend (`navigator.onLine` mente na WebView)

## Rodando

```bash
npm install
npm run dev                 # dev server (ou ./scripts/dev.sh na raiz, que sobe tudo)
npm run check               # svelte-check (mesmo do CI)
npm run build               # build web (adapter-node)
npm run cap:build           # APK debug (build standalone + gradle)
```

APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Configuração

- `.env` — `VITE_API_HOST` (host do backend embutido no APK) e `VITE_OWM_KEY` (só usados no build standalone)
- `capacitor.config.ts` — no `.gitignore` por conter host privado; usar `capacitor.config.example.ts` como base

## Convenções

As regras completas estão em `.kiro/rules.md` na raiz. As que mais aparecem no código:

- Cores só via tokens `--color-ride-*` (`tokens.css`); no JS, `cssVar()` converte oklch → hex pro MapLibre
- Ícones só de `lucide-svelte`
- Runes fora de componente → arquivo `.svelte.ts`
- Transições com presets de `utils/transitions.ts`; feedback tátil via `utils/haptics.ts`
- Elementos flutuantes mobile posicionados com as constantes de `utils/safeArea.ts`
