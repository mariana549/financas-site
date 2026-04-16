// ══════════════════════════════════════════════════
// SUBSCRIPTIONS.JS — Assinaturas
// ══════════════════════════════════════════════════

// ── Calcula a parte do dono da assinatura (minha parcela mensal) ──
function calcMySubPart(s) {
  const owner = s.owner || 'mine';
  if (owner === 'mine') return s.amount;
  if (owner === 'other') return 0;
  // split
  const count = (s.splitPeople || []).length + 1;
  if (s.splitValues && s.splitValues.length) {
    return s.amount - s.splitValues.reduce((a, v) => a + (v || 0), 0);
  }
  return s.amount / count;
}

function setSubOwner(o) {
  S.subOwner = o;
  document.getElementById('sOwnerMine').classList.toggle('active', o === 'mine');
  document.getElementById('sOwnerOther').classList.toggle('active', o === 'other');
  document.getElementById('sOwnerSplit').classList.toggle('active', o === 'split');
  document.getElementById('sOtherGroup').style.display = o === 'other' ? 'block' : 'none';
  document.getElementById('sSplitGroup').style.display = o === 'split' ? 'block' : 'none';
  if (o === 'split') {
    if (!S.subSplitPeople || !S.subSplitPeople.length) S.subSplitPeople = [''];
    renderSubSplitUI();
  }
  updateSubSplitHint();
}

function setSubSplitType(t) {
  S.subSplitType = t;
  document.getElementById('sSplitEqual').classList.toggle('active', t === 'equal');
  document.getElementById('sSplitFixed').classList.toggle('active', t === 'fixed');
  renderSubSplitUI();
  updateSubSplitHint();
}

function addSubSplitPerson() {
  if (!S.subSplitPeople) S.subSplitPeople = [];
  S.subSplitPeople.push('');
  renderSubSplitUI();
  updateSubSplitHint();
}

