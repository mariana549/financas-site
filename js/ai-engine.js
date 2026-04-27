// ══════════════════════════════════════════════════
// AI-ENGINE.JS — Importação de Extratos
// Suporta: upload de PDF, cole de texto, multi-tipo
// ══════════════════════════════════════════════════

// ── Estado do módulo ──
let _aiType = 'auto'; // 'auto' | 'cartao' | 'debito' | 'boleto' | 'pixin' | 'pixout'

// ── Abrir modal ──
function openAI() {
  if (!S.months.length) { alert('Crie um mês primeiro.'); return; }
  const ms = document.getElementById('aiMonthSel');
  ms.innerHTML = S.months.map(m => `<option value="${m.key}">${m.label} ${m.year}</option>`).join('');
  ms.value = S.currentMonth || S.months[0].key;
  updateAIBankSel();
  document.getElementById('aiText').value = '';
  document.getElementById('aiResult').style.display = 'none';
  document.getElementById('aiBaseActions').style.display = 'flex';
  document.getElementById('aiBtnText').textContent = '✨ Interpretar';
  document.getElementById('aiPdfSections').style.display = 'none';
  document.getElementById('aiPdfSections').innerHTML = '';
  document.getElementById('aiPdfStatus').style.display = 'none';
  S.aiParsed = [];
  setAIType('auto', document.querySelector('#aiTypeChips .ai-chip'));
  openModal('mAI');
}

function updateAIBankSel() {
  const key = document.getElementById('aiMonthSel').value;
  const m = S.months.find(x => x.key === key);
  const bs = document.getElementById('aiBankSel');
  if (m && m.banks.length) {
    bs.innerHTML = m.banks.map(b => `<option>${b.name}</option>`).join('');
  } else {
    bs.innerHTML = '<option value="">-- banco será criado --</option>';
  }
}

// ── Tipo selector ──
function setAIType(type, el) {
  _aiType = type;
  if (el) {
    document.querySelectorAll('#aiTypeChips .ai-chip').forEach(c => c.classList.remove('ai-chip--active'));
    el.classList.add('ai-chip--active');
  }
  // Atualizar placeholder do textarea
  const ta = document.getElementById('aiText');
  if (!ta) return;
  const hints = {
    auto:   'Cole qualquer texto de extrato — será detectado automaticamente',
    cartao: 'iFood R$ 32,00\nNetflix [1/12] R$ 59,90\nAmazon R$ 150,00',
    debito: '01/01/2025 - Débito automático - R$ 9,90\nTarifa bancária - R$ 5,00',
    pixin:  'R$ 50,00 - João Silva\nR$ 100,00 - Maria Antônia',
    pixout: 'R$ 30,00 - para iFood\nR$ 80,00 - para João',
    boleto: '05/01/2025 - CEMIG - R$ 150,00\n10/01/2025 - Condomínio - R$ 600,00'
  };
  ta.placeholder = hints[type] || hints.auto;
}

// ════════════════════════════════════════
// PDF.JS — Lazy loading + extração
// ════════════════════════════════════════

let _pdfJsReady = false;
let _pdfJsLoading = false;
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

function _loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (_pdfJsReady && typeof pdfjsLib !== 'undefined') { resolve(); return; }
    if (_pdfJsLoading) {
      const poll = setInterval(() => {
        if (typeof pdfjsLib !== 'undefined') { clearInterval(poll); resolve(); }
      }, 100);
      return;
    }
    _pdfJsLoading = true;
    const s = document.createElement('script');
    s.src = PDFJS_CDN + 'pdf.min.js';
    s.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN + 'pdf.worker.min.js';
      _pdfJsReady = true;
      _pdfJsLoading = false;
      resolve();
    };
    s.onerror = () => reject(new Error('Falha ao carregar PDF.js. Verifique sua conexão.'));
    document.head.appendChild(s);
  });
}

async function _extractLinesFromPdf(file) {
  const buf = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) {
      throw new Error('PDF protegido por senha. Remova a senha e tente novamente.');
    }
    throw new Error('Não foi possível abrir o PDF: ' + (e.message || e));
  }

  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    if (!content.items.length) continue;
    const sorted = [...content.items].sort((a, b) => b.transform[5] - a.transform[5]);
    const clusters = [];
    let cur = null, curY = null;
    for (const it of sorted) {
      const y = it.transform[5];
      if (curY === null || Math.abs(y - curY) > 3) {
        if (cur && cur.length) clusters.push(cur);
        cur = []; curY = y;
      }
      cur.push(it);
    }
    if (cur && cur.length) clusters.push(cur);
    for (const cluster of clusters) {
      const text = cluster.sort((a, b) => a.transform[4] - b.transform[4])
        .map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
      if (text) allLines.push(text);
    }
    allLines.push('§§PAGE§§');
  }

  if (!allLines.length || allLines.every(l => l === '§§PAGE§§')) {
    throw new Error('Não foi possível extrair texto (PDF pode ser imagem escaneada).');
  }
  return allLines;
}

// ── Detectar tipo de documento ──
function _detectDocKind(lines) {
  const text = lines.join('\n');
  const isFatura =
    /TRANSAÇÕES\s+DE/i.test(text) ||
    /COMPRAS\s+NO\s+CART[ÃA]O/i.test(text) ||
    /FATURA\s+CART[ÃA]O/i.test(text) ||
    /Lançamentos\s+do\s+cartão/i.test(text) ||
    /Lançamentos\s+na\s+fatura/i.test(text) ||
    (/fatura/i.test(text) && /vencimento/i.test(text)) ||
    (/TRANSAÇÕES/i.test(text) && /Parcela/i.test(text));
  const isExtrato =
    /Saldo\s+(inicial|anterior|em\s+conta)/i.test(text) ||
    /Total\s+de\s+(entradas|saídas)/i.test(text) ||
    /Movimentações/i.test(text) ||
    /Extrato\s+(de\s+)?[Cc]onta/i.test(text) ||
    /Extrato\s+[Bb]ancário/i.test(text) ||
    /Saldo\s+[Ff]inal/i.test(text);
  return { isFatura, isExtrato };
}

// ── Helpers compartilhados pelos parsers ──
const _MONTH_ABBR = { JAN:'01',FEV:'02',MAR:'03',ABR:'04',MAI:'05',JUN:'06',JUL:'07',AGO:'08',SET:'09',OUT:'10',NOV:'11',DEZ:'12' };
const _MONTH_NAME = { '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho','07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro' };

// Extrai e limpa parcela da descrição: "- Parcela 2/12", "Parcela 3 de 5", " (2/12)", " 2/12"
function _extractParcela(desc) {
  const m = desc.match(/[Pp]arcela\s+(\d+)\s+de\s+(\d+)/i)
         || desc.match(/[Pp]arcela\s+(\d+)\/(\d+)/)
         || desc.match(/\((\d+)\/(\d+)\)/)
         || desc.match(/\s+(\d{1,2})\/(\d{2,3})\s*$/);
  return m ? { parcela: `${m[1]}/${m[2]}`, clean: desc.replace(m[0], '').trim() } : { parcela: '', clean: desc.trim() };
}

