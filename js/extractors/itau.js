// ══════════════════════════════════════════════════
// EXTRACTORS/ITAU.JS — Parser Itaú Unibanco
// Fatura cartão: DD/MM desc valor (sem R$)
// Extrato conta: DD/MM/YYYY desc valor (com saldo intercalado)
// ══════════════════════════════════════════════════

function _itauParseFatura(lines) {
  const entries = [];

  // Extrair ano do cabeçalho
  let yearHint = null;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const ym = lines[i].match(/\b(20\d{2})\b/);
    if (ym) { yearHint = ym[1]; break; }
  }
  if (!yearHint) yearHint = String(new Date().getFullYear());

  // Itaú usa "DD/MM desc valor" sem R$ (valor no final, sem símbolo)
  // Ou "DD/MM/YYYY desc valor"
  const reFull = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(.+?)\s+([\d\.]+,\d{2})\s*(?:D|C)?\s*$/;
  // Itaú às vezes coloca D (débito) ou C (crédito) ao final da linha

  for (const line of lines) {
    if (line === '§§PAGE§§') continue;
    const m = line.match(reFull);
    if (!m) continue;

    const day = m[1], mon = m[2], year = m[3] || yearHint;
    const desc = m[4].trim();
    const valor = extParseValor(m[5]);
    const isCredit = /\s+C\s*$/.test(line); // C = crédito = ignorar em fatura

    if (!valor || valor > 100000) continue;
    if (extIsFaturaCredit(desc) || extIsFaturaFee(desc)) continue;
    if (isCredit) continue;
    if (/^(Saldo|Total|Subtotal|Limite|Pagamento|Crédito|IOF)/i.test(desc)) continue;

    const { parcela, clean } = extExtractParcela(desc);
    const pm = parcela ? parcela.match(/(\d+)\/(\d+)/) : null;

    entries.push(extMakeEntry({
      desc: clean, amount: valor,
      date: extFmtDate(`${day}/${mon}/${year}`),
      entryType: 'cartao',
      installment: !!(pm && parseInt(pm[2]) > 1),
      installCurrent: pm ? parseInt(pm[1]) : null,
      installTotal: pm ? parseInt(pm[2]) : null,
      confidence: 78, bankSource: 'itau',
    }));
  }

  return entries;
}

function _itauParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  const pixInRe  = /^(?:Pix\s+recebido|Transf\s+Pix\s+Recebida|TED\s+[Rr]ecebida?|Créd\s+em\s+c\/c)/i;
  const pixOutRe = /^(?:Pix\s+enviado|Transf\s+Pix\s+Enviada|TED\s+[Ee]nviada?|Transf\s+entre\s+c\/c)/i;
  const boletoRe = /^(?:Pgto\s+Boleto|Pagamento\s+Boleto|Pgto\s+Conta|Pgto\s+Serviço|Débito\s+Automático)/i;
  const skipRe   = /^(?:Saldo|Limite|Extrato|Período|Total\s+de|Rendimento|IOF)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    // "DD/MM/YYYY" prefixo inline
    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) {
      currentDate = `${dmDMY[3]}-${dmDMY[2]}-${dmDMY[1]}`;
      raw = raw.slice(dmDMY[0].length).trim();
    }
    // "DD/MM" sem ano (Itaú extrato simplificado)
    const dmDM = !dmDMY && raw.match(/^(\d{2})\/(\d{2})\s+/);
    if (dmDM) {
      const year = new Date().getFullYear();
      currentDate = `${year}-${dmDM[2]}-${dmDM[1]}`;
      raw = raw.slice(dmDM[0].length).trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    // Valor com indicador D/C ao final: "Desc 1.234,56 D" ou "Desc 1.234,56 C"
    const mDC = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*([DC])\s*$/);
    const mVal = !mDC && raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*$/);
    const m = mDC || mVal;
    if (!m) continue;

    const desc = m[1].trim();
    const valor = extParseValor(m[2]);
    const isCredit = mDC && mDC[3] === 'C';
    if (!valor || valor > 500000) continue;

    if (isCredit || pixInRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixInRe, '').trim());
      entries.push(extMakeEntry({ desc: nome || desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 80, bankSource: 'itau' }));
    } else if (boletoRe.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 80, bankSource: 'itau' }));
    } else if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 80, bankSource: 'itau' }));
    } else if (currentDate) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 68, bankSource: 'itau' }));
    }
  }

  return entries;
}

function leitorItau(lines, docKind) {
  if (docKind.isFatura) return _itauParseFatura(lines);
  if (docKind.isExtrato) return _itauParseExtrato(lines);
  const fatura = _itauParseFatura(lines);
  const extrato = _itauParseExtrato(lines);
  return fatura.length >= extrato.length ? fatura : extrato;
}

BANK_PARSERS.itau = leitorItau;
