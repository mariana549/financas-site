// ══════════════════════════════════════════════════
// EXTRACTORS/SANTANDER.JS — Parser Santander
// Extrato: DD/MM/YYYY desc valor (débito/crédito)
// Fatura: DD/MM/YYYY desc valor
// ══════════════════════════════════════════════════

function _santanderParseFatura(lines) {
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
    if (/^(Saldo|Total|Limite|Pagamento|Encargo|IOF|Juros)/i.test(desc)) continue;

    const { parcela, clean } = extExtractParcela(desc);
    const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;

    entries.push(extMakeEntry({
      desc: clean, amount: valor,
      date: extFmtDate(`${day}/${mon}/${year}`),
      entryType: 'cartao',
      installment: !!(pm && parseInt(pm[2]) > 1),
      installCurrent: pm ? parseInt(pm[1]) : null,
      installTotal: pm ? parseInt(pm[2]) : null,
      confidence: 75, bankSource: 'santander',
    }));
  }

  return entries;
}

function _santanderParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  // Santander pode usar "DÉBITO" / "CRÉDITO" como prefixo de tipo
  const pixInRe  = /^(?:Pix\s+Recebido|Créd\s+Pix|Recebimento\s+Pix|TED\s+[Rr]ecebida?|Crédito\s+em\s+Conta)/i;
  const pixOutRe = /^(?:Pix\s+Enviado|Transf\s+Pix|TED\s+[Ee]nviada?|Débito\s+para\s+Conta|Transferência\s+[Ee]nviada)/i;
  const boletoRe = /^(?:Pagamento\s+Boleto|Pgto\s+Boleto|Débito\s+Automático|Pagamento\s+de\s+Conta)/i;
  const skipRe   = /^(?:Saldo|Limite|Extrato|Período|Total\s+de|Rendimento)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) {
      currentDate = `${dmDMY[3]}-${dmDMY[2]}-${dmDMY[1]}`;
      raw = raw.slice(dmDMY[0].length).trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    // Santander às vezes separa débito/crédito em colunas:
    // "desc                 1.234,56   5.678,90" — débito na col1, crédito na col2
    // Tratamos o padrão mais simples primeiro
    const mDC = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s+[\d\.]+,\d{2}\s*$/); // duas colunas
    const mSingle = !mDC && raw.match(/^(.+?)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/);

    const m = mDC || mSingle;
    if (!m) continue;

    const desc = m[1].trim();
    const valor = extParseValor(m[2]);
    if (!valor || valor > 500000) continue;

    if (pixInRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixInRe, '').trim());
      entries.push(extMakeEntry({ desc: nome || desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 78, bankSource: 'santander' }));
    } else if (boletoRe.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 78, bankSource: 'santander' }));
    } else if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 78, bankSource: 'santander' }));
    } else if (currentDate) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 65, bankSource: 'santander' }));
    }
  }

  return entries;
}

function leitorSantander(lines, docKind) {
  if (docKind.isFatura) return _santanderParseFatura(lines);
  if (docKind.isExtrato) return _santanderParseExtrato(lines);
  const fatura = _santanderParseFatura(lines);
  const extrato = _santanderParseExtrato(lines);
  return fatura.length >= extrato.length ? fatura : extrato;
}

BANK_PARSERS.santander = leitorSantander;