// Linhas de crédito/estorno — não são compras
function _isFaturaCredit(desc) {
  return /^(Pagamento|Crédito|Estorno|Reembolso|Restituição|Cashback|Saldo\s+anterior|IOF\s+est)/i.test(desc);
}

// Linhas de tarifas/encargos — devem ser ignoradas
function _isFaturaFee(desc) {
  return /^(Tarifa|IOF\s+de\s+saque|Encargo|Juros|Multa\s+por|Valor\s+de\s+saque|Saque\s+de\s+cr|Disponível\s+para|Limite\s+de\s+cr|Total\s+de\s+encargo|Total\s+da\s+fatura|Total\s+em\s+aberto|Pagamentos?\s+realizados?|Fatura\s+anterior)/i.test(desc);
}

// ── Parser de fatura Nubank: "DD MON [máscara] desc R$ valor" ──
function _parseFaturaLines(lines, result) {
  // 1. Extrair ano do cabeçalho (ex: "Emissão e envio 05 JAN 2026", "Transações de 05 DEZ a 05 JAN 2026")
  let yearHint = null;
  const yearHeaderRe = /(?:Emiss[aã]o|envio|Transac|Vencimento|Fatura)\b.+?\b(20\d{2})\b/i;
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const ym = lines[i].match(yearHeaderRe) || lines[i].match(/\b(20\d{2})\b/);
    if (ym) { yearHint = ym[1]; break; }
  }
  if (!yearHint) yearHint = String(new Date().getFullYear());

  let inTransacoes = false;
  let skipSection  = false;
  const txRe  = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:[•\.]+\s*\d+\s+|[\u2022\.\s]*\d{4}\s+)?(.+?)\s+R?\$?\s*([\d\.]+,\d{2})$/i;
  const txRe2 = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.+?)\s+R?\$?\s*([\d\.]+,\d{2})$/i;
  // linha com só data + descrição (sem valor — valor virá na próxima linha)
  const txNoVal = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:[•\.]+\s*\d+\s+|[\u2022\.\s]*\d{4}\s+)?(.+)$/i;

  let pending = null; // { day, monAbbr, desc }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Entrada na seção de transações
    if (/^TRANSAÇÕES/i.test(line) || /^TRANSAC/i.test(line)) {
      inTransacoes = true; skipSection = false; continue;
    }
    if (!inTransacoes) continue;

    // Seções que devem ser puladas
    if (/^Pagamentos?\s+e\s+Financiamentos?/i.test(line) ||
        /^Tarifas?\s+e\s+[Ee]ncargos?/i.test(line)       ||
        /^Encargos?\s+e\s+Tarifas?/i.test(line)           ||
        /^Outros\s+Cobranças?/i.test(line)) {
      skipSection = true; pending = null; continue;
    }
    // Reabilitar ao entrar em nova seção de compras
    if (/^(Compras?(\s+e\s+[Pp]arcelas?)?|Parcelamentos?)\s*$/i.test(line)) {
      skipSection = false; continue;
    }
    if (skipSection) { pending = null; continue; }

    // Cabeçalho de pessoa (nome sem valor) — pular
    if (/^[A-Z][a-záâãéêíóôõúç]+(\s+[A-Z][a-záâãéêíóôõúç]*)*\s*$/.test(line) &&
        !/\d{2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i.test(line)) {
      continue;
    }

    // ── Continuação de linha pendente (valor ou "Parcela X de Y R$ valor" na próxima linha) ──
    if (pending) {
      const contVal = line.match(/^R?\$?\s*([\d\.]+,\d{2})\s*$/);
      const contParcela = line.match(/[Pp]arcela\s+(\d+)\s+de\s+(\d+)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/i)
                       || line.match(/[Pp]arcela\s+(\d+)\/(\d+)\s+R?\$?\s*([\d\.]+,\d{2})\s*$/i);
      if (contParcela) {
        const valor = _parseValor(contParcela[3]);
        if (valor) {
          const parcelaStr = `${contParcela[1]}/${contParcela[2]}`;
          const mon = _MONTH_ABBR[pending.monAbbr];
          const monthName = _MONTH_NAME[mon];
          if (!result.cartao[monthName]) result.cartao[monthName] = [];
          const date = `${pending.day}/${mon}/${yearHint}`;
          result.cartao[monthName].push({ desc: pending.desc, parcela: parcelaStr, valor, date });
        }
        pending = null; continue;
      }
      if (contVal) {
        const valor = _parseValor(contVal[1]);
        if (valor) {
          const { parcela, clean } = _extractParcela(pending.desc);
          const mon = _MONTH_ABBR[pending.monAbbr];
          const monthName = _MONTH_NAME[mon];
          if (!result.cartao[monthName]) result.cartao[monthName] = [];
          const date = `${pending.day}/${mon}/${yearHint}`;
          result.cartao[monthName].push({ desc: clean, parcela, valor, date });
        }
        pending = null; continue;
      }
      // Linha não é valor — descartar pendente e processar normalmente
      pending = null;
    }

    // ── Linha com data + desc + valor ──
    const m = line.match(txRe) || line.match(txRe2);
    if (m) {
      const day = m[1], monAbbr = m[2].toUpperCase();
      let desc = m[3].trim().replace(/^(?:[•\u2022\.\s]+\d{4}\s+)/, '').replace(/^\d{4}\s+/, '').trim();
      const valor = _parseValor(m[4]);
      if (!valor) continue;
      if (_isFaturaCredit(desc) || _isFaturaFee(desc)) continue;
      if (/Saldo\s+restante/i.test(desc) || /^Pagamento\s+em/i.test(desc)) continue;

      const { parcela, clean } = _extractParcela(desc);
      const mon = _MONTH_ABBR[monAbbr];
      const monthName = _MONTH_NAME[mon];
      if (!result.cartao[monthName]) result.cartao[monthName] = [];
      const date = `${day}/${mon}/${yearHint}`;
      result.cartao[monthName].push({ desc: clean, parcela, valor, date });
      continue;
    }

    // ── Linha com data + desc sem valor (multi-line) ──
    const mn = line.match(txNoVal);
    if (mn) {
      const day = mn[1], monAbbr = mn[2].toUpperCase();
      let desc = mn[3].trim().replace(/^(?:[•\u2022\.\s]+\d{4}\s+)/, '').replace(/^\d{4}\s+/, '').trim();
      if (!desc || _isFaturaCredit(desc) || _isFaturaFee(desc)) continue;
      if (/Saldo\s+restante/i.test(desc) || /^Pagamento\s+em/i.test(desc)) continue;
      pending = { day, monAbbr, desc };
    }
  }
}

