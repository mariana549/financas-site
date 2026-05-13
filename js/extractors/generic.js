// ══════════════════════════════════════════════════
// EXTRACTORS/GENERIC.JS — Parser genérico (fallback)
// Cobre bancos sem parser específico.
// ══════════════════════════════════════════════════

// Fatura genérica: "DD/MM/YYYY desc valor" ou "DD/MM desc valor"
function _genericParseFatura(lines) {
  const entries = [];
  const reFull = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(.+?)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/;

  let yearHint = null;
  for (const l of lines) {
    const ym = l.match(/\b(20\d{2})\b/);
    if (ym) { yearHint = ym[1]; break; }
  }

  for (const line of lines) {
    if (line === '§§PAGE§§') continue;
    const m = line.match(reFull);
    if (!m) continue;
    const day = m[1], mon = m[2], year = m[3] || yearHint || String(new Date().getFullYear());
    let desc = m[4].trim().replace(/\s+R?\$\s*$/, '');
    const valor = extParseValor(m[5]);
    if (!valor || valor > 100000 || extIsFaturaCredit(desc) || extIsFaturaFee(desc)) continue;
    if (/^(Saldo|Total|Subtotal|Limite)/i.test(desc)) continue;

    const { parcela, clean } = extExtractParcela(desc);
    const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;
    entries.push(extMakeEntry({
      desc: clean, amount: valor,
      date: extFmtDate(`${day}/${mon}/${year}`),
      entryType: 'cartao',
      installment: !!(pm && parseInt(pm[2]) > 1),
      installCurrent: pm ? parseInt(pm[1]) : null,
      installTotal: pm ? parseInt(pm[2]) : null,
      confidence: 65, bankSource: 'generic',
    }));
  }

  return entries;
}

// Extrato genérico — cobre a maioria dos bancos com formato "DD/MM/YYYY desc valor"
function _genericParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  const pixInRe  = /^(?:(?:Pix|PIX)\s+(?:recebido|crédito|creditado|em\s+conta)|Recebimento\s+(?:Pix|PIX)|Transferência\s+(?:PIX\s+)?[Rr]ecebida|TED\s+[Rr]ecebida?|DOC\s+[Rr]ecebido?)/i;
  const pixOutRe = /^(?:(?:Pix|PIX)\s+(?:enviado|débito)|Transferência\s+(?:PIX\s+)?[Ee]nviada|TED\s+[Ee]nviada?|DOC\s+[Ee]nviado?)/i;
  const boletoRe = /^(?:Pagamento\s+de\s+(?:boleto|conta|concession)|Pgto\.?\s+[Bb]oleto|Débito\s+automático|Debito\s+automatico)/i;
  const skipRe   = /^(?:Total\s+de\s+(?:entradas|saídas)|Saldo\s+(?:inicial|anterior|final|líquido|em\s+conta)|Movimentações|Rendimento|Extrato|Comprovante|Período)/i;

  const lookVal = (fromIdx) => {
    for (let j = fromIdx + 1; j < Math.min(lines.length, fromIdx + 6); j++) {
      if (lines[j] === '§§PAGE§§') continue;
      const mv = lines[j].match(/^([\d\.]+,\d{2})\s*$/);
      if (mv) return extParseValor(mv[1]);
      if (/^(Transferência|Pagamento|Pix|PIX|TED|DOC|Total\s+de|\d{2}[\s\/])/i.test(lines[j])) break;
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    // "DD MON YYYY" (alguns bancos)
    const dmMon = raw.match(/^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\b/i);
    if (dmMon) {
      currentDate = extFmtDate(`${dmMon[1]}/${EXT_MONTH_ABBR[dmMon[2].toUpperCase()]}/${dmMon[3]}`);
      continue;
    }

    // "DD/MM/YYYY" prefixo inline
    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) {
      currentDate = `${dmDMY[3]}-${dmDMY[2]}-${dmDMY[1]}`;
      raw = raw.slice(dmDMY[0].length).trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    let m;

    // PIX / TED recebido
    if (pixInRe.test(raw)) {
      m = raw.match(/(.+?)\s+([\d\.]+,\d{2})\s*$/);
      const v = m ? extParseValor(m[2]) : lookVal(i);
      if (v) {
        const nome = extExtractName(raw.replace(pixInRe, '').trim());
        entries.push(extMakeEntry({ desc: nome || 'Transferência recebida', amount: v, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 75, bankSource: 'generic' }));
      }
      continue;
    }

    // PIX / TED enviado
    if (pixOutRe.test(raw)) {
      m = raw.match(/(.+?)\s+([\d\.]+,\d{2})\s*$/);
      const v = m ? extParseValor(m[2]) : lookVal(i);
      if (v) {
        const nome = extExtractName(raw.replace(pixOutRe, '').trim());
        entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: v, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 75, bankSource: 'generic' }));
      }
      continue;
    }

    // Boleto / Pagamento de conta
    if (boletoRe.test(raw)) {
      m = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*$/);
      if (m) {
        entries.push(extMakeEntry({ desc: m[1].trim(), amount: extParseValor(m[2]), date: currentDate, entryType: 'boleto', confidence: 72, bankSource: 'generic' }));
      } else {
        const v = lookVal(i);
        if (v) entries.push(extMakeEntry({ desc: raw.replace(boletoRe, '').trim() || 'Boleto', amount: v, date: currentDate, entryType: 'boleto', confidence: 65, bankSource: 'generic' }));
      }
      continue;
    }

    // Fallback genérico com data
    if (currentDate && dmDMY) {
      m = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*$/);
      if (m) {
        const desc = m[1].trim();
        const valor = extParseValor(m[2]);
        if (valor > 0 && valor < 1000000 && desc.length > 2 && !/^(Saldo|Total|Extrato|Limite|Rendimento)/i.test(desc)) {
          const entryType = /[Rr]eceb|[Cc]rédito\s+em|entrada/i.test(desc) ? 'pixin'
            : /boleto|concession|pgto\b/i.test(desc) ? 'boleto'
            : 'debito';
          const isMine = entryType !== 'pixin';
          entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType, isMine, confidence: 55, bankSource: 'generic' }));
        }
      }
    }
  }

  return entries;
}

// ── Dispatcher genérico ──
function leitorGenerico(lines, docKind) {
  const fatura = docKind.isFatura || (!docKind.isFatura && !docKind.isExtrato);
  const extrato = docKind.isExtrato || (!docKind.isFatura && !docKind.isExtrato);

  const results = [];
  if (fatura) results.push(..._genericParseFatura(lines));
  if (extrato) results.push(..._genericParseExtrato(lines));
  return results;
}

BANK_PARSERS.generic = leitorGenerico;
