# PRD: Pilot AI / Élo App - Consultant Bot
**Versão:** 1.0 | **Data:** Abril/2026

## 1. Visão Geral
A plataforma é um ecossistema de automação para consultores que utiliza IA para gerenciar agendamentos, onboarding de clientes e automação financeira via Asaas (com modelo de Split de Pagamento).

## 2. Stack Tecnológica
- **Motor de Execução:** n8n (fluxos exportados em .json)
- **Banco de Dados:** Supabase (PostgreSQL)
- **Integração Financeira:** Asaas API (Subcontas + Split)
- **Mensageria:** WhatsApp (via Uazapi)
- **IA:** Claude/OpenAI para geração de roteiros e revisões.

## 3. Arquitetura de Pastas (consultant-bot-pilot)
- `/workflows`: Contém os JSONs dos fluxos do n8n.
- `/scripts`: Scripts auxiliares de limpeza e manutenção.
- `/docs`: Documentação de APIs (Asaas, Uazapi).

## 4. Regras de Negócio Críticas
- **Financeiro:** Cada transação deve obrigatoriamente ter um Split configurado para a Wallet ID Pai.
- **Segurança:** Jamais expor `access_token` em logs.
- **Escalabilidade:** O banco de dados deve ser limpo a cada 30 dias (Gari Digital).