// ── Parser de fatura genérico: "DD/MM desc R$ valor" ou "DD/MM/YYYY desc R$ valor" (Itaú, C6, Bradesco, etc.) ──
function _parseFaturaGeneric(lines, result) {
  // "DD/MM/YYYY desc valor" or "DD/MM desc valor"
  const reFull = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(.+?)\s+([\d\.]+,\d{2})\s*$/;
  let yearHint = null;
  // Try to grab year from any header line
  for (const l of lines) {
    const ym = l.match(/\b(20\d{2})\b/);
    if (ym) { yearHint = ym[1]; break; }
  }

  for (const line of lines) {
    if (line === '§§PAGE§§') continue;
    const m = line.match(reFull);
    if (!m) continue;
    const day = m[1], mon = m[2], year = m[3] || yearHint || new Date().getFullYear();
    const desc = m[4].trim();
    const valor = _parseValor(m[5]);
    if (!valor || valor > 100000 || _isFaturaCredit(desc) || _isFaturaFee(desc)) continue;
    // Skip balance-like lines
    if (/^(Saldo|Total|Subtotal|Limite)/i.test(desc)) continue;

    const monthName = _MONTH_NAME[mon] || 'Outros';
    if (!result.cartao[monthName]) result.cartao[monthName] = [];
    const { parcela, clean } = _extractParcela(desc);
    result.cartao[monthName].push({ desc: clean, parcela, valor, date: `${day}/${mon}/${year}` });
  }
}

// ── Parser de extrato de conta — todos os bancos ──
function _parseExtratoLines(lines, result) {
  let currentDate = null;

  // Helpers de data
  const _setDateMon = (d, monAbbr, y) => { currentDate = `${d}/${_MONTH_ABBR[monAbbr.toUpperCase()]}/${y}`; };
  const _setDateDMY = (d, m, y) => { currentDate = `${d}/${m}/${y}`; };

  const lookVal = (fromIdx) => {
    for (let j = fromIdx + 1; j < Math.min(lines.length, fromIdx + 6); j++) {
      if (lines[j] === '§§PAGE§§') continue;
      const mv = lines[j].match(/^([\d\.]+,\d{2})\s*$/);
      if (mv) return _parseValor(mv[1]);
      if (/^(Transferência|Pagamento|Pix|PIX|TED|DOC|Total\s+de|\d{2}[\s\/])/i.test(lines[j])) break;
    }
    return null;
  };

  // Extrai nome após prefixo de tipo
  const _name = (raw, prefix) => _extractName(raw.replace(prefix, '').trim());

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (raw === '§§PAGE§§') continue;

    // ── Linha de data: "DD MON YYYY" (Nubank, Inter, alguns outros) ──
    const dmMon = raw.match(/^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\b/i);
    if (dmMon) { _setDateMon(dmMon[1], dmMon[2], dmMon[3]); continue; }

    // ── Prefixo "DD/MM/YYYY" na própria linha de transação (maioria dos bancos) ──
    const dmDMY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+/);
    if (dmDMY) { _setDateDMY(dmDMY[1], dmDMY[2], dmDMY[3]); raw = raw.slice(dmDMY[0].length).trim(); }

    // ── Skip: linhas de agregado / ruído ──
    if (!raw) continue;
    if (/^Total\s+de\s+(entradas|saídas)/i.test(raw)) continue;
    if (/^Saldo\s+(inicial|anterior|final|líquido|em\s+conta)/i.test(raw)) continue;
    if (/^(Movimentações|Rendimento|Extrato|Comprovante|Período)/i.test(raw)) continue;

    let m;

    // ── PIX / TED / DOC recebido ──
    const pixInRe = /^(?:(?:Pix|PIX)\s+(?:recebido|crédito|creditado|em\s+conta|Crédito)|Recebimento\s+(?:Pix|PIX)|Transferência\s+(?:PIX\s+)?[Rr]ecebida(?:\s+pelo\s+Pix)?|TED\s+[Rr]ecebida?|DOC\s+[Rr]ecebido?|Transferência\s+TED\s+[Rr]ecebida?|Transferência\s+[Rr]ecebida)/i;
    if (pixInRe.test(raw)) {
      m = raw.match(/(.+?)\s+([\d\.]+,\d{2})\s*$/);
      if (m) { result.pixIn.push({ valor: _parseValor(m[2]), nome: _name(m[1], pixInRe), data: currentDate }); }
      else { const v = lookVal(i); if (v) result.pixIn.push({ valor: v, nome: _name(raw, pixInRe), data: currentDate }); }
      continue;
    }

    // ── PIX / TED / DOC enviado ──
    const pixOutRe = /^(?:(?:Pix|PIX)\s+(?:enviado|débito)|Transferência\s+(?:PIX\s+)?[Ee]nviada(?:\s+pelo\s+Pix)?|TED\s+[Ee]nviada?|DOC\s+[Ee]nviado?|Transferência\s+TED\s+[Ee]nviada?|Transferência\s+[Ee]nviada)/i;
    if (pixOutRe.test(raw)) {
      m = raw.match(/(.+?)\s+([\d\.]+,\d{2})\s*$/);
      if (m) { result.pixOut.push({ valor: _parseValor(m[2]), nome: _name(m[1], pixOutRe), data: currentDate }); }
      else { const v = lookVal(i); if (v) result.pixOut.push({ valor: v, nome: _name(raw, pixOutRe), data: currentDate }); }
      continue;
    }

    // ── Pagamento de fatura ──
    m = raw.match(/^Pagamento\s+de\s+fatura\s+([\d\.]+,\d{2})\s*$/i);
    if (m) { result.debitos.push({ data: currentDate, descricao: 'Pagamento de fatura', valor: _parseValor(m[1]) }); continue; }
    if (/^Pagamento\s+de\s+fatura\s*$/i.test(raw)) {
      const v = lookVal(i); if (v) result.debitos.push({ data: currentDate, descricao: 'Pagamento de fatura', valor: v }); continue;
    }

    // ── Boleto / Pagamento de contas / Débito automático ──
    const boletoRe = /^(?:Pagamento\s+de\s+boleto|Pgto\.?\s+[Bb]oleto|Pagamento\s+de\s+conta|Pagamento\s+de\s+[Cc]oncess|Pagamento\s+conta|Débito\s+automático|Debito\s+automatico)/i;
    if (boletoRe.test(raw)) {
      m = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*$/);
      if (m) result.boletos.push({ data: currentDate, descricao: _extractName(m[1]) || m[1].trim(), valor: _parseValor(m[2]) });
      else { const v = lookVal(i); if (v) result.boletos.push({ data: currentDate, descricao: raw.replace(boletoRe, '').trim() || 'Boleto', valor: v }); }
      continue;
    }

    // ── Compra débito / Tarifas / Saques / IOF ──
    m = raw.match(/^(Tarifa[^,\d]*|Anuidade[^,\d]*|Compra\s+(?:no\s+|c\/\s*|on-?line\s+)?[Dd]ébito[^,\d]*|Débito\s+em\s+conta[^,\d]*|Saque[^,\d]*|IOF[^,\d]*|Mensalidade[^,\d]*|Assinatura[^,\d]*)(.+?)\s+([\d\.]+,\d{2})\s*$/i);
    if (m) { result.debitos.push({ data: currentDate, descricao: (m[1] + m[2]).replace(/\s+/g,' ').trim(), valor: _parseValor(m[3]) }); continue; }

    // ── Fallback genérico: qualquer linha com desc + valor (só quando há data no contexto) ──
    if (currentDate && dmDMY) {
      m = raw.match(/^(.+?)\s+([\d\.]+,\d{2})\s*$/);
      if (m) {
        const desc = m[1].trim(); const valor = _parseValor(m[2]);
        if (valor > 0 && valor < 1000000 && desc.length > 2 && !/^(Saldo|Total|Extrato|Limite|Rendimento)/i.test(desc)) {
          if (/[Rr]eceb|[Cc]rédito\s+em|entrada/i.test(desc)) result.pixIn.push({ valor, nome: _extractName(desc), data: currentDate });
          else if (/boleto|concession|pgto\b/i.test(desc)) result.boletos.push({ data: currentDate, descricao: desc, valor });
          else result.debitos.push({ data: currentDate, descricao: desc, valor });
        }
      }
    }
  }
}

