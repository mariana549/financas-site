// ══════════════════════════════════════════════════
// MONTHS.JS — CRUD de Meses
// ══════════════════════════════════════════════════

async function addMonth() {
  const m = document.getElementById('mSel').value;
  const y = document.getElementById('mYear').value;
  const key = m + '/' + y;
  if (S.months.find(x => x.key === key)) { alert('Mês já existe.'); return; }
  const goal = parseFloat(document.getElementById('mGoal').value) || null;
  const month = { key, label: m, year: y, banks: [], goal };
  S.months.push(month);
  setSyncing(true);
  await dbSaveMonth(month);
  await injectInstallments(key);
  setSyncing(false);
  renderMonthList();
  selectMonth(key);
  closeModal('mMonth');
  document.getElementById('mGoal').value = '';
}

async function copyLastMonth() {
  if (S.months.length === 0) { alert('Nenhum mês para copiar.'); return; }
  const last = S.months[S.months.length - 1];
  const m = document.getElementById('mSel').value;
  const y = document.getElementById('mYear').value;
  const key = m + '/' + y;
  if (S.months.find(x => x.key === key)) { alert('Mês já existe.'); return; }
  const goal = parseFloat(document.getElementById('mGoal').value) || last.goal || null;
  const banks = last.banks.map(b => ({ ...b, entries: [] }));
  const month = { key, label: m, year: y, banks, goal };
  S.months.push(month);
  setSyncing(true);
  await dbSaveMonth(month);
  for (const b of banks) await dbSaveBank(key, b);
  if (S.recurrents[last.key]) {
    S.recurrents[key] = (S.recurrents[last.key] || []).map(r => ({ ...r, id: Date.now() + Math.random() }));
    for (const r of S.recurrents[key]) await dbSaveRecurrent(key, r);
  }
  await injectInstallments(key);
  setSyncing(false);
  renderMonthList();
  selectMonth(key);
  closeModal('mMonth');
  document.getElementById('mGoal').value = '';
}

function renderMonthList() {
  const el = document.getElementById('monthList');
  if (!el) return;
  if (!S.months.length) {
    el.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:var(--text3);font-family:var(--mono)">nenhum mês</div>';
    return;
  }
  el.innerHTML = S.months.map(m => `
    <div class="month-item ${S.currentMonth === m.key ? 'active' : ''}" onclick="selectMonth('${m.key}')">
      <span>${m.label.slice(0, 3)} ${m.year}</span>
      <span class="badge">R$${fmt(monthTotal(m))}</span>
    </div>`).join('');
}

function monthTotal(m) {
  let t = m.banks.reduce((s, b) => s + b.entries.reduce((ss, e) => ss + e.amount, 0), 0);
  t += (S.recurrents[m.key] || []).reduce((s, r) => s + r.amount, 0);
  t += (S.pixEntries[m.key] || []).reduce((s, p) => s + p.amount, 0);
  return t;
}

function selectMonth(key, render = true) {
  S.currentMonth = key;
  const m = getMonth();
  if (!m) return;
  const tbTitle = document.getElementById('tbTitle');
  const tbSub = document.getElementById('tbSub');
  if (tbTitle) tbTitle.textContent = m.label + ' ' + m.year;
  if (tbSub) tbSub.textContent = m.banks.length + ' banco(s)' + (m.goal ? ` · meta R$${fmt(m.goal)}` : '');
  S.currentBank = m.banks.length ? m.banks[0].name : null;
  buildActions();
  renderMonthList();
  if (render) renderDash();
  save();
}

function getMonth() {
  return S.months.find(m => m.key === S.currentMonth);
}

function buildActions() {
  const el = document.getElementById('tbActions');
  if (!el) return;
  if (getMonth()) {
    el.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="openModal('mGoal')">🎯 Meta</button>
      <button class="btn btn-ghost btn-sm" onclick="openAI()">📄 Extrato IA</button>
      <button class="btn btn-ghost btn-sm" onclick="exportMonthPDF()">📥 PDF</button>`;
  } else {
    el.innerHTML = '';
  }
}