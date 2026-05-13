// ══════════════════════════════════════════════════
// EXTRACTORS/INTER.JS — Parser Banco Inter
// Extrato conta: "DD/MM/YYYY desc valor" (com + / -)
// ══════════════════════════════════════════════════

function _interParseExtrato(lines) {
  const entries = [];
  let currentDate = null;

  const pixInRe  = /^(?:Pix\s+recebido|Pix\s+crédito|Transferência\s+(?:PIX\s+)?[Rr]ecebida|TED\s+[Rr]ecebida?|Recebimento\s+Pix)/i;
  const pixOutRe = /^(?:Pix\s+enviado|Pix\s+débito|Transferência\s+(?:PIX\s+)?[Ee]nviada|TED\s+[Ee]nviada?)/i;
  const boletoRe = /^(?:Pagamento\s+de\s+(?:boleto|conta|concession)|Pgto\.?\s+[Bb]oleto|Débito\s+automático)/i;
  const skipRe   = /^(?:Saldo|Total\s+de|Rendimento|Extrato|Período|Comprovante|Movimentações)/i;

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    // "DD/MM/YYYY" prefixo inline (formato Inter)
    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) {
      currentDate = `${dmDMY[3]}-${dmDMY[2]}-${dmDMY[1]}`;
      raw = raw.slice(dmDMY[0].length).trim();
    }

    if (!raw || skipRe.test(raw)) continue;

    // Valor no final da linha: pode ter sinal + ou - antes ou depois
    // Formatos Inter: "desc +1.234,56" ou "desc -234,56" ou "desc 234,56"
    const mSigned = raw.match(/^(.+?)\s+([+-])\s*([\d\.]+,\d{2})\s*$/)
                 || raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*([+-])?\s*$/);

    if (!mSigned) continue;

    let desc, amtStr, sign;
    if (mSigned[2] === '+' || mSigned[2] === '-') {
      desc = mSigned[1].trim(); sign = mSigned[2]; amtStr = mSigned[3];
    } else {
      desc = mSigned[1].trim(); amtStr = mSigned[2]; sign = mSigned[3] || '';
    }

    const valor = extParseValor(amtStr);
    if (!valor || valor > 500000) continue;

    // Entradas (crédito)
    if (sign === '+' || pixInRe.test(desc)) {
      const nome = pixInRe.test(desc) ? extExtractName(desc.replace(pixInRe, '').trim()) : null;
      entries.push(extMakeEntry({ desc: nome || desc, amount: valor, date: currentDate, entryType: 'pixin', isMine: false, person: nome || null, confidence: 85, bankSource: 'inter' }));
      continue;
    }

    if (boletoRe.test(desc)) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'boleto', confidence: 85, bankSource: 'inter' }));
      continue;
    }

    if (pixOutRe.test(desc)) {
      const nome = extExtractName(desc.replace(pixOutRe, '').trim());
      entries.push(extMakeEntry({ desc: `Pix para ${nome || '—'}`, amount: valor, date: currentDate, entryType: 'pixout', person: nome || null, confidence: 85, bankSource: 'inter' }));
      continue;
    }

    // Débito genérico
    if (currentDate) {
      entries.push(extMakeEntry({ desc, amount: valor, date: currentDate, entryType: 'debito', confidence: 70, bankSource: 'inter' }));
    }
  }

  return entries;
}

// ── Dispatcher Inter ──
function leitorInter(lines, docKind) {
  // Inter não emite fatura de cartão como PDF próprio; tudo é extrato de conta
  return _interParseExtrato(lines);
}

BANK_PARSERS.inter = leitorInter;