function _parseValor(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}
function _extractName(raw) {
  if (!raw) return '';
  const parts = raw.split(/\s+-\s+/);
  let name = parts[0].trim();
  if (/^[•\u2022\.\d-]+$/.test(name)) name = (parts[1] || '').trim();
  return name;
}
// "DD/MM/YYYY" → "YYYY-MM-DD"
function _fmtDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// Sugestões de categoria baseadas em palavras-chave
const _CAT_HINTS = [
  [/ifood|rappi|uber\s*eat|delivery|mcdonald|burger|pizza|restaurante|lanche|padaria|mercado|atacad|carrefour|supermercado/i, 'Alimentação'],
  [/netflix|spotify|amazon\s*prime|disney|hbo|globoplay|youtube|prime\s*video|deezer|streaming/i, 'Assinaturas'],
  [/uber|99|cabify|ônibus|metro|passagem|combustível|gasolina|estacionamento|pedágio|posto/i, 'Transporte'],
  [/farmácia|droga|remédio|médico|consulta|plano\s*de\s*saúde|unimed|amil|hospital|clínica/i, 'Saúde'],
  [/escola|faculdade|curso|mensalidade\s*escola|educação|livro|material/i, 'Educação'],
  [/luz|água|energia|cemig|copel|saneamento|gás|condomínio|iptu|aluguel|internet|vivo|claro|tim\b|oi\b|net\b/i, 'Moradia'],
  [/roupa|calçado|tênis|loja|renner|riachuelo|zara|c&a|shein/i, 'Vestuário'],
  [/ingresso|cinema|show|teatro|lazer|game|steam/i, 'Lazer'],
];
function _autoCategory(desc) {
  for (const [re, cat] of _CAT_HINTS) {
    if (re.test(desc)) return cat;
  }
  return null;
}

// Pessoas já conhecidas no app
function _getKnownPeople() {
  const set = new Set();
  (S.months || []).forEach(m => (m.banks || []).forEach(b => (b.entries || []).forEach(e => {
    if (e.person && e.person.length > 1) set.add(e.person);
    if (e.owner && e.owner !== 'mine' && e.owner !== 'other' && e.owner.length > 1) set.add(e.owner);
  })));
  Object.values(S.pixEntries || {}).forEach(arr => arr.forEach(p => { if (p.to && p.to.length > 1) set.add(p.to); }));
  (S.receivableMarks || []).forEach(r => { if (r.person) set.add(r.person); });
  return [...set].sort((a, b) => a.localeCompare(b, 'pt'));
}

// Categorias já usadas no app
function _getKnownCategories() {
  const set = new Set();
  (S.months || []).forEach(m => (m.banks || []).forEach(b => (b.entries || []).forEach(e => {
    if (e.category) set.add(e.category);
  })));
  return [...set].sort((a, b) => a.localeCompare(b, 'pt'));
}

// ── Processar arquivo PDF ──
async function _processPdf(file) {
  const lines = await _extractLinesFromPdf(file);
  const kind = _detectDocKind(lines);
  const result = { cartao: {}, debitos: [], boletos: [], pixIn: [], pixOut: [] };

  if (kind.isFatura) {
    _parseFaturaLines(lines, result);        // Nubank: DD MON
    _parseFaturaGeneric(lines, result);      // outros bancos: DD/MM ou DD/MM/YYYY
  }
  if (kind.isExtrato) {
    _parseExtratoLines(lines, result);
  }
  if (!kind.isFatura && !kind.isExtrato) {
    // Tenta tudo — PDF de formato desconhecido
    _parseFaturaLines(lines, result);
    _parseFaturaGeneric(lines, result);
    _parseExtratoLines(lines, result);
  }
  return { result, kind };
}

// ── Handler de upload de PDF ──
function handleAIPdfDrop(files) { handleAIPdfFiles(files); }

