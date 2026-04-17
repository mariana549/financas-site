// ══════════════════════════════════════════════════
// BANKS.JS — CRUD de Bancos
// ══════════════════════════════════════════════════

function pickColor(el) {
  el.closest('.color-grid').querySelectorAll('.color-dot').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  S.pickedColor = el.dataset.c;
}

function buildColorGrid(targetId = 'colorGrid') {
  const g = document.getElementById(targetId);
  if (!g) return;
  g.innerHTML = Object.entries(PALETTE).map(([k, v]) => `
    <div class="color-dot ${S.pickedColor === k ? 'sel' : ''}"
      style="background:${v}"
      data-c="${k}"
      onclick="pickColor(this)"
      title="${k}">
    </div>`).join('');
}

async function addBank() {
  const name = document.getElementById('bName').value.trim();
  if (!name) return;
  const m = getMonth();
  if (m.banks.find(b => b.name.toLowerCase() === name.toLowerCase())) { alert('Já existe.'); return; }
  const bank = { name, color: S.pickedColor, entries: [] };
  m.banks.push(bank);
  setSyncing(true);
  await dbSaveBank(m.key, bank);
  setSyncing(false);
  S.currentBank = name;
  renderDash();
  buildActions();
  closeModal('mBank');
  document.getElementById('bName').value = '';
  showToast('✓ Banco criado');
}

function selectBank(n) {
  S.currentBank = n;
  save();
  renderDash();
}

// ══════════════════════════════════════════════════
// BANCOS GLOBAIS
// ══════════════════════════════════════════════════

function openGlobalBankM() {
  S.pickedColor = 'azure';
  buildColorGrid('gbColorGrid');
  document.getElementById('gbName').value = '';
  openModal('mGlobalBank');
}

async function addGlobalBank() {
  const name = document.getElementById('gbName').value.trim();
  if (!name) return;
  if (S.globalBanks.find(b => b.name.toLowerCase() === name.toLowerCase())) { showToast('Banco já existe', 'error'); return; }
  const gb = {
    id: 'gb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name, color: S.pickedColor || 'azure'
  };
  S.globalBanks.push(gb);
  setSyncing(true);
  await dbSaveGlobalBank(gb);
  setSyncing(false);
  closeModal('mGlobalBank');
  showToast('✓ Banco adicionado');
  renderBanksView();
}

async function deleteGlobalBank(id) {
  if (!confirm('Remover da lista global? Os lançamentos existentes não serão apagados.')) return;
  S.globalBanks = S.globalBanks.filter(b => b.id !== id);
  if (S._selectedBankId === id) S._selectedBankId = null;
  setSyncing(true);
  await dbDeleteGlobalBank(id);
  setSyncing(false);
  showToast('Banco removido');
  renderBanksView();
}

function selectBankStat(id) {
  S._selectedBankId = S._selectedBankId === id ? null : id;
  if (S._selectedBankId) {
    S._bankStatsYear = S._bankStatsYear || String(new Date().getFullYear());
  }
  renderBanksView();
}

