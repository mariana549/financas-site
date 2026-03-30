// ══════════════════════════════════════════════════
// MONTHS.JS — CRUD de Meses (com Editar e Excluir)
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
    <div class="month-item ${S.currentMonth === m.key ? 'active' : ''}"
         onclick="selectMonth('${m.key}')">
      <span>${m.label.slice(0, 3)} ${m.year}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <span class="badge">R$${fmt(monthTotal(m))}</span>
        <div class="month-actions" onclick="event.stopPropagation()">
          <button title="Editar mês" onclick="openEditMonth('${m.key}')"
            style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 4px;border-radius:3px;transition:color .15s"
            onmouseover="this.style.color='var(--accent)'"
            onmouseout="this.style.color='var(--text3)'">✎</button>
          <button title="Excluir mês" onclick="confirmDeleteMonth('${m.key}')"
            style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 4px;border-radius:3px;transition:color .15s"
            onmouseover="this.style.color='var(--red)'"
            onmouseout="this.style.color='var(--text3)'">🗑</button>
        </div>
      </div>
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

// ── EDITAR MÊS ──
function openEditMonth(key) {
  const m = S.months.find(x => x.key === key);
  if (!m) return;

  // Preenche o modal com os dados atuais
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('editMSel').value = m.label;
  document.getElementById('editMYear').value = m.year;
  document.getElementById('editMGoal').value = m.goal || '';
  document.getElementById('editMKey').value = key;
  openModal('mEditMonth');
}

async function saveEditMonth() {
  const oldKey = document.getElementById('editMKey').value;
  const newLabel = document.getElementById('editMSel').value;
  const newYear = document.getElementById('editMYear').value;
  const newGoal = parseFloat(document.getElementById('editMGoal').value) || null;
  const newKey = newLabel + '/' + newYear;

  const m = S.months.find(x => x.key === oldKey);
  if (!m) return;

  // Se a chave mudou, verifica conflito
  if (newKey !== oldKey && S.months.find(x => x.key === newKey)) {
    alert('Já existe um mês com esse nome/ano.');
    return;
  }

  setSyncing(true);

  // Atualiza o objeto local
  m.label = newLabel;
  m.year = newYear;
  m.goal = newGoal;

  if (newKey !== oldKey) {
    // Precisa recriar com nova key no Supabase
    m.key = newKey;

    // Deleta o antigo e salva o novo
    await sb.from('months').delete().eq('user_id', currentUser.id).eq('key', oldKey);
    await dbSaveMonth(m);

    // Atualiza bancos e transações com a nova key
    await sb.from('banks').update({ month_key: newKey }).eq('user_id', currentUser.id).eq('month_key', oldKey);
    await sb.from('transacoes').update({ month_key: newKey }).eq('user_id', currentUser.id).eq('month_key', oldKey);
    await sb.from('pix_entries').update({ month_key: newKey }).eq('user_id', currentUser.id).eq('month_key', oldKey);
    await sb.from('recurrents').update({ month_key: newKey }).eq('user_id', currentUser.id).eq('month_key', oldKey);
    await sb.from('incomes').update({ month_key: newKey }).eq('user_id', currentUser.id).eq('month_key', oldKey);

    // Atualiza state local
    if (S.pixEntries[oldKey]) { S.pixEntries[newKey] = S.pixEntries[oldKey]; delete S.pixEntries[oldKey]; }
    if (S.recurrents[oldKey]) { S.recurrents[newKey] = S.recurrents[oldKey]; delete S.recurrents[oldKey]; }
    if (S.incomes[oldKey]) { S.incomes[newKey] = S.incomes[oldKey]; delete S.incomes[oldKey]; }

    if (S.currentMonth === oldKey) S.currentMonth = newKey;
  } else {
    // Só atualiza meta/label sem mudar key
    await dbSaveMonth(m);
  }

  setSyncing(false);
  renderMonthList();
  if (S.currentMonth === newKey) selectMonth(newKey, true);
  closeModal('mEditMonth');
}

// ── EXCLUIR MÊS ──
function confirmDeleteMonth(key) {
  const m = S.months.find(x => x.key === key);
  if (!m) return;
  const total = monthTotal(m);
  document.getElementById('deleteMonthLabel').textContent = `${m.label} ${m.year}`;
  document.getElementById('deleteMonthTotal').textContent = `R$ ${fmt(total)} em lançamentos`;
  document.getElementById('deleteMonthKey').value = key;
  openModal('mDeleteMonth');
}

async function executeDeleteMonth() {
  const key = document.getElementById('deleteMonthKey').value;
  const m = S.months.find(x => x.key === key);
  if (!m) return;

  setSyncing(true);

  // Deleta tudo no Supabase relacionado a esse mês
  await sb.from('transacoes').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('banks').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('pix_entries').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('recurrents').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('incomes').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('months').delete().eq('user_id', currentUser.id).eq('key', key);

  // Remove do state local
  S.months = S.months.filter(x => x.key !== key);
  delete S.pixEntries[key];
  delete S.recurrents[key];
  delete S.incomes[key];

  // Se era o mês selecionado, limpa seleção
  if (S.currentMonth === key) {
    S.currentMonth = S.months.length ? S.months[S.months.length - 1].key : null;
    document.getElementById('tbTitle').textContent = 'Selecione um mês';
    document.getElementById('tbSub').textContent = 'nenhum mês selecionado';
    document.getElementById('tbActions').innerHTML = '';
    document.getElementById('dashContent').innerHTML = '<div class="empty">selecione ou crie um mês<br>para começar</div>';
  }

  setSyncing(false);
  renderMonthList();
  closeModal('mDeleteMonth');

  if (S.currentMonth) selectMonth(S.currentMonth, true);
}