async function handleAIPdfFiles(files) {
  if (!files || !files.length) return;
  const statusEl = document.getElementById('aiPdfStatus');
  const sectEl   = document.getElementById('aiPdfSections');

  statusEl.style.display = 'block';
  statusEl.className = 'ai-pdf-status info';
  statusEl.textContent = `Carregando PDF.js…`;

  try {
    await _loadPdfJs();
  } catch (e) {
    statusEl.className = 'ai-pdf-status error';
    statusEl.textContent = e.message;
    return;
  }

  statusEl.textContent = `Processando ${files.length} arquivo(s)…`;

  const merged = { cartao: {}, debitos: [], boletos: [], pixIn: [], pixOut: [] };
  const errors = [];

  for (const f of files) {
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
      errors.push(`${f.name}: não é um PDF`); continue;
    }
    try {
      const { result } = await _processPdf(f);
      // Merge cartao
      for (const [mo, items] of Object.entries(result.cartao)) {
        if (!merged.cartao[mo]) merged.cartao[mo] = [];
        merged.cartao[mo].push(...items);
      }
      merged.debitos.push(...result.debitos);
      merged.boletos.push(...result.boletos);
      merged.pixIn.push(...result.pixIn);
      merged.pixOut.push(...result.pixOut);
    } catch (e) {
      errors.push(`${f.name}: ${e.message}`);
    }
  }

  if (errors.length) {
    statusEl.className = 'ai-pdf-status error';
    statusEl.textContent = errors.join(' · ');
    if (errors.length === files.length) return;
  } else {
    statusEl.className = 'ai-pdf-status ok';
    statusEl.textContent = `✓ ${files.length} arquivo(s) processado(s) — selecione uma seção para importar`;
  }

  // Montar cards de seções
  const MONTH_ORDER = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const cartaoItems = Object.values(merged.cartao).flat();
  const fmtBRL = n => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const sections = [
    { key: 'cartao', label: 'Cartão crédito', type: 'cartao', count: cartaoItems.length, total: cartaoItems.reduce((s, i) => s + i.valor, 0), data: merged.cartao },
    { key: 'debitos', label: 'Débitos em conta', type: 'debito', count: merged.debitos.length, total: merged.debitos.reduce((s, i) => s + i.valor, 0), data: merged.debitos },
    { key: 'boletos', label: 'Boletos pagos', type: 'boleto', count: merged.boletos.length, total: merged.boletos.reduce((s, i) => s + i.valor, 0), data: merged.boletos },
    { key: 'pixIn',  label: 'Pix recebidos', type: 'pixin', count: merged.pixIn.length, total: merged.pixIn.reduce((s, i) => s + i.valor, 0), data: merged.pixIn },
    { key: 'pixOut', label: 'Pix enviados', type: 'pixout', count: merged.pixOut.length, total: merged.pixOut.reduce((s, i) => s + i.valor, 0), data: merged.pixOut },
  ].filter(s => s.count > 0);

  if (!sections.length) {
    statusEl.className = 'ai-pdf-status error';
    statusEl.textContent = 'Nenhum lançamento encontrado no(s) PDF(s).';
    sectEl.style.display = 'none';
    return;
  }

  const colorMap = { cartao: 'var(--accent)', debitos: 'var(--red)', boletos: 'var(--orange)', pixIn: 'var(--green)', pixOut: 'var(--blue)' };

  sectEl.innerHTML = '<div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:6px">SEÇÕES EXTRAÍDAS — marque as que deseja importar</div>' +
    sections.map(sec => `
      <label class="ai-pdf-sec" style="cursor:pointer">
        <input type="checkbox" id="aiSec_${sec.key}" checked style="width:auto;accent-color:var(--accent);flex-shrink:0">
        <div class="ai-pdf-sec-dot" style="background:${colorMap[sec.key] || 'var(--accent)'}"></div>
        <div class="ai-pdf-sec-info">
          <div class="ai-pdf-sec-name">${sec.label}</div>
          <div class="ai-pdf-sec-count">${sec.count} item(s) · ${fmtBRL(sec.total)}</div>
        </div>
      </label>`).join('') +
    `<button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;margin-top:6px" onclick="_usePdfSections()">
       Usar seções marcadas
     </button>`;

  // Guardar para uso em _usePdfSections
  window._aiPdfMerged = merged;
  window._aiPdfSectionsList = sections;
  sectEl.style.display = 'block';
}

// ── Converter uma seção do PDF em entries ──
function _sectionToEntries(key, merged) {
  if (key === 'cartao') {
    const out = [];
    for (const [, items] of Object.entries(merged.cartao)) {
      for (const it of items) {
        const pm = it.parcela ? it.parcela.match(/(\d+)\/(\d+)/) : null;
        out.push({
          desc: it.desc, amount: it.valor, date: _fmtDate(it.date || null),
          category: _autoCategory(it.desc), owner: 'mine', person: null,
          installment: !!(pm && parseInt(pm[2]) > 1),
          installCurrent: pm ? parseInt(pm[1]) : null,
          installTotal: pm ? parseInt(pm[2]) : null,
          entryType: 'cartao'
        });
      }
    }
    return out;
  }
  if (key === 'debitos') return merged.debitos.map(it => ({
    desc: it.descricao, amount: it.valor, date: _fmtDate(it.data),
    category: _autoCategory(it.descricao), owner: 'mine', person: null,
    installment: false, installCurrent: null, installTotal: null, entryType: 'debito'
  }));
  if (key === 'boletos') return merged.boletos.map(it => ({
    desc: it.descricao, amount: it.valor, date: _fmtDate(it.data),
    category: _autoCategory(it.descricao), owner: 'mine', person: null,
    installment: false, installCurrent: null, installTotal: null, entryType: 'boleto'
  }));
  if (key === 'pixIn') return merged.pixIn.map(it => ({
    desc: `Pix recebido${it.nome ? ' — ' + it.nome : ''}`, amount: it.valor, date: _fmtDate(it.data),
    category: null, owner: 'other', person: it.nome || null,
    installment: false, installCurrent: null, installTotal: null, entryType: 'pixin'
  }));
  if (key === 'pixOut') return merged.pixOut.map(it => ({
    desc: `Pix para ${it.nome || '—'}`, amount: it.valor, date: _fmtDate(it.data),
    category: null, owner: 'mine', person: it.nome || null,
    installment: false, installCurrent: null, installTotal: null, entryType: 'pixout'
  }));
  return [];
}

// ── Usar seções marcadas: junta todas as seções selecionadas em S.aiParsed ──
function _usePdfSections() {
  const merged = window._aiPdfMerged;
  const sects  = window._aiPdfSectionsList || [];
  if (!merged || !sects.length) return;

  const all = [];
  sects.forEach(sec => {
    const cb = document.getElementById('aiSec_' + sec.key);
    if (cb && cb.checked) all.push(..._sectionToEntries(sec.key, merged));
  });

  if (!all.length) { showToast('Marque ao menos uma seção.'); return; }

  S.aiParsed = all;
  document.getElementById('aiBaseActions').style.display = 'none';
  document.getElementById('aiBtnText').textContent = '✨ Interpretar novamente';
  renderAIEntries();
}

// ════════════════════════════════════════
// PARSERS POR TIPO — texto colado
// ════════════════════════════════════════

// Cartão: "iFood R$ 32,00" ou "Notebook [2/3] R$ 195,00"
function _parseCartaoText(text) {
  const entries = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l !== '—' && !/^Total:/i.test(l) && !/^═══/.test(l) && !/^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)$/i.test(l));
  for (const line of lines) {
    // "Notebook [2/3] R$ 195,00" (formato do leitorDeExtratos)
    const mRs = line.match(/^(.+?)\s+(?:\[(\d+)\/(\d+)\]\s+)?R\$\s*([\d\.]+,\d{2})$/);
    if (mRs) {
      const a = _parseValor(mRs[4]);
      if (a > 0 && a < 100000) entries.push({
        desc: mRs[1].trim(), amount: a,
        owner: 'mine', person: null,
        installment: !!(mRs[2] && parseInt(mRs[3]) > 1),
        installCurrent: mRs[2] ? parseInt(mRs[2]) : null,
        installTotal:   mRs[3] ? parseInt(mRs[3]) : null,
        entryType: 'cartao'
      });
      continue;
    }
    // "Notebook [2/3] 195,00" ou "195,00 Notebook"
    const std = line.match(/^(.+?)\s+([\d]+(?:\.[\d]{3})*,\d{2})$/)
              || line.match(/^([\d]+(?:\.[\d]{3})*,\d{2})\s+(.+)$/);
    if (std) {
      let desc, amtStr;
      if (/^\d/.test(std[1])) { amtStr = std[1]; desc = std[2]; }
      else { desc = std[1]; amtStr = std[2]; }
      // Extract parcela within desc: "Notebook 2/12"
      let installCurrent = null, installTotal = null, installment = false;
      const pm = desc.match(/\s+(\d+)\/(\d+)$/);
      if (pm) { desc = desc.slice(0, pm.index).trim(); installCurrent = parseInt(pm[1]); installTotal = parseInt(pm[2]); installment = installTotal > 1; }
      const a = _parseValor(amtStr);
      if (a > 0 && a < 100000) entries.push({
        desc: desc.trim(), amount: a,
        owner: 'mine', person: null,
        installment, installCurrent, installTotal,
        entryType: 'cartao'
      });
    }
  }
  return entries;
}

