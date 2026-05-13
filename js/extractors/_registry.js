// ══════════════════════════════════════════════════
// EXTRACTORS/_REGISTRY.JS — Registro de parsers
// Cada arquivo de parser registra em BANK_PARSERS.
// ══════════════════════════════════════════════════

// Dicionário de parsers — populado pelos arquivos de banco ao carregar
// Uso: BANK_PARSERS['nubank'] = leitorNubank;
const BANK_PARSERS = {};

// Labels legíveis por chave de banco
const EXT_BANK_LABELS = {
  nubank:      'Nubank',
  inter:       'Banco Inter',
  itau:        'Itaú',
  bradesco:    'Bradesco',
  caixa:       'Caixa Econômica',
  bb:          'Banco do Brasil',
  santander:   'Santander',
  c6:          'C6 Bank',
  mercadopago: 'Mercado Pago',
  picpay:      'PicPay',
  sicredi:     'Sicredi',
  sicoob:      'Sicoob',
  generic:     'Outro banco',
};

// Fingerprints de detecção por banco
// Ordem importa — primeiro match ganha
const EXT_FINGERPRINTS = [
  { key: 'nubank',      patterns: ['Nu Pagamentos S.A.', 'nubank.com.br', 'NuConta', 'NU PAGAMENTOS', 'Nubank'] },
  { key: 'inter',       patterns: ['Banco Inter S.A.', 'BCO INTER S/A', 'bancointer.com.br', 'Banco Inter'] },
  { key: 'itau',        patterns: ['Itaú Unibanco S.A.', 'ITAÚ UNIBANCO', 'itau.com.br', 'Itaú Unibanco'] },
  { key: 'bradesco',    patterns: ['Banco Bradesco S.A.', 'bradesco.com.br', 'BRADESCO'] },
  { key: 'caixa',       patterns: ['CAIXA ECONÔMICA FEDERAL', 'caixa.gov.br', 'CEF'] },
  { key: 'bb',          patterns: ['Banco do Brasil S.A.', 'bb.com.br', 'BANCO DO BRASIL'] },
  { key: 'santander',   patterns: ['Banco Santander', 'santander.com.br', 'Santander'] },
  { key: 'c6',          patterns: ['Banco C6 S.A.', 'c6bank.com.br', 'C6 BANK'] },
  { key: 'mercadopago', patterns: ['Mercado Pago', 'mercadopago.com.br', 'MERCADO PAGO'] },
  { key: 'picpay',      patterns: ['PicPay Serviços S.A.', 'picpay.com', 'PicPay'] },
  { key: 'sicredi',     patterns: ['Sistema de Crédito Cooperativo', 'sicredi.com.br', 'SICREDI'] },
  { key: 'sicoob',      patterns: ['SICOOB', 'sicoob.com.br', 'Sistema de Cooperativas'] },
];

// Detecta banco a partir do texto do PDF
// Retorna chave do banco (ex: 'nubank') ou 'unknown'
function extDetectBank(lines) {
  const text = lines.slice(0, 60).join('\n'); // primeiras linhas são suficientes
  for (const { key, patterns } of EXT_FINGERPRINTS) {
    for (const p of patterns) {
      if (text.includes(p)) return key;
    }
  }
  return 'unknown';
}

// Valida que o PDF é um extrato bancário real (não boleto avulso, NF, contrato)
// Lança Error com mensagem amigável se inválido
function extValidateStatement(lines) {
  const text = lines.join('\n');

  // Rejeitar documentos obviamente não-extratos
  if (/LINHA\s+DIGIT[ÁA]VEL|C[ÓO]DIGO\s+DE\s+BARRAS/i.test(text) &&
      !/extrato|fatura|movimenta/i.test(text)) {
    throw new Error('Parece ser um boleto avulso. Envie o PDF do extrato bancário ou da fatura do cartão.');
  }
  if (/DANFE|NF-e|NOTA\s+FISCAL\s+ELETR/i.test(text)) {
    throw new Error('Parece ser uma nota fiscal. Envie o PDF do extrato bancário ou da fatura do cartão.');
  }
  if (/CL[ÁA]USULA\s+\d|PARTE\s+CONTRATANTE|CONTRATADA\s*:/i.test(text)) {
    throw new Error('Parece ser um contrato. Envie o PDF do extrato bancário ou da fatura do cartão.');
  }

  // Verificações mínimas de conteúdo
  const monetaryValues = (text.match(/R\$\s*[\d\.]+,\d{2}|[\d\.]+,\d{2}/g) || []).length;
  const dates = (text.match(/\d{2}\/\d{2}(?:\/\d{2,4})?|\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/gi) || []).length;
  const charCount = text.replace(/\s/g, '').length;

  if (charCount < 200) {
    throw new Error('PDF parece estar em branco ou ser uma imagem escaneada sem texto extraível.');
  }
  if (monetaryValues < 2 || dates < 1) {
    throw new Error('Não foram encontrados valores e datas suficientes. Verifique se o arquivo é um extrato bancário.');
  }
}