function renderBanksView() {
  const el = document.getElementById('banksContent');
  if (!el) return;

  if (S.globalBanks.length === 0) {
    el.innerHTML = `
      <div class="empty" style="padding:48px 0">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:12px;color:var(--text3)">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px">Nenhum banco cadastrado</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Adicione seus bancos e cartões</div>
        <button class="btn btn-primary btn-sm" onclick="openGlobalBankM()">+ Adicionar banco</button>
      </div>`;
    return;
  }

  const infoText = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.5">
    ℹ️ Bancos cadastrados aqui aparecem automaticamente em <strong>novos meses</strong>. Para adicionar um banco em um mês já criado, selecione o mês e use <strong>+ Banco</strong> na aba Gastos.
  </div>`;

  const selId = S._selectedBankId;
  const cards = S.globalBanks.map(gb => {
    const col = PALETTE[gb.color] || gb.color || '#4d9fff';
    const active = gb.id === selId;
    return `<div class="bank-global-card ${active ? 'bgc-active' : ''}" onclick="selectBankStat('${gb.id}')">
      <div class="bgc-dot" style="background:${col}"></div>
      <div class="bgc-name">${gb.name}</div>
      <button class="btn btn-ghost btn-sm bgc-del" onclick="event.stopPropagation();deleteGlobalBank('${gb.id}')">✕</button>
    </div>`;
  }).join('');

  const stats = selId ? buildBankStats(selId) : '';

  el.innerHTML = `
    ${infoText}
    <div class="bgc-list">
      ${cards}
      <div class="bank-global-card bgc-add" onclick="openGlobalBankM()">
        <span style="font-size:20px;color:var(--text3);line-height:1">+</span>
        <span style="color:var(--text3);font-size:12px">Novo banco</span>
      </div>
    </div>
    ${stats}`;
}

function buildBankStats(bankId) {
  const gb = S.globalBanks.find(b => b.id === bankId);
  if (!gb) return '';

  const year = S._bankStatsYear || String(new Date().getFullYear());
  const col = PALETTE[gb.color] || gb.color || '#4d9fff';
  const yearMonths = S.months.filter(m => String(m.year) === String(year));

  let totalYear = 0, myGastos = 0, othGastos = 0;
  const monthData = [];

  for (const m of yearMonths) {
    const bk = m.banks.find(b => b.name === gb.name);
    let mTotal = 0, mMine = 0, mOther = 0;
    if (bk) {
      for (const e of bk.entries) {
        if (e.owner === 'other') {
          mOther += e.amount; othGastos += e.amount;
        } else if (e.owner === 'split') {
          const cnt = (e.splitPeople?.length || 1) + 1;
          const mine = e.amount / cnt;
          mMine += mine; mOther += e.amount - mine;
          myGastos += mine; othGastos += e.amount - mine;
        } else {
          mMine += e.amount; myGastos += e.amount;
        }
        mTotal += e.amount; totalYear += e.amount;
      }
    }
    monthData.push({ label: m.label, total: mTotal, mine: mMine, other: mOther });
  }

  // Entradas (incomes) do ano — não filtradas por banco (income não tem campo bank)
  let myInc = 0, othInc = 0;
  for (const m of yearMonths) {
    for (const i of (S.incomes[m.key] || [])) {
      if (i.owner === 'other') othInc += i.amount;
      else myInc += i.amount;
    }
  }

  // Seletor de ano
  const years = [...new Set(S.months.map(m => String(m.year)))].sort().reverse();
  const yearSel = years.length > 1 ? `
    <select class="modal-input" style="width:auto;padding:4px 8px;font-size:12px"
      onchange="S._bankStatsYear=this.value;renderBanksView()">
      ${years.map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}
    </select>` : `<span style="font-family:var(--mono);font-size:12px;color:var(--text2)">${year}</span>`;

  // Barras mês a mês
  const maxAmt = Math.max(...monthData.map(m => m.total), 1);
  const bars = monthData.length ? monthData.map(md => {
    const pct = Math.round((md.total / maxAmt) * 100);
    return `<div class="bbc-row">
      <span class="bbc-label">${md.label.slice(0, 3)}</span>
      <div class="bbc-bar-wrap"><div class="bbc-bar" style="width:${pct}%;background:${col}"></div></div>
      <span class="bbc-val">${md.total > 0 ? 'R$ ' + fmt(md.total) : '—'}</span>
    </div>`;
  }).join('') : `<div style="color:var(--text3);font-size:13px;padding:8px 0">Nenhum dado para este ano</div>`;

  return `
    <div class="tbl-block" style="margin-top:20px">
      <div class="tbl-head">
        <span class="tbl-title" style="color:${col};font-size:13px">${gb.name}</span>
        ${yearSel}
      </div>
      <div style="padding:16px 18px">
        <div class="summary-grid" style="margin-bottom:20px">
          <div class="card"><div class="card-lbl">Total ${year}</div><div class="card-val">R$ ${fmt(totalYear)}</div></div>
          <div class="card"><div class="card-lbl">Meus gastos</div><div class="card-val a">R$ ${fmt(myGastos)}</div></div>
          <div class="card"><div class="card-lbl">Gastos terceiros</div><div class="card-val o">R$ ${fmt(othGastos)}</div></div>
          <div class="card"><div class="card-lbl">Entradas minhas¹</div><div class="card-val" style="color:var(--green)">R$ ${fmt(myInc)}</div></div>
          <div class="card"><div class="card-lbl">Entradas terceiros¹</div><div class="card-val" style="color:var(--green)">R$ ${fmt(othInc)}</div></div>
        </div>
        <div class="card-lbl" style="margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Mês a mês — ${year}</div>
        <div class="bank-bar-chart">${bars}</div>
        ${myInc + othInc > 0 ? `<div style="font-size:10px;color:var(--text3);margin-top:12px;font-family:var(--mono)">¹ Total de entradas do ano (todos os bancos)</div>` : ''}
      </div>
    </div>`;
}

async function deleteBank(name) {
  if (!confirm(`Excluir o banco "${name}" e todos os seus lançamentos?`)) return;

  const m = getMonth();
  if (!m) return;

  const bank = m.banks.find(b => b.name === name);
  if (!bank) return;

  setSyncing(true);

  // Deleta todas as entradas do banco no Supabase
  for (const e of bank.entries) {
    await dbDeleteEntry(e.id);
  }

  // Deleta o banco no Supabase
  await sb.from('banks')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('month_key', m.key)
    .eq('name', name);

  // Atualiza estado local
  m.banks = m.banks.filter(b => b.name !== name);

  // Reseta currentBank se era o banco deletado
  if (S.currentBank === name) {
    S.currentBank = m.banks.length ? m.banks[0].name : null;
  }

  setSyncing(false);
  renderDash();
  buildActions();
  showToast('Banco excluído');
}