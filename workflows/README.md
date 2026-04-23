# Workflows n8n

Diretório para armazenar os fluxos n8n exportados em `.json`.

## Convenção de nomenclatura

```
{dominio}_{descricao}_{versao}.json
```

**Exemplos:**
- `financeiro_criar-subconta-asaas_v1.json`
- `whatsapp_receber-mensagem-uazapi_v1.json`
- `agendamento_onboarding-consultor_v1.json`

## Como exportar um workflow do n8n

1. Abra o workflow no n8n
2. Menu → Download → Export as JSON
3. Salve nesta pasta com a convenção acima
4. Faça commit com a mensagem: `feat(workflows): adiciona {nome-do-workflow}`

## Ambientes

| Ambiente | Base URL |
|---|---|
| Produção | `https://webhook.agentepilot.com` |
| Teste | `https://auto.pedro-fagundes.com` |