// Débito / Boleto: "DD/MM/YYYY - Desc - R$ valor" ou "Desc - R$ valor" ou "Desc R$ valor"
function _parseDebitoText(text, entryType) {
  const entries = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l !== '—' && !/^Total:/i.test(l) && !/^═══/.test(l));
  for (const line of lines) {
    // "01/01/2025 - Desc - R$ 9,90"  (date agora capturado)
    const mDate = line.match(/^(?:(\d{2}\/\d{2}\/\d{4})\s+-\s+)?(.+?)\s+-\s+R\$\s*([\d\.]+,\d{2})$/);
    if (mDate) {
      const a = _parseValor(mDate[3]);
      const desc = mDate[2].trim();
      if (a > 0) entries.push({ desc, amount: a, date: _fmtDate(mDate[1]), category: _autoCategory(desc), owner: 'mine', person: null, installment: false, installCurrent: null, installTotal: null, entryType });
      continue;
    }
    // "Desc R$ valor"
    const mRs = line.match(/^(.+?)\s+R\$\s*([\d\.]+,\d{2})$/);
    if (mRs) {
      const desc = mRs[1].trim();
      const a = _parseValor(mRs[2]);
      if (a > 0) entries.push({ desc, amount: a, date: null, category: _autoCategory(desc), owner: 'mine', person: null, installment: false, installCurrent: null, installTotal: null, entryType });
      continue;
    }
    // "Desc valor"
    const std = line.match(/^(.+?)\s+([\d]+(?:\.[\d]{3})*,\d{2})$/);
    if (std) {
      const desc = std[1].trim();
      const a = _parseValor(std[2]);
      if (a > 0 && a < 100000) entries.push({ desc, amount: a, date: null, category: _autoCategory(desc), owner: 'mine', person: null, installment: false, installCurrent: null, installTotal: null, entryType });
    }
  }
  return entries;
}

// Pix recebidos: "DD/MM/YYYY - R$ valor - Nome"  ou  "R$ valor - Nome"
function _parsePixInText(text) {
  const entries = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l !== '—' && !/^Total:/i.test(l) && !/^═══/.test(l));
  for (const line of lines) {
    const mD = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+-\s+R\$\s*([\d\.]+,\d{2})\s+-\s+(.+)$/);
    if (mD) {
      const a = _parseValor(mD[2]); const name = mD[3].trim();
      if (a > 0) entries.push({ desc: `Pix recebido — ${name}`, amount: a, date: _fmtDate(mD[1]), owner: 'other', person: name, installment: false, installCurrent: null, installTotal: null, entryType: 'pixin' });
      continue;
    }
    const m = line.match(/^R\$\s*([\d\.]+,\d{2})\s+-\s+(.+)$/);
    if (m) {
      const a = _parseValor(m[1]); const name = m[2].trim();
      if (a > 0) entries.push({ desc: `Pix recebido — ${name}`, amount: a, date: null, owner: 'other', person: name, installment: false, installCurrent: null, installTotal: null, entryType: 'pixin' });
    }
  }
  return entries;
}

// Pix enviados: "DD/MM/YYYY - R$ valor - para Nome"  ou  "R$ valor - para Nome"
function _parsePixOutText(text) {
  const entries = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l !== '—' && !/^Total:/i.test(l) && !/^═══/.test(l));
  for (const line of lines) {
    const mD = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+-\s+R\$\s*([\d\.]+,\d{2})\s+-\s+(?:para\s+)?(.+)$/i);
    if (mD) {
      const a = _parseValor(mD[2]); const name = mD[3].trim();
      if (a > 0) entries.push({ desc: `Pix para ${name}`, amount: a, date: _fmtDate(mD[1]), owner: 'mine', person: name, installment: false, installCurrent: null, installTotal: null, entryType: 'pixout' });
      continue;
    }
    const m = line.match(/^R\$\s*([\d\.]+,\d{2})\s+-\s+(?:para\s+)?(.+)$/i);
    if (m) {
      const a = _parseValor(m[1]); const name = m[2].trim();
      if (a > 0) entries.push({ desc: `Pix para ${name}`, amount: a, date: null, owner: 'mine', person: name, installment: false, installCurrent: null, installTotal: null, entryType: 'pixout' });
    }
  }
  return entries;
}

// Auto: detecta formato e despacha, ou usa parser freeform original
function _parseAutoText(text) {
  const trimmed = text.trim();

  // Texto completo exportado pelo leitorDeExtratos (tem separadores ═══)
  if (/═══/.test(trimmed)) {
    const all = [];
    const chunks = trimmed.split(/^═══[^═\n]*═══\s*$/m).map(c => c.trim()).filter(Boolean);
    // sections headers map
    const headers = [...trimmed.matchAll(/^═══\s*([^\n═]+?)\s*═══\s*$/gm)].map(m => m[1].toLowerCase());
    headers.forEach((h, idx) => {
      const chunk = chunks[idx];
      if (!chunk) return;
      if (/cartão|cartao|compras/i.test(h)) all.push(..._parseCartaoText(chunk));
      else if (/débito|debito/i.test(h)) all.push(..._parseDebitoText(chunk, 'debito'));
      else if (/boleto/i.test(h)) all.push(..._parseDebitoText(chunk, 'boleto'));
      else if (/recebid/i.test(h)) all.push(..._parsePixInText(chunk));
      else if (/enviado/i.test(h)) all.push(..._parsePixOutText(chunk));
    });
    if (all.length) return all;
  }

  // Detectar por linhas
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const pixInLines = lines.filter(l => /^R\$\s*[\d]/i.test(l) && !/-\s*para\s+/i.test(l)).length;
  const pixOutLines = lines.filter(l => /^R\$\s*[\d].*-\s*para\s+/i.test(l)).length;
  const dateLines = lines.filter(l => /^\d{2}\/\d{2}\/\d{4}\s+-/.test(l)).length;

  if (pixOutLines >= lines.length * 0.5) return _parsePixOutText(text);
  if (pixInLines >= lines.length * 0.5 && dateLines < 2) return _parsePixInText(text);
  if (dateLines >= lines.length * 0.3) return _parseDebitoText(text, 'debito');

  // Fallback: parser freeform original
  return _parseFreeform(text);
}

