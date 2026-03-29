// ══════════════════════════════════════════════════
// AI-ENGINE.JS — Importação de Extratos (parser local)
// ══════════════════════════════════════════════════

function openAI() {
  if (!S.months.length) { alert('Crie um mês primeiro.'); return; }
  const ms = document.getElementById('aiMonthSel');
  ms.innerHTML = S.months.map(m => `<option value="${m.key}">${m.label} ${m.year}</option>`).join('');
  ms.value = S.currentMonth || S.months[0].key;
  updateAIBankSel();
  document.getElementById('aiText').value = '';
  document.getElementById('aiResult').style.display = 'none';
  document.getElementById('aiBaseActions').style.display = 'flex';
  document.getElementById('aiBtnText').textContent = '✨ Interpretar com IA';
  S.aiParsed = [];
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


async function runAI() {
  const text = document.getElementById('aiText').value.trim();
  if (!text) { alert('Cole o texto do extrato.'); return; }

  document.getElementById('aiBtnText').innerHTML = '<span class="spinner"></span>Interpretando...';
  document.getElementById('aiBaseActions').style.display = 'none';

  setTimeout(() => {
    try {
      S.aiParsed = parseExtrato(text);
      renderAIEntries();
    } catch (e) {
      alert('Erro ao interpretar o texto.');
      document.getElementById('aiBtnText').textContent = '✨ Interpretar com IA';
      document.getElementById('aiBaseActions').style.display = 'flex';
    }
  }, 300);
}
function parseExtrato(raw) {
  const entries = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length);
  const supMap = { '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  const pKw = ['sogra', 'sogro', 'mãe', 'mae', 'pai', 'namorado', 'namorada',
    'irmã', 'irmao', 'irmão', 'amigo', 'amiga', 'marido', 'esposa', 'tia', 'tio', 'vó', 'vo'];
  let curPerson = null;

  for (const line of lines) {
    // "eu: 55+25" ou "Sogra: 13+44"
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
          if (a > 0 && a < 100000) entries.push({
            desc: curPerson || 'Lançamento', amount: a,
            owner: curPerson ? 'other' : 'mine', person: curPerson,
            installment: false, installCurrent: null, installTotal: null
          });
        });
      }
      continue;
    }

    // "Moto 195¹°" — parcelado com superscript
    const instSup = line.match(/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s*([¹²³⁴⁵⁶⁷⁸⁹])°?/);
    if (instSup) {
      const a = parseFloat(instSup[2].replace(',', '.'));
      if (a > 0) entries.push({
        desc: instSup[1].trim(), amount: a,
        owner: curPerson ? 'other' : 'mine', person: curPerson,
        installment: true, installCurrent: supMap[instSup[3]] || 1, installTotal: 12
      });
      continue;
    }

    // "Notebook 195 1/12" — parcelado com fração
    const instFrac = line.match(/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s+(\d+)\/(\d+)/);
    if (instFrac) {
      const a = parseFloat(instFrac[2].replace(',', '.'));
      if (a > 0) entries.push({
        desc: instFrac[1].trim(), amount: a,
        owner: curPerson ? 'other' : 'mine', person: curPerson,
        installment: true, installCurrent: parseInt(instFrac[3]), installTotal: parseInt(instFrac[4])
      });
      continue;
    }

    // "iFood 32,00" — padrão
    const std = line.match(/^(.+?)\s+([\d]+[.,][\d]{2})$/)
      || line.match(/^([\d]+[.,][\d]{2})\s+(.+)$/);
    if (std) {
      let desc, amtStr;
      if (/^[\d]/.test(std[1])) { amtStr = std[1]; desc = std[2]; }
      else { desc = std[1]; amtStr = std[2]; }
      const a = parseFloat(amtStr.replace(',', '.'));
      const isOth = pKw.some(k => desc.toLowerCase().includes(k));
      if (a > 0 && a < 100000) entries.push({
        desc: desc.trim(), amount: a,
        owner: isOth ? 'other' : 'mine',
        person: isOth ? desc.trim() : curPerson,
        installment: false, installCurrent: null, installTotal: null
      });
    }
  }
  return entries.filter(e => e.amount > 0);
}

