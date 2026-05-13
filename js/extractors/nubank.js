// ══════════════════════════════════════════════════
// EXTRACTORS/NUBANK.JS — Parser Nubank
// Fatura cartão: "DD MON desc R$ valor"
// Extrato NuConta: "DD/MM/YYYY desc valor"
// ══════════════════════════════════════════════════

// ── Fatura de cartão Nubank ──
function _nubankParseFatura(lines) {
  const entries = [];

  // Extrair ano do cabeçalho
  let yearHint = null;
  const yearHeaderRe = /(?:Emiss[aã]o|envio|Transac|Vencimento|Fatura)\b.+?\b(20\d{2})\b/i;
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const ym = lines[i].match(yearHeaderRe) || lines[i].match(/\b(20\d{2})\b/);
    if (ym) { yearHint = ym[1]; break; }
  }
  if (!yearHint) yearHint = String(new Date().getFullYear());

  let inTransacoes = false;
  let skipSection = false;
  const txRe  = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:[•\.]+\s*\d+\s+|[\u2022\.\s]*\d{4}\s+)?(.+?)\s+R?\$?\s*([\d\.]+,\d{2})$/i;
  const txRe2 = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.+?)\s+R?\$?\s*([\d\.]+,\d{2})$/i;
  const txNoVal = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:[•\.]+\s*\d+\s+|[\u2022\.\s]*\d{4}\s+)?(.+)$/i;

  let pending = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^TRANSAÇÕES/i.test(line) || /^TRANSAC/i.test(line)) {
      inTransacoes = true; skipSection = false; continue;
    }
    if (!inTransacoes) continue;

    if (/^Pagamentos?\s+e\s+Financiamentos?/i.test(line) ||
        /^Tarifas?\s+e\s+[Ee]ncargos?/i.test(line)       ||
        /^Encargos?\s+e\s+Tarifas?/i.test(line)           ||
        /^Outros\s+Cobranças?/i.test(line)) {
      skipSection = true; pending = null; continue;
    }
    if (/^(Compras?(\s+e\s+[Pp]arcelas?)?|Parcelamentos?)\s*$/i.test(line)) {
      skipSection = false; continue;
    }
    if (skipSection) { pending = null; continue; }

    if (/^[A-Z][a-záâãéêíóôõúç]+(\s+[A-Z][a-záâãéêíóôõúç]*)*\s*$/.test(line) &&
        !/\d{2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i.test(line)) {
      continue;
    }

    // Continuação de linha pendente
    if (pending) {
      const contVal = line.match(/^R?\$?\s*([\d\.]+,\d{2})\s*$/);
      const contParcela = line.match(/[Pp]arcela\s+(\d+)\s+de\s+(\d+)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/i)
                       || line.match(/[Pp]arcela\s+(\d+)\/(\d+)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/i);
      if (contParcela) {
        const valor = extParseValor(contParcela[3]);
        if (valor) {
          const mon = EXT_MONTH_ABBR[pending.monAbbr];
          const date = extFmtDate(`${pending.day}/${mon}/${yearHint}`);
          entries.push(extMakeEntry({
            desc: pending.desc, amount: valor, date,
            entryType: 'cartao', installment: true,
            installCurrent: parseInt(contParcela[1]),
            installTotal: parseInt(contParcela[2]),
            confidence: 90, bankSource: 'nubank',
          }));
        }
        pending = null; continue;
      }
      if (contVal) {
        const valor = extParseValor(contVal[1]);
        if (valor) {
          const { parcela, clean } = extExtractParcela(pending.desc);
          const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;
          const mon = EXT_MONTH_ABBR[pending.monAbbr];
          const date = extFmtDate(`${pending.day}/${mon}/${yearHint}`);
          entries.push(extMakeEntry({
            desc: clean, amount: valor, date,
            entryType: 'cartao',
            installment: !!(pm && parseInt(pm[2]) > 1),
            installCurrent: pm ? parseInt(pm[1]) : null,
            installTotal: pm ? parseInt(pm[2]) : null,
            confidence: 90, bankSource: 'nubank',
          }));
        }
        pending = null; continue;
      }
      pending = null;
    }

    // Linha com data + desc + valor
    const m = line.match(txRe) || line.match(txRe2);
    if (m) {
      const day = m[1], monAbbr = m[2].toUpperCase();
      let desc = m[3].trim().replace(/^(?:[•\u2022\.\s]+\d{4}\s+)/, '').replace(/^\d{4}\s+/, '').trim();
      const valor = extParseValor(m[4]);
      if (!valor) continue;
      if (extIsFaturaCredit(desc) || extIsFaturaFee(desc)) continue;
      if (/Saldo\s+restante/i.test(desc) || /^Pagamento\s+em/i.test(desc)) continue;

      const { parcela, clean } = extExtractParcela(desc);
      const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;
      const mon = EXT_MONTH_ABBR[monAbbr];
      const date = extFmtDate(`${day}/${mon}/${yearHint}`);
      entries.push(extMakeEntry({
        desc: clean, amount: valor, date,
        entryType: 'cartao',
        installment: !!(pm && parseInt(pm[2]) > 1),
        installCurrent: pm ? parseInt(pm[1]) : null,
        installTotal: pm ? parseInt(pm[2]) : null,
        confidence: 92, bankSource: 'nubank',
      }));
      continue;
    }

    // Linha com data + desc sem valor (multi-line)
    const mn = line.match(txNoVal);
    if (mn) {
      const day = mn[1], monAbbr = mn[2].toUpperCase();
      let desc = mn[3].trim().replace(/^(?:[•\u2022\.\s]+\d{4}\s+)/, '').replace(/^\d{4}\s+/, '').replace(/\s+R?\$\s*$/, '').trim();
      if (!desc || extIsFaturaCredit(desc) || extIsFaturaFee(desc)) continue;
      if (/Saldo\s+restante/i.test(desc) || /^Pagamento\s+em/i.test(desc)) continue;
      pending = { day, monAbbr, desc };
    }
  }

  return entries;
}

