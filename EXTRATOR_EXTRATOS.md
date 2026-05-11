# Extratora — Leitor de Extratos Bancários

> Documento vivo — atualizar sempre que houver mudança de arquitetura, banco novo ou decisão de produto.
> Última atualização: 2026-05-11

---

## Nome da Ferramenta

**Extratora** ✅ — definido em 2026-05-11

> Nome a usar em: comentários de código, título do modal no app ("📄 Extratora"), toasts, mensagens de erro e documentação.

---

## O que é

Ferramenta embutida no app de finanças responsável por ler PDFs de extratos bancários e convertê-los em lançamentos prontos para importar. Funciona 100% no browser — nenhum dado é enviado a servidores externos.

Acesso: botão "Importar Extrato" no dashboard → modal com duas abas (PDF e Texto).

---

## Estado Atual (antes da refatoração)

- Parser genérico único em `js/ai-engine.js`
- Tenta cobrir todos os bancos com um conjunto de regex amplas
- Resultado inconsistente: perde lançamentos em alguns bancos, captura lixo em outros
- Arquivo standalone de dev: `tools/leitorDeExtratos.html` (não integrado ao app)
  - Contém parser Nubank de fatura bem desenvolvido (`parseFatura`)
  - Contém extração de linhas por Y-coordinate (melhor que o atual)
  - Não será deletado até todos os parsers estarem migrados e testados

---

## Arquitetura Planejada

### Três Camadas

```
CAMADA 1 — Detecção
  detectBank(texto) → identifica o banco pelos fingerprints do PDF
  detectType(texto, banco) → identifica tipo (fatura cartão / extrato conta / pix)

CAMADA 2 — Validação
  validateStatement(texto) → confirma que é um extrato real (não contrato, boleto avulso, NF)
  validateBankMatch(detectado, selecionado) → avisa se banco detectado ≠ banco selecionado

CAMADA 3 — Parsing
  BANK_PARSERS[banco](linhas) → retorna array de lançamentos no contrato padrão
```

### Contrato de Saída (todos os parsers)

Todos os parsers retornam exatamente o mesmo formato:

```js
{
  desc:           String,       // descrição limpa do lançamento
  amount:         Number,       // valor positivo sempre
  date:           String,       // "YYYY-MM-DD"
  category:       String|null,  // categoria auto-detectada
  entryType:      'cartao' | 'debito' | 'boleto' | 'pixin' | 'pixout',
  isMine:         Boolean,      // true por padrão
  installment:    Boolean,
  installCurrent: Number|null,
  installTotal:   Number|null,
  person:         String|null,  // para PIX: nome do remetente/destinatário
  _confidence:    Number,       // 0-100: certeza do parser (abaixo de 60 → destacar para revisão)
  _bankSource:    String,       // 'nubank' | 'inter' | 'generic' etc.
}
```

### Estrutura de Arquivos

```
js/
  ai-engine.js              ← orquestrador: chama detecção → validação → parser
  extractors/
    _base.js                ← helpers: extractLinesFromPdf, extractName, extractParcela, parseValor
    _registry.js            ← BANK_PARSERS, detectBank, validateStatement, FINGERPRINTS
    nubank.js               ← leitorNubank (fatura cartão + extrato conta)
    inter.js                ← leitorInter
    itau.js                 ← leitorItau
    bradesco.js             ← leitorBradesco
    caixa.js                ← leitorCaixa
    bb.js                   ← leitorBB (Banco do Brasil)
    santander.js            ← leitorSantander
    c6.js                   ← leitorC6
    mercadopago.js          ← leitorMercadoPago
    picpay.js               ← leitorPicPay
    sicredi.js              ← leitorSicredi
    sicoob.js               ← leitorSicoob
    generic.js              ← leitorGenerico (fallback para bancos sem parser específico)
```

---

## UI — O que Muda (e o que NÃO muda)

### O que NÃO muda para o usuário
- Fluxo geral: abrir modal → ver lançamentos → selecionar → importar
- Fase 2 (tela de resultados com checkboxes) — igual
- Formato de importação dos lançamentos