// Parser freeform original (para texto digitado manualmente)
function _parseFreeform(raw) {
  const entries = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length);
  const supMap = { '¹':1,'²':2,'³':3,'⁴':4,'⁵':5,'⁶':6,'⁷':7,'⁸':8,'⁹':9 };
  const pKw = ['sogra','sogro','mãe','mae','pai','namorado','namorada','irmã','irmao','irmão','amigo','amiga','marido','esposa','tia','tio','vó','vo'];
  let curPerson = null;

  for (const line of lines) {
    const blk = line.match(/^([a-zA-ZÀ-ú\s]{1,30}?)\s*:\s*(.*)/i);
    if (blk) {
      const nm = blk[1].trim();
      const rest = blk[2].trim();
      const isMe = /^eu$/i.test(nm);
      curPerson = isMe ? null : nm;
      if (rest) {
        const nums = rest.match(/[\d]+(?:[.,][\d]+)?/g) || [];
        nums.forEach(n => {
          const a = parseFloat(n.replace(',', '.'));
          if (a > 0 && a < 100000) entries.push({ desc: curPerson || 'Lançamento', amount: a, owner: curPerson ? 'other' : 'mine', person: curPerson, installment: false, installCurrent: null, installTotal: null });
        });
      }
      continue;
    }
    const instSup = line.match(/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s*([¹²³⁴⁵⁶⁷⁸⁹])°?/);
    if (instSup) {
      const a = parseFloat(instSup[2].replace(',', '.'));
      if (a > 0) entries.push({ desc: instSup[1].trim(), amount: a, owner: curPerson ? 'other' : 'mine', person: curPerson, installment: true, installCurrent: supMap[instSup[3]] || 1, installTotal: 12 });
      continue;
    }
    const instFrac = line.match(/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s+(\d+)\/(\d+)/);
    if (instFrac) {
      const a = parseFloat(instFrac[2].replace(',', '.'));
      if (a > 0) entries.push({ desc: instFrac[1].trim(), amount: a, owner: curPerson ? 'other' : 'mine', person: curPerson, installment: true, installCurrent: parseInt(instFrac[3]), installTotal: parseInt(instFrac[4]) });
      continue;
    }
    const std = line.match(/^(.+?)\s+([\d]+[.,][\d]{2})$/) || line.match(/^([\d]+[.,][\d]{2})\s+(.+)$/);
    if (std) {
      let desc, amtStr;
      if (/^[\d]/.test(std[1])) { amtStr = std[1]; desc = std[2]; } else { desc = std[1]; amtStr = std[2]; }
      const a = parseFloat(amtStr.replace(',', '.'));
      const isOth = pKw.some(k => desc.toLowerCase().includes(k));
      if (a > 0 && a < 100000) entries.push({ desc: desc.trim(), amount: a, owner: isOth ? 'other' : 'mine', person: isOth ? desc.trim() : curPerson, installment: false, installCurrent: null, installTotal: null });
    }
  }
  return entries.filter(e => e.amount > 0);
}

// ── Dispatcher principal ──
function parseExtrato(raw) {
  if (_aiType === 'cartao') return _parseCartaoText(raw);
  if (_aiType === 'debito') return _parseDebitoText(raw, 'debito');
  if (_aiType === 'boleto') return _parseDebitoText(raw, 'boleto');
  if (_aiType === 'pixin')  return _parsePixInText(raw);
  if (_aiType === 'pixout') return _parsePixOutText(raw);
  return _parseAutoText(raw);
}

// ════════════════════════════════════════
// RENDER + IMPORT
// ════════════════════════════════════════

async function runAI() {
  const text = document.getElementById('aiText').value.trim();
  if (!text) { alert('Cole o texto do extrato primeiro.'); return; }

  document.getElementById('aiBtnText').innerHTML = '<span class="spinner"></span>Interpretando...';
  document.getElementById('aiBaseActions').style.display = 'none';

  setTimeout(() => {
    try {
      S.aiParsed = parseExtrato(text);
      renderAIEntries();
    } catch (e) {
      alert('Erro ao interpretar o texto.');
      document.getElementById('aiBtnText').textContent = '✨ Interpretar';
      document.getElementById('aiBaseActions').style.display = 'flex';
    }
  }, 300);
}

const _TYPE_LABEL = { cartao: 'cartão', debito: 'débito', boleto: 'boleto', pixin: 'pix recebido', pixout: 'pix enviado' };
const _TYPE_COLOR = { cartao: 'var(--accent)', debito: 'var(--red)', boleto: 'var(--orange)', pixin: 'var(--green)', pixout: 'var(--blue)' };
const _DEST_LABEL = { pixin: '→ entradas', pixout: '→ pix enviados', cartao: '→ banco', debito: '→ banco', boleto: '→ banco' };

// Atualiza tipo de um item sem re-renderizar a lista inteira
function _aiSetType(i, type) {
  S.aiParsed[i].entryType = type;
  const dest = document.getElementById('aiDest_' + i);
  if (dest) dest.textContent = _DEST_LABEL[type] || '→ banco';
}

// Toggle "Meu / Não meu" sem re-renderizar
function _aiToggleMine(i) {
  const e = S.aiParsed[i];
  e.isMine = !(e.isMine !== false);
  const btn = document.getElementById('aiMineBtn_' + i);
  const row = document.getElementById('aiPersonRow_' + i);
  if (btn) {
    btn.textContent = e.isMine ? 'Meu' : 'Não meu';
    btn.classList.toggle('ai-mine-btn--mine', e.isMine);
  }
  if (row) row.style.display = e.isMine ? 'none' : 'flex';
}

