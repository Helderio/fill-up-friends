## Abastece.ao — App móvel

Aplicação **mobile-first** em PT-PT para automobilistas angolanos partilharem em tempo real onde há combustível, a que preço e com que fila. Pensada e desenhada como app de telemóvel: layout em coluna única, navegação por bottom-bar, FAB de reportar, gestos de toque. Funciona no browser do telemóvel e é instalável no ecrã inicial (Adicionar ao Ecrã Principal) através de um manifest simples — sem service worker, para não interferir com o preview.

Login opcional: qualquer pessoa pode ver e reportar; quem cria conta acumula histórico e pontos.

### Experiência mobile

- Largura máxima do conteúdo limitada a ~480 px e centrada (também boa em desktop, mas o desenho é de telemóvel).
- **Bottom navigation** fixa: Mapa · Lista · Reportar (FAB laranja central) · Alertas · Perfil.
- **Header compacto** com logo Abastece.ao + botão de filtros.
- **Mapa em ecrã inteiro** com bottom sheet arrastável para a lista de postos próximos.
- Botões grandes (mín. 44 px), tipografia legível ao sol, cores de estado fortes.
- Gestos: toque num pin abre cartão do posto; deslizar o bottom sheet para cima mostra lista completa.
- Suporte a `safe-area-inset` para iPhones com notch.
- Instalável: `manifest.json` com ícones e `display: "standalone"` (sem service worker — funcionalidade offline fica para v2).

### Funcionalidades MVP

1. **Mapa de postos** com pins coloridos por estado (verde=disponível, âmbar=pouco stock, vermelho=sem stock) + legenda flutuante.
2. **Lista de postos próximos** ordenada por distância, com nome, morada, estado, preço (Kz/L), fila estimada e tempo desde o último reporte.
3. **Filtros** (folha inferior): tipo de combustível (Gasolina / Gasóleo), raio (10/25 km / Toda a província).
4. **Reportar estado** — formulário rápido em ecrã inteiro (escolher posto, combustível, estado, preço opcional, fila estimada). Funciona com ou sem login.
5. **Detalhe do posto** — histórico recente de reportes.
6. **Alertas de proximidade** — toggle "avisar quando há combustível perto" (notificação do browser enquanto o app está aberto).
7. **Login opcional** — email/password via Lovable Cloud. Anónimos identificados por device-id para limitar spam.

### Estrutura de rotas (TanStack Start)

- `/` — Mapa + bottom sheet com lista.
- `/lista` — Lista em ecrã inteiro.
- `/postos/$stationId` — Detalhe + histórico + reportar.
- `/reportar` — Formulário em ecrã inteiro.
- `/alertas` — Gerir alertas.
- `/login`, `/registar`, `/perfil` — auth opcional.

### Design

Direção escolhida ("Cívico industrial"): laranja `#F97316` (marca/CTA), navy `#0F172A` (texto), verde/âmbar/vermelho semânticos, fundo slate-50. Inter (UI) + IBM Plex Mono (preços/timestamps). Cartões com barra superior na cor do estado; "Sem stock" desaturado. Bottom-nav com FAB laranja central elevado.

### Dados (Lovable Cloud)

Tabelas:
- `stations` (id, nome, marca, morada, lat, lng, província)
- `reports` (id, station_id, user_id nullable, device_id, fuel_type enum, status enum, price_kz nullable, queue_minutes nullable, created_at)
- `profiles` (id, display_name, points)
- `proximity_alerts` (id, user_id, station_id, fuel_type, active)
- `user_roles` (preparada, não usada no MVP)

View `station_status` agrega o reporte mais recente por (station_id, fuel_type) nas últimas 6 h.

RLS: leitura pública de `stations` e `reports`; insert de `reports` permitido a anónimos com validação Zod no server-fn; `profiles` e `proximity_alerts` apenas do próprio utilizador.

Seed: ~20 postos reais de Luanda (Sonangol, Pumangol, TotalEnergies) com coordenadas aproximadas.

### Detalhes técnicos

- **Mapa**: `react-leaflet` + OpenStreetMap (sem chave). Pins SVG coloridos por estado. Centrado na localização do utilizador ou no centro de Luanda.
- **Geolocalização**: `navigator.geolocation` com fallback.
- **Server functions** (`createServerFn`): `listStations`, `getStationDetail`, `submitReport`, `toggleProximityAlert`. `requireSupabaseAuth` quando aplicável.
- **Validação**: Zod (preço 0–10000 Kz, fila 0–600 min, enums).
- **Tempo relativo** PT-PT ("há 12 min", "há 2 h").
- **Alertas** via polling 60 s + `Notification` API enquanto o tab está ativo.
- **Anti-spam**: rate-limit por device_id (5 reportes / 10 min).
- **Instalável**: `manifest.json` + meta tags (sem service worker).

### Fora do MVP

- Votação de confiança em reportes.
- Notificações push reais (service worker).
- App nativa iOS/Android.
- Suporte offline.
