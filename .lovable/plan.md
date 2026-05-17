
## Objetivo

Estender o Abastece.ao com duas novas capacidades:

1. **Submeter posto novo** — qualquer utilizador (anónimo ou autenticado) pode propor um posto que ainda não esteja no mapa.
2. **Área do proprietário/funcionário** — separador específico onde quem gere o posto faz atualizações de stock marcadas como "oficiais", com mais peso visual e maior confiança.

---

## 1. Submissão de postos pelos utilizadores

### Fluxo
- Botão **"Não encontro o meu posto"** no ecrã do mapa e no ecrã `/reportar`.
- Abre formulário `/postos/novo` com: nome, marca (Sonangol / Pumangol / TotalEnergies / Outro), morada, província, e localização (toque no mapa ou usar GPS atual).
- Submissão entra como **pendente** — não aparece imediatamente no mapa público. Aparece etiquetado como "Aguarda verificação" para o próprio submetente.
- Após 3 reportes independentes (device_id distintos) ou aprovação de um admin, o posto passa a `approved` e fica visível para todos.

### Dados
- Adicionar coluna `status` a `stations`: enum `pending | approved | rejected`, default `pending` para novas inserções (seed continua `approved`).
- Adicionar `submitted_by_user_id` (nullable) e `submitted_by_device_id` (nullable), `confirmations_count` (int).
- RLS: leitura pública só de `approved`; leitura do próprio `pending` permitida ao submetente (via device_id ou user_id); insert permitido a anónimos com device_id; update reservado a admin via `has_role`.

### Server functions novas
- `submitStation` (Zod: nome 2–80, marca enum, lat/lng válidos para Angola, morada opcional).
- `confirmStation` (incrementa `confirmations_count`; ao chegar a 3, promove a `approved`).

---

## 2. Área do proprietário / funcionário

### Papéis
- Estender enum `app_role` com `station_owner` (admin continua existindo).
- Nova tabela `station_managers` (`user_id`, `station_id`, `role: owner | staff`, `verified_at`).
- Apenas admin pode inserir/aprovar em `station_managers` no MVP. Utilizador pede acesso via formulário ("Sou responsável deste posto") com nome, telefone e prova (texto livre / link). Pedido fica em tabela `station_manager_requests` (`pending | approved | rejected`) para o admin tratar manualmente.

### Separador "Gestor" no app
- Adicionar item à bottom-nav **só quando** o utilizador autenticado tiver pelo menos uma linha em `station_managers`. Substitui visualmente o "Perfil" por um menu (Perfil + Gestor) ou aparece como 5.º item conforme o espaço.
- Rota `/gestor` lista os postos que o utilizador gere. Cada cartão tem:
  - Estado atual por combustível (Gasolina / Gasóleo).
  - Botão grande **"Atualizar stock agora"** → formulário inline rápido (estado, preço, fila estimada, observação).
  - Botão **"Marcar como esgotado"** / **"Marcar como reposto"** com um toque.
  - Histórico das últimas atualizações oficiais.

### Reportes "oficiais"
- Adicionar coluna `source` a `reports`: enum `community | official`, default `community`.
- Reportes feitos a partir de `/gestor` são gravados com `source = official` (servidor valida via `station_managers`).
- A view `station_status_latest` passa a preferir o reporte oficial mais recente das últimas 6 h; só usa comunitário se não existir oficial.
- UI: badge **"Oficial"** (selo azul) nos cartões de posto e nos pins do mapa quando o estado atual vem de um gestor.

### Server functions novas
- `submitOfficialReport` — middleware `requireSupabaseAuth` + verificação `station_managers`. Reutiliza a validação Zod do reporte normal.
- `listMyStations` — devolve os postos geridos pelo utilizador autenticado com estado atual por combustível.
- `requestManagerAccess` — cria entrada em `station_manager_requests`.

---

## 3. Mudanças de UI

- **Mapa / Lista**: pino e cartão ganham selo "Oficial" quando aplicável; postos `pending` próprios aparecem com pino tracejado.
- **`/reportar`**: link "Não vejo o meu posto" → `/postos/novo`.
- **Bottom-nav**: item "Gestor" condicional (mostrado se for manager). Caso contrário, link discreto em `/perfil` → "Sou responsável por um posto" → `/gestor/pedir`.
- **`/perfil`**: secção "Os meus postos submetidos" com estado (pendente / aprovado / rejeitado).
- **Filtros**: opção "Só com reporte oficial recente".

---

## 4. Detalhes técnicos

- Migração única: alterar `stations`, `reports`, criar `station_managers`, `station_manager_requests`, atualizar enum `app_role`, recriar view `station_status_latest` com prioridade a `official`, ajustar políticas RLS.
- Anti-abuso: rate-limit de 1 submissão de posto por device_id / hora; bounding-box de Angola (lat −18 a −4, lng 11 a 24) para rejeitar coordenadas absurdas.
- O primeiro admin é o utilizador que indicar — após implementação, peço o email para inserir manualmente em `user_roles`.
- Sem alteração ao stack (TanStack Start + Lovable Cloud + react-leaflet).

---

## Fora do âmbito desta iteração

- Verificação automática de propriedade (KYC, documentos).
- Notificações push reais a clientes quando o gestor repõe stock (continua via polling).
- Painel de admin web para aprovar postos/gestores (fica para depois — por agora aprovação via SQL/admin manual).

Confirmas para avançar?
