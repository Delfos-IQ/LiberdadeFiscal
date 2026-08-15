# Worker de OCR — foto + IA (fallback, Fase 5)

Este worker implementa o **único ponto de saída de dados a terceiros** da
app (spec §6.3, §9): quando o utilizador não tem QR e não quer teclear
manualmente, pode tirar uma foto da fatura, que é enviada temporariamente
a este worker para extração de texto por IA de visão.

## Estado atual

Código escrito e revisto (`ocr-fatura.js`), **ainda não desplegado**.
A app funciona por completo sem esta funcionalidade — os fluxos
primário (manual) e secundário (QR) não dependem dele.

## Garantias de privacidade (não negociáveis)

- Sem armazenamento: nenhuma KV, R2, D1 ou log persiste a imagem ou o
  resultado.
- Processamento efémero: a imagem só existe na memória do pedido HTTP
  em curso.
- Sem contas, sem cookies, sem tracking.
- CORS restrito à origem de produção da app.

## Antes de desplegar

1. Confirmar o nome atual do modelo de visão na Groq
   (https://console.groq.com/docs/models) — os nomes de modelos mudam
   com frequência e o valor em `wrangler.toml` pode estar desatualizado
   por altura do deployment.
2. Atualizar `ALLOWED_ORIGIN` em `ocr-fatura.js` para o domínio real de
   produção (por agora aponta para um placeholder de exemplo).
3. Decidir entre Groq (mais barato, mais rápido) ou Anthropic Claude
   Vision (mais caro, potencialmente mais rigoroso) — o spec permite
   ambos. `ocr-fatura.js` está escrito para Groq; trocar de fornecedor
   implica só substituir `chamarGroqVision()`.

## Deployment

```bash
cd worker
npm install -g wrangler   # ou usar npx wrangler
wrangler login
wrangler secret put GROQ_API_KEY
wrangler deploy
```

Depois do deploy, o URL resultante (algo como
`https://liberdade-fiscal-ocr.<subdomínio>.workers.dev`) tem de ser
configurado no módulo cliente que ainda falta construir
(`modules/faturas-foto.js` — câmara/upload + chamada fetch a este
worker + ecrã de confirmação manual obrigatório antes de persistir,
seguindo o mesmo padrão de `saveInvoice()` usado no fluxo manual e QR).

## Contrato da API

**Pedido**: `POST /` com corpo JSON:
```json
{ "imageBase64": "...", "mimeType": "image/jpeg" }
```

**Resposta de sucesso**:
```json
{
  "ok": true,
  "extraido": {
    "estabelecimento": "string ou null",
    "data": "AAAA-MM-DD ou null",
    "valor_total": 12.34,
    "moeda": "EUR",
    "confianca": "alta|media|baixa",
    "texto_bruto_relevante": "..."
  },
  "fonte": "groq-vision",
  "nota": "Processamento efémero — nada foi guardado no servidor."
}
```

O cliente **nunca** deve persistir este resultado diretamente — tem de
passar pelo mesmo ecrã de confirmação manual (`confirmed_by_user: true`
antes de `saveInvoice()`) usado nos outros fluxos, porque a extração por
IA pode errar.