// ── Extrato NuConta (DD/MM/YYYY ou "DD MON YYYY" + desc + valor) ──
function _nubankParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  const pixInRe  = /^(?:Pix\s+recebido|Pix\s+crédito|Recebimento\s+Pix|Transferência\s+recebida)/i;
  const pixOutRe = /^(?:Pix\s+enviado|Pix\s+débito|Transferência\s+enviada)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    // "DD MON YYYY"
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

    if (!raw || !currentDate) continue;
    if (/^(Saldo|Rendimento|Extrato|Total\s+de)/i.test(raw)) continue;

    const mVal = raw.match(/(.+?)\s+([\d\.]+,\d{2})\s*$/);
    const valor = mVal ? extParseValor(mVal[2]) : 0;
    const desc = mVal ? mVal[1].trim() : raw.trim();
    if (!valor) continue;

    if (pixInRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixInRe, '').trim());
      entries.push(extMakeEntry({ desc: nome || 'Pix recebido', amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 88, bankSource: 'nubank' }));
    } else if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 88, bankSource: 'nubank' }));
    } else if (/boleto|pgto\s+conta|pagamento\s+de/i.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 80, bankSource: 'nubank' }));
    } else {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 75, bankSource: 'nubank' }));
    }
  }

  return entries;
}

// ── Dispatcher Nubank ──
function leitorNubank(lines, docKind) {
  if (docKind.isFatura) return _nubankParseFatura(lines);
  if (docKind.isExtrato) return _nubankParseExtrato(lines);
  // Tentar ambos se tipo não detectado
  const fatura = _nubankParseFatura(lines);
  const extrato = _nubankParseExtrato(lines);
  return fatura.length >= extrato.length ? fatura : extrato;
}

BANK_PARSERS.nubank = leitorNubank;
