# Uazapi — Referência de Integração

**Base URL:** `https://pilot.uazapi.com`  
**Instância:** Pedro Fagundes workspace  
**Webhook inbound (n8n):** `https://webhook.agentepilot.com/webhook/atendimento-inicial`  
**Auth (token):** variável de ambiente `UAZAPI_TOKEN` (nunca commitar o valor)

---

## 1. Payload de entrada (Uazapi → n8n)

Enviado pelo user-agent `uazapiGO-Webhook/1.0` via POST para o webhook n8n.

### Estrutura completa relevante

```json
{
  "body": {
    "BaseUrl": "https://pilot.uazapi.com",
    "EventType": "messages",
    "instanceName": "Pedro Fagundes workspace",
    "token": "{UAZAPI_TOKEN}",
    "owner": "5511988498268",

    "chat": {
      "phone": "+55 11 98849-8268",   ← número do contato (com formatação)
      "name": "Pedro Henrique",        ← nome exibido no WhatsApp
      "wa_name": "Pedro Henrique",     ← nome salvo na agenda
      "owner": "5511988498268",        ← número da instância (dono)
      "wa_isGroup": false,
      "wa_unreadCount": 0
    },

    "message": {
      "messageid": "3B34B078D8C9D57767E5",  ← ID único — usar para dedup
      "text": "oi",                          ← conteúdo (mensagens de texto)
      "type": "text",                        ← "text" | "audio"
      "mediaType": "",                       ← preenchido em mensagens de mídia
      "fromMe": true,                        ← true = enviada pela instância
      "wasSentByApi": false,                 ← true = enviada pelo bot/automação
      "messageTimestamp": 1773419641000,    ← Unix ms → dividir por 1000
      "chatid": "5511988498268@s.whatsapp.net",
      "isGroup": false
    }
  }
}
```

---

## 2. Mapeamento: Uazapi → sync-chat (Edge Function)

| Campo Uazapi | Campo sync-chat | Transformação |
|---|---|---|
| `body.message.text` | `content` | Direto. Para áudio: `"[Áudio recebido]"` |
| `body.chat.phone` | `contact_phone` | `replace(/\D/g, "")` → `"5511988498268"` |
| `body.chat.name` | `contact_name` | Direto |
| `body.message.messageid` | `external_message_id` | Direto — substitui dedup por tempo |
| `body.message.fromMe` + `body.message.wasSentByApi` | `sender` | Ver tabela abaixo |
| `body.message.type` | `media_type` | `"text"` \| `"audio"` |

### Regra de sender

| `fromMe` | `wasSentByApi` | `sender` | Significado |
|---|---|---|---|
| `false` | — | `"client"` | Mensagem do cliente/lead |
| `true` | `true` | `"bot"` | Enviada pelo n8n/IA via API |
| `true` | `false` | `"human"` | Enviada manualmente pelo admin |

> **Crítico:** `sender: "human"` desativa a IA no lead (`ai_active = false`). Nunca enviar `"human"` para mensagens do bot.

---

## 3. Filtros obrigatórios no n8n (antes de chamar sync-chat)

Adicionar estes filtros no nó **IF** do workflow para evitar processamento desnecessário:

```
body.EventType === "messages"         ← ignorar eventos de status, presença, etc.
body.message.isGroup === false        ← ignorar grupos (por ora)
body.message.text !== ""              ← ignorar mensagens sem conteúdo
body.message.type in ["text","audio"] ← tipos suportados
```

---

## 4. Payload que o n8n deve enviar ao sync-chat

**Endpoint:** `https://{SUPABASE_URL}/functions/v1/sync-chat`  
**Header:** `x-n8n-key: {n8n_key}`  
**Content-Type:** `application/json`

```json
{
  "contact_phone": "5511988498268",
  "contact_name": "Pedro Henrique",
  "content": "oi",
  "sender": "client",
  "external_message_id": "3B34B078D8C9D57767E5",
  "media_type": "text"
}
```

---

## 5. Envio de mensagem (Outbound — n8n → Uazapi → WhatsApp)

### Texto
```
POST https://pilot.uazapi.com/message/sendText
Header: token: {UAZAPI_TOKEN}
```
```json
{
  "phone": "5511988498268",
  "message": "Olá! Como posso ajudar?"
}
```

### Áudio
```
POST https://pilot.uazapi.com/message/sendAudio
Header: token: {UAZAPI_TOKEN}
```
```json
{
  "phone": "5511988498268",
  "audio": "{URL_DO_AUDIO}"
}
```

---

## 6. Variáveis de ambiente necessárias

| Variável | Onde configurar | Valor |
|---|---|---|
| `UAZAPI_TOKEN` | Deno secrets + n8n credential | `7d32d50a-...` (não commitar) |
| `UAZAPI_BASE_URL` | n8n credential | `https://pilot.uazapi.com` |
