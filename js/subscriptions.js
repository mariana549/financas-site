// ══════════════════════════════════════════════════
// SUBSCRIPTIONS.JS — Assinaturas
// ══════════════════════════════════════════════════

function openSubM(editId = null) {
  clr('sName', 'sAmt', 'sBank', 'sDay', 'sStart', 'sEnd');
  document.getElementById('sCycle').value = 'mensal';
  document.getElementById('editSubId').value = '';
  const subTitleEl = document.getElementById('subTitle');
  if (subTitleEl) subTitleEl.firstChild.textContent = 'Nova Assinatura ';

  if (editId) {
    const s = (S.subscriptions || []).find(x => String(x.id) === String(editId));
    if (s) {
      document.getElementById('editSubId').value = editId;
      if (subTitleEl) subTitleEl.firstChild.textContent = 'Editar Assinatura ';
      document.getElementById('sName').value = s.name || '';
      document.getElementById('sAmt').value = s.amount || '';
      document.getElementById('sCycle').value = s.cycle || 'mensal';
      document.getElementById('sBank').value = s.bank || '';
      document.getElementById('sDay').value = s.day || '';
      document.getElementById('sStart').value = s.startDate || '';
      document.getElementById('sEnd').value = s.endDate || '';
    }
  }
  openModal('mSub');
}

async function saveSub() {
  const name = document.getElementById('sName').value.trim();
  const amt = parseFloat(document.getElementById('sAmt').value);
  const cycle = document.getElementById('sCycle').value;
  const bank = document.getElementById('sBank').value.trim();
  const day = document.getElementById('sDay').value;
  const startDate = document.getElementById('sStart').value;
  const endDate = document.getElementById('sEnd').value;
  const editId = document.getElementById('editSubId').value;

  if (!name || isNaN(amt) || amt <= 0) { alert('Preencha nome e valor.'); return; }
  if (!startDate) { alert('Informe a data de início.'); return; }
  if (!S.subscriptions) S.subscriptions = [];
  if (editId) {
    S.subscriptions = S.subscriptions.filter(s => String(s.id) !== String(editId));
    await dbDeleteSub(editId);
  }
  const sub = {
    id: editId || Date.now(),
    name, amount: amt, cycle, bank, day,
    startDate, endDate: endDate || null
  };
  S.subscriptions.push(sub);
  setSyncing(true);
  await dbSaveSub(sub);
  setSyncing(false);
  renderSubs();
  closeModal('mSub');
}

async function deleteSub(id) {
  if (!confirm('Excluir assinatura?')) return;
  S.subscriptions = S.subscriptions.filter(s => String(s.id) !== String(id));
  setSyncing(true);
  await dbDeleteSub(id);
  setSyncing(false);
  renderSubs();
}

function renderSubs() {
  const el = document.getElementById('subsContent');
  if (!el) return;

  if (!S.subscriptions || !S.subscriptions.length) {
    el.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-primary btn-sm" onclick="openSubM()">+ Assinatura</button>
      </div>
      <div class="empty">nenhuma assinatura cadastrada</div>`;
    return;
  }

  const active = S.subscriptions.filter(s => !s.endDate);
  const cancelled = S.subscriptions.filter(s => s.endDate);
  const mensal = active.filter(s => s.cycle === 'mensal').reduce((t, s) => t + s.amount, 0);

  const byBank = {};
  const noBank = [];
  active.forEach(s => {
    if (s.bank) {
      if (!byBank[s.bank]) byBank[s.bank] = [];
      byBank[s.bank].push(s);
    } else {
      noBank.push(s);
    }
  });

  const card = s => `
    <div class="scard">
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:3px">
        <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s"
          onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text3)'"
          onclick="openSubM(${s.id})">✎</button>
        <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s"
          onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'"
          onclick="deleteSub(${s.id})">×</button>
      </div>
      <div class="scard-name">${s.name}</div>
      <div class="scard-amt">R$ ${fmt(s.amount)}</div>
      <div class="scard-det">
        ${s.cycle}${s.day ? ' · dia ' + s.day : ''}${s.bank ? ' · ' + s.bank : ''}
        ${s.startDate ? ' · desde ' + s.startDate.replace('-', '/') : ''}
      </div>
    </div>`;

  let html = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" onclick="openSubM()">+ Assinatura</button>
    </div>
    <div class="summary-grid" style="margin-bottom:22px">
      <div class="card">
        <div class="card-lbl">Total Mensal</div>
        <div class="card-val a">R$ ${fmt(mensal)}</div>
        <div class="card-sub">${active.filter(s => s.cycle === 'mensal').length} ativa(s)</div>
      </div>
      <div class="card">
        <div class="card-lbl">Projeção Anual</div>
        <div class="card-val">R$ ${fmt(mensal * 12)}</div>
      </div>
      ${cancelled.length ? `
      <div class="card">
        <div class="card-lbl">Canceladas</div>
        <div class="card-val" style="color:var(--text3)">${cancelled.length}</div>
      </div>` : ''}
    </div>`;

  Object.entries(byBank).forEach(([bank, subs]) => {
    const bt = subs.filter(s => s.cycle === 'mensal').reduce((t, s) => t + s.amount, 0);
    html += `
      <div style="margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="sec-title">${bank}</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--text3)">R$ ${fmt(bt)}/mês</div>
        </div>
        <div class="sub-grid">${subs.map(card).join('')}</div>
      </div>`;
  });

  if (noBank.length) {
    html += `
      <div style="margin-bottom:18px">
        <div class="sec-title" style="margin-bottom:10px">Sem banco</div>
        <div class="sub-grid">${noBank.map(card).join('')}</div>
      </div>`;
  }

  if (cancelled.length) {
    html += `
      <div class="divider"></div>
      <div class="sec-title" style="margin-bottom:10px;color:var(--text3)">Canceladas</div>
      <div class="sub-grid">
        ${cancelled.map(s => `
        <div class="scard" style="opacity:.45">
          <div style="position:absolute;top:8px;right:8px">
            <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px"
              onclick="deleteSub(${s.id})">×</button>
          </div>
          <div class="scard-name" style="text-decoration:line-through">${s.name}</div>
          <div class="scard-amt" style="color:var(--text3)">R$ ${fmt(s.amount)}</div>
          <div class="scard-det">cancelada ${s.endDate.replace('-', '/')}</div>
        </div>`).join('')}
      </div>`;
  }

  el.innerHTML = html;
}