function renderSubSplitUI() {
  const wrap = document.getElementById('sSplitPeopleWrap');
  const fixedWrap = document.getElementById('sFixedValuesWrap');
  if (!wrap) return;
  const people = S.subSplitPeople || [''];
  const known = getAllPeople();

  wrap.innerHTML = people.map((p, i) => `
    <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
      <input type="text" placeholder="Nome da pessoa ${i + 1}" value="${(p || '').replace(/"/g, '&quot;')}"
        data-sub-person-idx="${i}" style="flex:1">
      ${people.length > 1 ? `<button type="button" data-sub-person-remove="${i}"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0">×</button>` : ''}
    </div>`).join('') +
    `<button type="button" onclick="addSubSplitPerson()" class="btn btn-ghost btn-sm" style="margin-top:2px">+ Pessoa</button>` +
    (known.length ? `<div style="font-size:11px;color:var(--text3);margin-top:6px;margin-bottom:3px">Cadastradas:</div>
      <div class="chips" style="margin-bottom:4px" id="subKnownChips"></div>` : '');

  wrap.querySelectorAll('input[data-sub-person-idx]').forEach(inp => {
    const idx = parseInt(inp.dataset.subPersonIdx);
    inp.addEventListener('input', () => { S.subSplitPeople[idx] = inp.value; updateSubSplitHint(); });
  });
  wrap.querySelectorAll('button[data-sub-person-remove]').forEach(btn => {
    const idx = parseInt(btn.dataset.subPersonRemove);
    btn.addEventListener('click', () => {
      S.subSplitPeople.splice(idx, 1);
      if (S.subSplitValues) S.subSplitValues.splice(idx, 1);
      renderSubSplitUI(); updateSubSplitHint();
    });
  });
  const chipsDiv = document.getElementById('subKnownChips');
  if (chipsDiv) {
    known.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'chip'; chip.textContent = p;
      chip.addEventListener('click', () => {
        const emptyIdx = (S.subSplitPeople || []).findIndex(x => !x);
        if (emptyIdx >= 0) S.subSplitPeople[emptyIdx] = p;
        else S.subSplitPeople.push(p);
        renderSubSplitUI(); updateSubSplitHint();
      });
      chipsDiv.appendChild(chip);
    });
  }

  if (!fixedWrap) return;
  if (S.subSplitType === 'fixed') {
    fixedWrap.style.display = 'block';
    if (!S.subSplitValues) S.subSplitValues = people.map(() => 0);
    while (S.subSplitValues.length < people.length) S.subSplitValues.push(0);
    S.subSplitValues = S.subSplitValues.slice(0, people.length);
    fixedWrap.innerHTML = `<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Valor que cada pessoa paga (R$):</div>` +
      people.map((p, i) => `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span style="flex:1;font-size:13px">${p || 'Pessoa ' + (i + 1)}</span>
          <input type="number" step="0.01" placeholder="0,00" value="${S.subSplitValues[i] || ''}"
            data-sub-fixed-idx="${i}" style="width:100px">
        </div>`).join('');
    fixedWrap.querySelectorAll('input[data-sub-fixed-idx]').forEach(inp => {
      const idx = parseInt(inp.dataset.subFixedIdx);
      inp.addEventListener('input', () => {
        if (!S.subSplitValues) S.subSplitValues = [];
        S.subSplitValues[idx] = parseFloat(inp.value) || 0;
        updateSubSplitHint();
      });
    });
  } else {
    fixedWrap.style.display = 'none';
  }
}

function updateSubSplitHint() {
  const hint = document.getElementById('sSplitHint');
  if (!hint || S.subOwner !== 'split') return;
  const amt = parseFloat(document.getElementById('sAmt')?.value) || 0;
  if (amt <= 0) { hint.textContent = ''; return; }
  const people = S.subSplitPeople || [];
  const count = people.length + 1;
  if (S.subSplitType === 'fixed') {
    const vals = S.subSplitValues || [];
    const othersTotal = vals.reduce((s, v) => s + (v || 0), 0);
    const myPart = amt - othersTotal;
    hint.innerHTML = `<span style="color:var(--accent)">Eu: R$ ${fmt(myPart)}</span> · ` +
      people.map((p, i) => `<span style="color:var(--blue)">${p || 'Pessoa '+(i+1)}: R$ ${fmt(vals[i] || 0)}</span>`).join(' · ');
  } else {
    const each = amt / count;
    hint.innerHTML = `<span style="color:var(--accent)">Eu: R$ ${fmt(each)}</span> · ` +
      people.map(p => `<span style="color:var(--blue)">${p || '?'}: R$ ${fmt(each)}</span>`).join(' · ');
  }
}

function calcAnualTotal(subs) {
  return subs.reduce((t, s) => {
    if (s.cycle === 'mensal')   return t + s.amount * 12;
    if (s.cycle === 'anual')    return t + s.amount;
    if (s.cycle === 'semanal')  return t + s.amount * 52;
    return t + s.amount * 12;
  }, 0);
}

function toggleSubProjection() {
  const el = document.getElementById('subProjection');
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? 'block' : 'none';
}

function openSubM(editId = null) {
  clr('sName', 'sAmt', 'sBank', 'sDay', 'sStart', 'sEnd');
  document.getElementById('sCycle').value = 'mensal';
  document.getElementById('editSubId').value = '';
  const subTitleEl = document.getElementById('subTitle');
  if (subTitleEl) subTitleEl.firstChild.textContent = 'Nova Assinatura ';
  S.subOwner = 'mine';
  S.subSplitPeople = [''];
  S.subSplitType = 'equal';
  S.subSplitValues = null;
  setSubOwner('mine');

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
      S.subOwner = s.owner || 'mine';
      S.subSplitPeople = s.splitPeople ? [...s.splitPeople] : [''];
      S.subSplitType = (s.splitValues && s.splitValues.length) ? 'fixed' : 'equal';
      S.subSplitValues = s.splitValues ? [...s.splitValues] : null;
      setSubOwner(S.subOwner);
      if (S.subOwner === 'other' && s.splitPeople?.[0]) {
        document.getElementById('sOtherPerson').value = s.splitPeople[0];
      }
      if (S.subOwner === 'split') {
        setSubSplitType(S.subSplitType);
        renderSubSplitUI();
        updateSubSplitHint();
      }
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
  const owner = S.subOwner || 'mine';

  if (!name || isNaN(amt) || amt <= 0) { alert('Preencha nome e valor.'); return; }
  if (!startDate) { alert('Informe a data de início.'); return; }

  let splitPeople = null;
  let splitValues = null;
  if (owner === 'other') {
    const person = document.getElementById('sOtherPerson').value.trim();
    if (!person) { alert('Informe o nome da pessoa.'); return; }
    splitPeople = [person];
  } else if (owner === 'split') {
    splitPeople = (S.subSplitPeople || []).filter(Boolean);
    if (!splitPeople.length) { alert('Adicione ao menos uma pessoa para dividir.'); return; }
    if (S.subSplitType === 'fixed') {
      splitValues = (S.subSplitValues || splitPeople.map(() => 0)).slice(0, splitPeople.length);
    }
  }

  if (!S.subscriptions) S.subscriptions = [];
  if (editId) {
    S.subscriptions = S.subscriptions.filter(s => String(s.id) !== String(editId));
    await dbDeleteSub(editId);
  }
  const sub = {
    id: editId || Date.now(),
    name, amount: amt, cycle, bank, day,
    startDate, endDate: endDate || null,
    owner, splitPeople, splitValues
  };
  S.subscriptions.push(sub);
  setSyncing(true);
  await dbSaveSub(sub);
  setSyncing(false);
  renderSubs();
  closeModal('mSub');
  showToast('✓ Assinatura salva');
}

async function deleteSub(id) {
  if (!confirm('Excluir assinatura?')) return;
  S.subscriptions = S.subscriptions.filter(s => String(s.id) !== String(id));
  setSyncing(true);
  await dbDeleteSub(id);
  setSyncing(false);
  renderSubs();
  showToast('Assinatura excluída');
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
  const mensal = active.filter(s => s.cycle === 'mensal').reduce((t, s) => t + calcMySubPart(s), 0);

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

  const card = s => {
    const owner = s.owner || 'mine';
    const myPart = calcMySubPart(s);
    const ownerBadge = owner === 'other'
      ? `<span class="bm bm-other" style="font-size:10px;margin-left:4px">${(s.splitPeople || ['?'])[0]}</span>`
      : owner === 'split'
        ? `<span class="bm bm-split" style="font-size:10px;margin-left:4px">÷${(s.splitPeople || []).length + 1}</span>`
        : '';
    const myPartLabel = owner !== 'mine'
      ? `<div style="font-size:10px;color:var(--accent);font-family:var(--mono);margin-top:2px">meu: R$ ${fmt(myPart)}</div>`
      : '';
    return `
    <div class="scard">
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:3px">
        <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s"
          onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text3)'"
          onclick="openSubM(${s.id})">✎</button>
        <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s"
          onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'"
          onclick="deleteSub(${s.id})">×</button>
      </div>
      <div class="scard-name">${s.name}${ownerBadge}</div>
      <div class="scard-amt">R$ ${fmt(s.amount)}</div>
      ${myPartLabel}
      <div class="scard-det">
        ${s.cycle}${s.day ? ' · dia ' + s.day : ''}${s.bank ? ' · ' + s.bank : ''}
        ${s.startDate ? ' · desde ' + s.startDate.replace('-', '/') : ''}
      </div>
    </div>`;
  };

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
      <div class="card card-link" onclick="toggleSubProjection()" title="Ver detalhes por serviço">
        <div class="card-lbl">Projeção Anual ↗</div>
        <div class="card-val">R$ ${fmt(calcAnualTotal(active))}</div>
        <div class="card-sub">clique para detalhar</div>
      </div>
      ${cancelled.length ? `
      <div class="card">
        <div class="card-lbl">Canceladas</div>
        <div class="card-val" style="color:var(--text3)">${cancelled.length}</div>
      </div>` : ''}
    </div>`;

  // ── Projeção Anual Detalhada ──
  const projList = [...active]
    .map(s => {
      const anual = s.cycle === 'anual' ? s.amount : s.cycle === 'semanal' ? s.amount * 52 : s.amount * 12;
      const mensal_val = s.cycle === 'anual' ? s.amount / 12 : s.cycle === 'semanal' ? s.amount * 52 / 12 : s.amount;
      return { ...s, anual, mensal_val };
    })
    .sort((a, b) => b.anual - a.anual);
  const maxProj = Math.max(...projList.map(s => s.anual), 1);

  html += `
    <div id="subProjection" style="display:none;margin-bottom:24px">
      <div class="sec-title" style="margin-bottom:12px">Projeção por Serviço (12 meses)</div>
      <div class="tbl-block">
        <table>
          <thead><tr><th>Serviço</th><th>Ciclo</th><th style="text-align:right">Mensal</th><th style="text-align:right">Anual</th></tr></thead>
          <tbody>
            ${projList.map(s => `
              <tr>
                <td>
                  ${s.name}
                  <div style="margin-top:4px;height:4px;border-radius:2px;background:var(--bg4);overflow:hidden">
                    <div style="height:100%;width:${(s.anual / maxProj * 100).toFixed(1)}%;background:var(--accent);border-radius:2px"></div>
                  </div>
                </td>
                <td><span class="bm bm-cat">${s.cycle}</span></td>
                <td style="text-align:right;font-family:var(--mono);font-size:12px;color:var(--text2)">R$ ${fmt(s.mensal_val)}</td>
                <td style="text-align:right;font-family:var(--mono);font-size:13px;color:var(--accent)">R$ ${fmt(s.anual)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="foot-row">
          <div class="foot-grp"><span class="foot-lbl">Total Anual</span><span class="foot-amt" style="color:var(--accent)">R$ ${fmt(calcAnualTotal(active))}</span></div>
          <div class="foot-grp"><span class="foot-lbl">Média Mensal</span><span class="foot-amt">R$ ${fmt(calcAnualTotal(active) / 12)}</span></div>
        </div>
      </div>
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