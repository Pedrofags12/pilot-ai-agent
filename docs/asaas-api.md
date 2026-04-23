# Asaas API — Referência de Integração

**Versão:** v3 | **Base URL Produção:** `https://api.asaas.com/v3`  
**Base URL Sandbox:** `https://sandbox.asaas.com/api/v3`

## Autenticação

```
Header: access_token: {SEU_ACCESS_TOKEN}
```

> **REGRA DO PRD:** Jamais logar ou retornar `access_token` em respostas de API ou console.

---

## 1. Subcontas (White-label)

### Criar subconta
```
POST /accounts
```

**Body:**
```json
{
  "name": "Nome do Consultor",
  "email": "consultor@email.com",
  "loginEmail": "consultor@email.com",
  "cpfCnpj": "000.000.000-00",
  "birthDate": "1990-01-01",
  "mobilePhone": "11999999999",
  "address": "Rua Exemplo",
  "addressNumber": "100",
  "province": "Centro",
  "postalCode": "00000-000"
}
```

**Resposta relevante:**
```json
{
  "id": "acc_xxx",        → asaas_account_id (salvar em asaas_subaccounts)
  "walletId": "wal_xxx",  → wallet_id (salvar em asaas_subaccounts)
  "apiKey": "xxx"         → access_token (NUNCA logar)
}
```

---

## 2. Split de Pagamento

### Criar cobrança com split
```
POST /payments
```
**Header:** `access_token` da subconta (não da conta mãe)

**Body com split:**
```json
{
  "customer": "cus_xxx",
  "billingType": "PIX",
  "value": 100.00,
  "dueDate": "2026-05-01",
  "description": "Serviço de consultoria",
  "split": [
    {
      "walletId": "{WALLET_ID_PAI}",   ← obrigatório — regra do PRD
      "percentualValue": 20            ← percentual para a Pilot AI
    }
  ]
}
```

> **REGRA DO PRD:** `split` é **obrigatório** em toda transação. Nunca criar cobrança sem `walletId` da conta mãe.

---

## 3. Webhooks do Asaas

### Eventos relevantes

| Evento | Descrição |
|---|---|
| `PAYMENT_CONFIRMED` | Pagamento confirmado |
| `PAYMENT_RECEIVED` | PIX recebido |
| `PAYMENT_OVERDUE` | Pagamento vencido |
| `PAYMENT_REFUNDED` | Estorno realizado |

### Configurar webhook
```
POST /webhooks
```
```json
{
  "url": "https://webhook.agentepilot.com/webhook/asaas-payment",
  "email": "notificacoes@pilotai.com.br",
  "enabled": true,
  "events": ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED"]
}
```

### Payload de entrada (exemplo PAYMENT_CONFIRMED)
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_xxx",
    "customer": "cus_xxx",
    "value": 100.00,
    "netValue": 98.50,
    "status": "CONFIRMED",
    "paymentDate": "2026-04-21"
  }
}
```

**Mapeamento para `financial_entries`:**
- `payment.id` → `asaas_payment_id`
- `payment.value` → `amount`
- `payment.netValue` → `net_amount`
- `payment.status` → `status` (mapear: CONFIRMED → confirmed)
- `origin` → `asaas_webhook`

---

## 4. Wallet ID Pai (Pilot AI)

> Preencher com a Wallet ID da conta mãe Pilot AI antes de ir para produção.

```
WALLET_ID_PAI = (preencher)
```

Configurar como variável de ambiente `ASAAS_WALLET_ID_PAI` nas Edge Functions.
