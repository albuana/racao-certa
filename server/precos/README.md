# Servidor de preços

Pequeno servidor (Cloudflare Worker, plano grátis) que procura onde cada ração está mais barata em Portugal, através do Google Shopping (serviço SerpApi). A chave da SerpApi fica só no servidor, nunca dentro da app.

## Pôr a funcionar (uma vez, ~10 minutos)

1. Cria conta grátis em https://serpapi.com e copia a tua **API key**.
2. Cria conta grátis em https://dash.cloudflare.com.
3. No terminal, dentro desta pasta (`server/precos`):
   ```bash
   npx wrangler login
   npx wrangler secret put SERPAPI_KEY      # cola a chave da SerpApi
   npx wrangler secret put APP_TOKEN        # inventa um código, ex.: racao-2026-xyz
   npx wrangler deploy
   ```
   No fim aparece o endereço, algo como `https://racao-certa-precos.<o-teu-nome>.workers.dev`.
4. Na pasta principal da app, cria um ficheiro `.env.local` com:
   ```
   EXPO_PUBLIC_PRICES_API_URL=https://racao-certa-precos.<o-teu-nome>.workers.dev
   EXPO_PUBLIC_PRICES_TOKEN=racao-2026-xyz
   ```
5. Reinicia o Expo (`npx expo start -c`).

## Testar

```bash
curl -H "x-app-token: racao-2026-xyz" "https://racao-certa-precos.<o-teu-nome>.workers.dev/precos?nome=Purina%20Junior&marca=Purina%20one&kg=2.8"
```

Testes das funções: `node --test server/precos/parse.test.js`

## Custos

- Cloudflare Workers: plano grátis chega (100 000 pedidos por dia).
- SerpApi: plano grátis com 250 pesquisas por mês; depois, planos pagos. Cada ração só é pesquisada uma vez por dia (fica guardada 24 h), por isso muitas pessoas com a mesma ração gastam uma só pesquisa.

## Limitações

- Só aparecem lojas que vendem online e estão no Google Shopping. Superfícies sem loja online não aparecem.
- Os preços não incluem portes.
