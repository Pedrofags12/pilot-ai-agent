
Plano: remover completamente o módulo Financeiro da plataforma (banco, frontend, navegação e referências).

## O que será removido

**Banco de dados (migration)**
- DROP TABLE `financial_entries` CASCADE
- DROP TABLE `financial_categories` CASCADE

**Frontend - páginas e componentes**
- Deletar `src/pages/admin/Financeiro.tsx`
- Deletar pasta `src/components/admin/financeiro/` (MonthlyChart.tsx, CategoryManager.tsx, EntryFormDialog.tsx e qualquer outro arquivo dentro)

**Roteamento e navegação**
- `src/App.tsx`: remover import de `Financeiro` e a rota `<Route path="financeiro" element={<Financeiro />} />`
- `src/pages/admin/Layout.tsx`: remover item de menu `{ href: "/admin/financeiro", icon: DollarSign, label: "Financeiro" }` e o import `DollarSign` se não for usado em outro lugar

**Referências em outras páginas**
- Buscar por "financ", "Financeiro", "financial_entries", "financial_categories", "DollarSign" no projeto e remover qualquer card, link, métrica ou texto que mencione o módulo (ex: cards no Dashboard, menções em Funcionalidades, Suporte, etc.)
- Remover textos promocionais sobre controle financeiro em landing pages se existirem

**Tipos**
- O arquivo `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration, então as tipagens de `financial_entries` e `financial_categories` serão removidas automaticamente.

## Passos de execução

1. Criar migration SQL para dropar as duas tabelas
2. Deletar arquivos da página e componentes do financeiro
3. Limpar `App.tsx` (rota + import)
4. Limpar `Layout.tsx` (item do menu + import do ícone se órfão)
5. Varrer o projeto com search por "financeiro"/"financial" e remover referências restantes
6. Confirmar que não restou nenhum import quebrado

## Confirmação de escopo

Vou apagar **tudo**: tabelas, dados existentes, página, componentes, rota, item de menu e qualquer texto/referência ao módulo Financeiro. Não haverá backup nem possibilidade de restaurar via UI depois — só recriando do zero.