### O que muda

**Modal passa a ter duas abas:**

```
[📎 Importar PDF]    [✏️ Digitar / Colar texto]
```

**Aba PDF:**
- Dropdown de banco (substitui chips de tipo — tipo é auto-detectado)
- Zona de upload
- Auto-detecção do banco → compara com seleção → avisa se divergir
- Tipo de extrato detectado automaticamente (seta chip)
- Se banco não reconhecido → pergunta ao usuário

**Aba Texto (modo diferente — escolha do usuário: Opção C):**
- Textarea grande
- Preview em tempo real dos lançamentos detectados enquanto o usuário digita/cola
- Parser genérico sempre (sem seleção de banco)
- Mês e banco de destino

---

## Fingerprints de Detecção por Banco

| Banco | Strings-chave no PDF |
|-------|---------------------|
| Nubank | "Nu Pagamentos S.A.", "nubank.com.br", "NuConta", "NU PAGAMENTOS" |
| Inter | "Banco Inter S.A.", "BCO INTER S/A", "bancointer.com.br" |
| Itaú | "Itaú Unibanco S.A.", "ITAÚ UNIBANCO", "itau.com.br" |
| Bradesco | "Banco Bradesco S.A.", "bradesco.com.br", "BRADESCO" |
| Caixa | "CAIXA ECONÔMICA FEDERAL", "caixa.gov.br", "CEF" |
| Banco do Brasil | "Banco do Brasil S.A.", "bb.com.br", "BANCO DO BRASIL" |
| Santander | "Banco Santander (Brasil) S.A.", "santander.com.br" |
| C6 Bank | "Banco C6 S.A.", "c6bank.com.br", "C6 BANK" |
| Mercado Pago | "Mercado Pago", "mercadopago.com.br", "MERCADO PAGO" |
| PicPay | "PicPay Serviços S.A.", "picpay.com" |
| Sicredi | "Sistema de Crédito Cooperativo", "sicredi.com.br", "SICREDI" |
| Sicoob | "SICOOB", "sicoob.com.br", "Sistema de Cooperativas" |

---

## Regras de Validação do PDF

Um PDF é considerado extrato válido se:
- ✓ Contém ≥ 3 valores monetários no formato BRL (R$ XX,XX ou XX,XX)
- ✓ Contém ≥ 2 datas (DD/MM ou DD/MM/YYYY ou DD MON)
- ✓ Texto extraído tem > 200 caracteres
- ✗ NÃO contém "LINHA DIGITÁVEL" ou "CÓDIGO DE BARRAS" (boleto avulso)
- ✗ NÃO contém "DANFE", "NF-e", "NOTA FISCAL" (nota fiscal)
- ✗ NÃO contém "CLÁUSULA", "PARTE CONTRATANTE" (contrato)

---

## Notas por Banco

### Nubank
**Tipos de PDF:** Fatura de cartão de crédito / Extrato de conta (NuConta)

**Fatura de cartão:**
- Formato de data: `DD MON` (ex: `10 MAI`) — único do Nubank
- Valor sempre positivo na linha (fatura não tem débito/crédito)
- Linhas a ignorar: seção "Pagamentos e Financiamentos", "Tarifas e Encargos"
- Parcelamento: `3/12` ou `Parcela 3 de 12`
- Internacional: valor em USD com conversão para BRL — capturar o valor em BRL

**Extrato NuConta:**
- Formato: `DD/MM/YYYY Descrição Valor`
- PIX identificado por "Pix recebido" / "Pix enviado"
- Saldo na linha intercalado — ignorar

**Origem do parser:** `tools/leitorDeExtratos.html` → `parseFatura()` (migrar)

### Inter
**Tipos de PDF:** Extrato de conta / Extrato investimentos

**Extrato conta:**
- Formato: `DD/MM/AAAA Descrição Valor` com sinal (+ entrada, - saída)
- Linha de saldo intercalada — ignorar (`"Saldo" no início da linha`)
- PIX: string "PIX" na descrição
- TED/DOC: formato diferente do PIX

