// ══════════════════════════════════════════════════
// EXTRACTORS/BRADESCO.JS — Parser Bradesco
// Extrato: DD/MM/YYYY desc valor D/C
// Fatura: DD/MM/YYYY desc valor
// ══════════════════════════════════════════════════

function _bradescoParseFatura(lines) {
  const entries = [];

  let yearHint = null;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const ym = lines[i].match(/\b(20\d{2})\b/);
    if (ym) { yearHint = ym[1]; break; }
  }
  if (!yearHint) yearHint = String(new Date().getFullYear());

  const reFull = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(.+?)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/;

  for (const line of lines) {
    if (line === '§§PAGE§§') continue;
    const m = line.match(reFull);
    if (!m) continue;

    const day = m[1], mon = m[2], year = m[3] || yearHint;
    const desc = m[4].trim();
    const valor = extParseValor(m[5]);

    if (!valor || valor > 100000) continue;
    if (extIsFaturaCredit(desc) || extIsFaturaFee(desc)) continue;
    if (/^(Saldo|Total|Subtotal|Limite|Pagamento|Encargo|IOF)/i.test(desc)) continue;

    const { parcela, clean } = extExtractParcela(desc);
    const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;

    entries.push(extMakeEntry({
      desc: clean, amount: valor,
      date: extFmtDate(`${day}/${mon}/${year}`),
      entryType: 'cartao',
      installment: !!(pm && parseInt(pm[2]) > 1),
      installCurrent: pm ? parseInt(pm[1]) : null,
      installTotal: pm ? parseInt(pm[2]) : null,
      confidence: 75, bankSource: 'bradesco',
    }));
  }

  return entries;
}

function _bradeacoParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  // Bradesco usa "DD/MM" ou "DD/MM/YYYY" + desc + valor + D/C
  const pixInRe  = /^(?:Pix\s+Recebido|Créd(?:ito)?\s+em\s+Conta|Recebimento\s+Pix|TED\s+[Rr]ecebida?)/i;
  const pixOutRe = /^(?:Pix\s+Enviado|Transf\s+Pix|TED\s+[Ee]nviada?|Transf\s+[Ee]nviada)/i;
  const boletoRe = /^(?:Pagamento\s+Boleto|Pgto\s+Boleto|Débito\s+Automático|Pagamento\s+Conta)/i;
  const skipRe   = /^(?:Saldo|Limite|Extrato|Período|Rendimento|Total\s+de|SALDO)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) {
      currentDate = `${dmDMY[3]}-${dmDMY[2]}-${dmDMY[1]}`;
      raw = raw.slice(dmDMY[0].length).trim();
    }
    // Bradesco às vezes usa só DD/MM
    const dmDM = !dmDMY && raw.match(/^(\d{2})\/(\d{2})\s+/);
    if (dmDM) {
      const year = currentDate ? currentDate.slice(0, 4) : String(new Date().getFullYear());
      currentDate = `${year}-${dmDM[2]}-${dmDM[1]}`;
      raw = raw.slice(dmDM[0].length).trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    // "desc valor D" ou "desc valor C" ou "desc valor"
    const mDC = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*([DC])\s*$/);
    const mVal = !mDC && raw.match(/^(.+?)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/);
    const m = mDC || mVal;
    if (!m) continue;

    const desc = m[1].trim();
    const valor = extParseValor(m[2]);
    const isCredit = mDC && mDC[3] === 'C';
    if (!valor || valor > 500000) continue;

    if (isCredit || pixInRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixInRe, '').trim());
      entries.push(extMakeEntry({ desc: nome || desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 78, bankSource: 'bradesco' }));
    } else if (boletoRe.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 78, bankSource: 'bradesco' }));
    } else if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 78, bankSource: 'bradesco' }));
    } else if (currentDate) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 65, bankSource: 'bradesco' }));
    }
  }

  return entries;
}

function leitorBradesco(lines, docKind) {
  if (docKind.isFatura) return _bradescoParseFatura(lines);
  if (docKind.isExtrato) return _bradeacoParseExtrato(lines);
  const fatura = _bradescoParseFatura(lines);
  const extrato = _bradeacoParseExtrato(lines);
  return fatura.length >= extrato.length ? fatura : extrato;
}

BANK_PARSERS.bradesco = leitorBradesco;