function renderAIEntries() {
  document.getElementById('aiBtnText').textContent = '✨ Interpretar novamente';
  document.getElementById('aiBaseActions').style.display = 'none';

  if (!S.aiParsed.length) {
    document.getElementById('aiResult').style.display = 'block';
    document.getElementById('aiEntryList').innerHTML =
      '<div style="color:var(--text3);font-family:var(--mono);font-size:12px;padding:10px">Nenhum lançamento identificado. Tente reformatar o texto.</div>';
    return;
  }

  document.getElementById('aiEntryList').innerHTML = S.aiParsed.map((e, i) => `
    <div class="ai-entry-item">
      <input type="checkbox" id="aic${i}" checked>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${e.desc}
          ${e.person ? `→ <span style="color:var(--blue)">${e.person}</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">
          ${e.installment ? `parcela ${e.installCurrent || 1}/${e.installTotal || '?'} · ` : ''}
          <span style="color:var(--accent)">R$ ${fmt(e.amount)}</span>
          · ${e.owner === 'mine' ? 'meu' : 'outro'}
        </div>
      </div>
      <input type="number" value="${e.amount}" step="0.01" min="0"
        style="padding:4px 6px;font-size:11px;width:80px;text-align:right;background:var(--bg3);border:1px solid var(--border2);border-radius:4px;color:var(--text)"
        onchange="S.aiParsed[${i}].amount = parseFloat(this.value) || 0">
    </div>`).join('');

  document.getElementById('aiResult').style.display = 'block';
}

async function importAIEntries() {
  const monthKey = document.getElementById('aiMonthSel').value;
  const bankName = document.getElementById('aiBankSel').value || 'Importado';
  const m = S.months.find(x => x.key === monthKey);
  if (!m) { alert('Mês não encontrado.'); return; }

  let bank = m.banks.find(b => b.name === bankName);
  if (!bank) {
    const newBank = { name: bankName, color: 'azure', entries: [] };
    m.banks.push(newBank);
    await dbSaveBank(monthKey, newBank);
    bank = m.banks[m.banks.length - 1];
  }

  setSyncing(true);
  for (let i = 0; i < S.aiParsed.length; i++) {
    const e = S.aiParsed[i];
    if (!document.getElementById('aic' + i)?.checked) continue;
    if (e.amount <= 0) continue;

    if (e.installment && e.installTotal > 1) {
      const gId = 'grp_ai_' + Date.now() + '_' + i;
      const entry = {
        id: Date.now() + i, desc: e.desc, amount: e.amount, date: today(),
        owner: e.owner, person: e.person || null, category: null, note: null,
        type: 'installment', installCurrent: e.installCurrent || 1,
        installTotal: e.installTotal, groupId: gId
      };
      bank.entries.push(entry);
      await dbSaveEntry(monthKey, bankName, entry);
      await registerFutureInst({
        desc: e.desc, partAmt: e.amount, total: e.installTotal,
        cur: e.installCurrent || 1, bankName, owner: e.owner,
        person: e.person || null, cat: null, gId,
        startKey: monthKey, date: today()
      });
    } else {
      const entry = {
        id: Date.now() + i, desc: e.desc, amount: e.amount, date: today(),
        owner: e.owner, person: e.person || null,
        category: null, note: null, type: 'normal'
      };
      bank.entries.push(entry);
      await dbSaveEntry(monthKey, bankName, entry);
    }
  }
  setSyncing(false);

  S.currentMonth = monthKey;
  S.currentBank = bankName;
  save();
  renderMonthList();
  selectMonth(monthKey);
  closeModal('mAI');
}