**Ignorar:** Extrato de investimentos (CDB, LCI) — não são lançamentos de conta

### Caixa Econômica Federal
- Formato de data pode vir por extenso: `10 de maio de 2025`
- Inclui dados de FGTS e benefícios sociais — dados de benefício devem ser categoria especial
- Tabela com colunas fixas — extração por Y-coordinate é crítica

### Mercado Pago
- Pode exportar CSV disfarçado de PDF
- Inclui transações de Mercado Livre misturadas com conta Mercado Pago
- Valores de recarga de celular têm categoria própria

---

## Roadmap de Implementação

### Fase 0 — Preparação (sem mudar nada visível)
- [ ] Mover `leitorDeExtratos.html` → `tools/leitorDeExtratos.html`
- [ ] Criar `js/extractors/_base.js` com funções migradas do arquivo de dev
- [ ] Criar `js/extractors/_registry.js` com estrutura vazia
- [ ] Criar `js/extractors/generic.js` com parsers genéricos migrados do ai-engine.js
- [ ] Atualizar `dist/build.js` com novos arquivos na ordem certa

### Fase 1 — Nubank + Infraestrutura (primeira entrega visível)
- [ ] Criar `js/extractors/nubank.js` migrando `parseFatura()` com output padronizado
- [ ] Implementar `detectBank()` em `_registry.js`
- [ ] Implementar `validateStatement()` em `_registry.js`
- [ ] Atualizar `ai-engine.js` para usar registry
- [ ] Atualizar modal: dropdown de banco + abas PDF/Texto
- [ ] Preview em tempo real na aba Texto
- [ ] Build e testes manuais

### Fase 2 — Inter + Itaú
- [ ] `js/extractors/inter.js`
- [ ] `js/extractors/itau.js`
- [ ] Testes com PDFs reais

### Fase 3 — Bradesco + Caixa + Banco do Brasil + Santander
- [ ] `js/extractors/bradesco.js`
- [ ] `js/extractors/caixa.js`
- [ ] `js/extractors/bb.js`
- [ ] `js/extractors/santander.js`

### Fase 4 — Fintechs
- [ ] `js/extractors/c6.js`
- [ ] `js/extractors/mercadopago.js`
- [ ] `js/extractors/picpay.js`

### Fase 5 — Cooperativas
- [ ] `js/extractors/sicredi.js`
- [ ] `js/extractors/sicoob.js`

### Fase 6 — Finalização
- [ ] Deletar `tools/leitorDeExtratos.html` (funcionalidade 100% migrada)
- [ ] Testes em todos os bancos com PDFs reais
- [ ] Documentar formatos de PDF conhecidos que funcionam

---

## Decisões Registradas

| Data | Decisão |
|------|---------|
| 2026-05-11 | Dois modos no modal: PDF (banco-específico) e Texto (genérico sempre) |
| 2026-05-11 | Seleção de banco via dropdown (não chips — 12+ bancos não cabem em chips) |
| 2026-05-11 | Aba Texto usa Opção C: preview em tempo real enquanto o usuário digita/cola |
| 2026-05-11 | Auto-detecção de banco pelo fingerprint do PDF — não depende só do usuário |
| 2026-05-11 | Se banco detectado ≠ banco selecionado → pergunta ao usuário qual usar |
| 2026-05-11 | Se PDF não reconhecido → pergunta ao usuário, não falha silenciosamente |
| 2026-05-11 | Tipo de extrato (fatura/conta/pix) detectado automaticamente por parser |
| 2026-05-11 | Prioridade: Nubank → Inter → Itaú → Bradesco → Caixa → BB → Santander → fintechs |
| 2026-05-11 | `tools/leitorDeExtratos.html` mantido até Fase 6 completa, depois deletar |
| 2026-05-11 | Output padronizado com `_confidence` e `_bankSource` em todos os parsers |
