// ══════════════════════════════════════════════════
// EXTRACTORS/CAIXA.JS — Parser Caixa Econômica Federal
// Extrato: data por extenso ("10 de maio de 2025") ou DD/MM/YYYY
// Inclui FGTS e benefícios sociais (categoria especial)
// ══════════════════════════════════════════════════

const _CAIXA_MONTH_EXT = {
  janeiro:'01', fevereiro:'02', março:'03', abril:'04',
  maio:'05', junho:'06', julho:'07', agosto:'08',
  setembro:'09', outubro:'10', novembro:'11', dezembro:'12',
};

function _caixaParseDate(raw) {
  // "10 de maio de 2025" ou "10/05/2025"
  const mExt = raw.match(/(\d{1,2})\s+de\s+([a-záâãéêíóôõú]+)\s+de\s+(\d{4})/i);
  if (mExt) {
    const mon = _CAIXA_MONTH_EXT[mExt[2].toLowerCase()];
    if (mon) return `${mExt[3]}-${mon}-${mExt[1].padStart(2,'0')}`;
  }
  const mDMY = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (mDMY) return `${mDMY[3]}-${mDMY[2]}-${mDMY[1]}`;
  return null;
}

function _caixaParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  const fgtsRe      = /^(?:Crédito\s+FGTS|Depósito\s+FGTS|FGTS)/i;
  const beneficioRe = /^(?:Bolsa\s+Família|Auxílio|BPC|INSS|Benefício|PIS\b|PASEP)/i;
  const pixInRe     = /^(?:Pix\s+Recebido|Créd\s+Pix|Transferência\s+[Rr]ecebida|TED\s+[Rr]ecebida?)/i;
  const pixOutRe    = /^(?:Pix\s+Enviado|Transf\s+Pix|TED\s+[Ee]nviada?|Transferência\s+[Ee]nviada)/i;
  const boletoRe    = /^(?:Pagamento\s+Boleto|Débito\s+Automático|Pagamento\s+de\s+Conta|GRU\b)/i;
  const skipRe      = /^(?:Saldo|Limite|Extrato|Período|Total|Rendimento)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    // Tentar detectar data na linha atual
    const parsedDate = _caixaParseDate(raw);
    if (parsedDate) {
      currentDate = parsedDate;
      // Remover a parte da data do início da linha
      raw = raw.replace(/^\d{1,2}\s+de\s+[a-záâãéêíóôõú]+\s+de\s+\d{4}\s*/i, '')
               .replace(/^\d{2}\/\d{2}\/\d{4}\s*/, '').trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    const m = raw.match(/^(.+?)\s+R?\$?\s*([\d\.]+,\d{2})\s*(?:[DC])?\s*$/);
    if (!m) continue;

    const desc = m[1].trim();
    const valor = extParseValor(m[2]);
    if (!valor || valor > 500000) continue;

    // FGTS — categoria especial "Benefícios"
    if (fgtsRe.test(desc)) {
      const e = extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: true, confidence: 85, bankSource: 'caixa' });
      e.category = 'Benefícios';
      entries.push(e);
      continue;
    }
    // Benefícios sociais
    if (beneficioRe.test(desc)) {
      const e = extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: true, confidence: 85, bankSource: 'caixa' });
      e.category = 'Benefícios';
      entries.push(e);
      continue;
    }

    if (pixInRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixInRe, '').trim());
      entries.push(extMakeEntry({ desc: nome || desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 80, bankSource: 'caixa' }));
    } else if (boletoRe.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 80, bankSource: 'caixa' }));
    } else if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 80, bankSource: 'caixa' }));
    } else if (currentDate) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 65, bankSource: 'caixa' }));
    }
  }

  return entries;
}

function leitorCaixa(lines, docKind) {
  return _caixaParseExtrato(lines);
}

BANK_PARSERS.caixa = leitorCaixa;
