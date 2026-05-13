// ══════════════════════════════════════════════════
// EXTRACTORS/BB.JS — Parser Banco do Brasil
// Extrato: DD/MM/YYYY desc valor (+ saldo após)
// Fatura Ourocard: DD/MM/YYYY desc valor
// ══════════════════════════════════════════════════

function _bbParseFatura(lines) {
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
    if (/^(Saldo|Total|Limite|Pagamento|Encargo|IOF|PGTO)/i.test(desc)) continue;

    const { parcela, clean } = extExtractParcela(desc);
    const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;

    entries.push(extMakeEntry({
      desc: clean, amount: valor,
      date: extFmtDate(`${day}/${mon}/${year}`),
      entryType: 'cartao',
      installment: !!(pm && parseInt(pm[2]) > 1),
      installCurrent: pm ? parseInt(pm[1]) : null,
      installTotal: pm ? parseInt(pm[2]) : null,
      confidence: 75, bankSource: 'bb',
    }));
  }

  return entries;
}

function _bbParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  const pixInRe  = /^(?:PIX\s+recebido|Créd(?:ito)?\s+em\s+conta|Recebimento\s+PIX|TED\s+[Rr]ecebida?|DOC\s+[Rr]ecebido?)/i;
  const pixOutRe = /^(?:PIX\s+enviado|Transf\s+PIX|TED\s+[Ee]nviada?|DOC\s+[Ee]nviado?|Transferência\s+[Ee]nviada)/i;
  const boletoRe = /^(?:Pgto\s+Boleto|Pagamento\s+Boleto|Débito\s+Automático|Pgto\s+Conta|Pagamento\s+de\s+Conta)/i;
  const skipRe   = /^(?:Saldo|Limite|Extrato|Período|Total\s+de|Rendimento|BB\s+Rende\s+Fácil)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) {
      currentDate = `${dmDMY[3]}-${dmDMY[2]}-${dmDMY[1]}`;
      raw = raw.slice(dmDMY[0].length).trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    // BB extrato: "desc valor" — saldo na linha seguinte (ignorar)
    const m = raw.match(/^(.+?)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/);
    if (!m) continue;

    const desc = m[1].trim();
    const valor = extParseValor(m[2]);
    if (!valor || valor > 500000) continue;
    // Pular linhas de saldo que podem ter valor próximo
    if (/^Saldo/i.test(desc)) continue;

    if (pixInRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixInRe, '').trim());
      entries.push(extMakeEntry({ desc: nome || desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 80, bankSource: 'bb' }));
    } else if (boletoRe.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 80, bankSource: 'bb' }));
    } else if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 80, bankSource: 'bb' }));
    } else if (currentDate) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 65, bankSource: 'bb' }));
    }
  }

  return entries;
}

function leitorBB(lines, docKind) {
  if (docKind.isFatura) return _bbParseFatura(lines);
  if (docKind.isExtrato) return _bbParseExtrato(lines);
  const fatura = _bbParseFatura(lines);
  const extrato = _bbParseExtrato(lines);
  return fatura.length >= extrato.length ? fatura : extrato;
}

BANK_PARSERS.bb = leitorBB;