function renderAIEntries() {
  document.getElementById('aiBtnText').textContent = '✨ Interpretar novamente';
  document.getElementById('aiBaseActions').style.display = 'none';

  if (!S.aiParsed.length) {
    document.getElementById('aiResult').style.display = 'block';
    document.getElementById('aiEntryList').innerHTML =
      '<div style="color:var(--text3);font-family:var(--mono);font-size:12px;padding:10px">Nenhum lançamento identificado. Tente ajustar o tipo ou reformatar o texto.</div>';
    return;
  }

  // Inicializa isMine se ainda não foi definido
  S.aiParsed.forEach(e => { if (e.isMine === undefined) e.isMine = true; });

  const knownPeople = _getKnownPeople();
  const knownCats   = _getKnownCategories();
  const datalists = `
    <datalist id="aiPersonList">${knownPeople.map(p => `<option value="${p.replace(/"/g,'&quot;')}">`).join('')}</datalist>
    <datalist id="aiCatList">${knownCats.map(c => `<option value="${c.replace(/"/g,'&quot;')}">`).join('')}</datalist>`;

  document.getElementById('aiEntryList').innerHTML = datalists + S.aiParsed.map((e, i) => {
    const destLabel = _DEST_LABEL[e.entryType] || '→ banco';
    const isMine = e.isMine !== false;
    const typeOpts = [
      ['cartao','🃏 Cartão'],['debito','💳 Débito'],
      ['pixin','↙ Pix rec.'],['pixout','↗ Pix env.'],['boleto','📄 Boleto']
    ].map(([v, l]) => `<option value="${v}"${e.entryType===v?' selected':''}>${l}</option>`).join('');
    const personVal = (!isMine && (e.owner || e.person)) ? (e.owner !== 'mine' && e.owner !== 'other' ? e.owner : e.person) || '' : '';

    return `
    <div class="ai-entry-item" id="aiItem_${i}">
      <input type="checkbox" id="aic${i}" checked>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;margin-bottom:5px">${e.desc}
          ${e.installment ? `<span class="bm bm-inst" style="margin-left:4px">${e.installCurrent||1}/${e.installTotal||'?'}</span>` : ''}
        </div>
        <div class="ai-item-meta">
          <span style="color:var(--accent);font-size:11px;font-family:var(--mono)">R$&nbsp;${fmt(e.amount)}</span>
          <select class="ai-mini-sel" onchange="_aiSetType(${i}, this.value)">${typeOpts}</select>
          <span id="aiDest_${i}" style="font-size:11px;color:var(--text3);font-family:var(--mono)">${destLabel}</span>
          <button class="ai-mine-btn${isMine ? ' ai-mine-btn--mine' : ''}" id="aiMineBtn_${i}" onclick="_aiToggleMine(${i})">${isMine ? 'Meu' : 'Não meu'}</button>
        </div>
        <div class="ai-item-extra">
          <input type="date" value="${e.date||''}"
            style="flex:1;min-width:80px;font-size:11px;padding:3px 6px;border:1px solid var(--border2);border-radius:4px;background:var(--bg3);color:var(--text)"
            onchange="S.aiParsed[${i}].date = this.value || null">
          <input type="text" list="aiCatList" value="${(e.category||'').replace(/"/g,'&quot;')}" placeholder="Categoria"
            style="flex:1;min-width:60px;font-size:11px;padding:3px 6px;border:1px solid var(--border2);border-radius:4px;background:var(--bg3);color:var(--text)"
            oninput="S.aiParsed[${i}].category = this.value || null">
        </div>
        <div id="aiPersonRow_${i}" style="display:${isMine ? 'none' : 'flex'};align-items:center;gap:6px;margin-top:5px">
          <span style="font-size:11px;color:var(--text3);white-space:nowrap">De quem:</span>
          <input type="text" list="aiPersonList" placeholder="nome da pessoa" value="${personVal.replace(/"/g,'&quot;')}"
            style="font-size:11px;padding:3px 8px;border:1px solid var(--border2);border-radius:4px;background:var(--bg3);color:var(--text);flex:1;min-width:0"
            oninput="S.aiParsed[${i}].owner = this.value">
        </div>
      </div>
      <input type="number" value="${e.amount.toFixed(2)}" step="0.01" min="0"
        style="padding:4px 6px;font-size:11px;width:78px;text-align:right;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;color:var(--text);flex-shrink:0"
        onchange="S.aiParsed[${i}].amount = parseFloat(this.value) || 0">
    </div>`;
  }).join('');

  document.getElementById('aiResult').style.display = 'block';
}

async function importAIEntries() {
  const monthKey = document.getElementById('aiMonthSel').value;
  const bankName = document.getElementById('aiBankSel').value || 'Importado';
  const m = S.months.find(x => x.key === monthKey);
  if (!m) { alert('Mês não encontrado.'); return; }

  const checked = S.aiParsed.filter((e, i) => document.getElementById('aic' + i)?.checked && e.amount > 0);
  if (!checked.length) { alert('Nenhum item selecionado.'); return; }

  const bankItems = checked.filter(e => !['pixin', 'pixout'].includes(e.entryType));
  const pixInItems  = checked.filter(e => e.entryType === 'pixin');
  const pixOutItems = checked.filter(e => e.entryType === 'pixout');

  setSyncing(true);

  // ── Bank entries (cartão, débito, boleto, freeform) ──
  if (bankItems.length) {
    let bank = m.banks.find(b => b.name === bankName);
    if (!bank) {
      const newBank = { name: bankName, color: 'azure', entries: [] };
      m.banks.push(newBank);
      await dbSaveBank(monthKey, newBank);
      bank = m.banks[m.banks.length - 1];
    }

    for (let i = 0; i < bankItems.length; i++) {
      const e = bankItems[i];
      const entryBaseType = (e.entryType === 'debito' || e.entryType === 'boleto') ? 'debit' : 'normal';

      const entryOwner = (e.isMine !== false) ? null : (e.owner || null);

      const entryDate = e.date || today();
      const entryCat  = e.category || null;

      if (e.installment && e.installTotal > 1) {
        const gId = 'grp_ai_' + Date.now() + '_' + i;
        const entry = {
          id: String(Date.now() + i), desc: e.desc, amount: e.amount, date: entryDate,
          owner: entryOwner, person: e.person || null, category: entryCat, note: null,
          type: 'installment', installCurrent: e.installCurrent || 1,
          installTotal: e.installTotal, groupId: gId
        };
        bank.entries.push(entry);
        await dbSaveEntry(monthKey, bankName, entry);
        await registerFutureInst({
          desc: e.desc, partAmt: e.amount, total: e.installTotal,
          cur: e.installCurrent || 1, bankName, owner: entryOwner,
          person: e.person || null, cat: entryCat, gId, startKey: monthKey, date: entryDate
        });
      } else {
        const entry = {
          id: String(Date.now() + i), desc: e.desc, amount: e.amount, date: entryDate,
          owner: entryOwner, person: e.person || null, category: entryCat, note: null,
          type: entryBaseType
        };
        bank.entries.push(entry);
        await dbSaveEntry(monthKey, bankName, entry);
      }
    }
  }

  // ── Pix recebidos → incomes ──
  if (pixInItems.length) {
    if (!S.incomes[monthKey]) S.incomes[monthKey] = [];
    for (let i = 0; i < pixInItems.length; i++) {
      const e = pixInItems[i];
      const inc = {
        id: String(Date.now() + 1000 + i),
        desc: e.desc, amount: e.amount, date: e.date || today(),
        from: null, owner: 'other', person: e.person || null,
        incType: 'Pix'
      };
      S.incomes[monthKey].push(inc);
      await dbSaveIncome(monthKey, inc);
    }
  }

  // ── Pix enviados → pix_entries ──
  if (pixOutItems.length) {
    if (!S.pixEntries[monthKey]) S.pixEntries[monthKey] = [];
    for (let i = 0; i < pixOutItems.length; i++) {
      const e = pixOutItems[i];
      const pix = {
        id: String(Date.now() + 2000 + i),
        to: e.person || e.desc, amount: e.amount,
        date: e.date || today(), bank: bankName, obs: null
      };
      S.pixEntries[monthKey].push(pix);
      await dbSavePix(monthKey, pix);
    }
  }

  setSyncing(false);

  S.currentMonth = monthKey;
  S.currentBank  = bankName;
  save();
  renderMonthList();
  selectMonth(monthKey);
  closeModal('mAI');
  showToast(`✓ ${checked.length} lançamento(s) importado(s)`);
}
