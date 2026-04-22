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
  S._editSubId = null;
  setSubOwner('mine');

  const histSection = document.getElementById('sHistorySection');
  if (histSection) histSection.style.display = 'none';

  if (editId) {
    const s = (S.subscriptions || []).find(x => String(x.id) === String(editId));
    if (s) {
      document.getElementById('editSubId').value = String(s.id);
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
      // Histórico de preço
      S._editSubId = String(s.id);
      if (histSection) histSection.style.display = 'block';
      closeReajusteForm();
      _renderSubHistoryInModal(s);
    }
  }
  openModal('mSub');
}

// ── Helpers de histórico de preço ──
function _getEffectiveHistory(s) {
  if (s.priceHistory && s.priceHistory.length) return s.priceHistory;
  if (s.startDate) return [{ amount: s.amount, from: s.startDate, note: 'Valor inicial' }];
  return [{ amount: s.amount, from: '', note: 'Valor inicial' }];
}

function _renderSubHistoryInModal(s) {
  const el = document.getElementById('sHistoryList');
  if (!el) return;
  const h = _getEffectiveHistory(s);
  if (h.length <= 1) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:4px 0">Nenhum reajuste registrado ainda.</div>`;
    return;
  }
  el.innerHTML = h.map((entry, i) => {
    const isLast = i === h.length - 1;
    const pct = i > 0 ? ((entry.amount - h[i - 1].amount) / h[i - 1].amount * 100).toFixed(1) : null;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;${isLast ? '' : 'border-bottom:1px solid var(--border)'}">
      <div style="flex:1">
        <span style="font-size:13px;font-family:var(--mono);${isLast ? 'color:var(--accent);font-weight:600' : 'color:var(--text2)'}">R$&nbsp;${fmt(entry.amount)}</span>
        ${entry.note ? `<span style="font-size:11px;color:var(--text3);margin-left:6px">${entry.note}</span>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">${(entry.from || '').replace('-', '/')}</div>
        <div style="font-size:11px;color:${pct ? 'var(--orange)' : 'var(--text3)'}">
          ${pct ? '↑ +' + pct + '%' : 'inicial'}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openReajusteForm() {
  document.getElementById('sReajusteForm').style.display = 'block';
  document.getElementById('sReajusteBtn').style.display = 'none';
  document.getElementById('sReajusteAmt').value = '';
  document.getElementById('sReajusteDate').value = '';
  document.getElementById('sReajusteNote').value = '';
}

function closeReajusteForm() {
  const form = document.getElementById('sReajusteForm');
  const btn  = document.getElementById('sReajusteBtn');
  if (form) form.style.display = 'none';
  if (btn)  btn.style.display  = 'inline-flex';
}

async function confirmReajuste() {
  const newAmt = parseFloat(document.getElementById('sReajusteAmt').value);
  const date   = document.getElementById('sReajusteDate').value;
  const note   = document.getElementById('sReajusteNote').value.trim();

  if (isNaN(newAmt) || newAmt <= 0) { alert('Informe o novo valor.'); return; }
  if (!date) { alert('Informe o mês do reajuste.'); return; }

  const sub = (S.subscriptions || []).find(s => String(s.id) === String(S._editSubId));
  if (!sub) return;

  if (!sub.priceHistory || !sub.priceHistory.length) {
    sub.priceHistory = [{ amount: sub.amount, from: sub.startDate || '', note: 'Valor inicial' }];
  }
  sub.priceHistory.push({ amount: newAmt, from: date, note });
  sub.amount = newAmt;

  // Atualiza campo de valor no modal
  const amtEl = document.getElementById('sAmt');
  if (amtEl) amtEl.value = newAmt;

  setSyncing(true);
  await dbSaveSub(sub);
  setSyncing(false);

  closeReajusteForm();
  _renderSubHistoryInModal(sub);
  renderSubs();
  showToast('✓ Reajuste registrado');
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
    const person = normalizeName(document.getElementById('sOtherPerson').value);
    if (!person) { alert('Informe o nome da pessoa.'); return; }
    splitPeople = [person];
  } else if (owner === 'split') {
    splitPeople = (S.subSplitPeople || []).filter(Boolean).map(normalizeName);
    if (!splitPeople.length) { alert('Adicione ao menos uma pessoa para dividir.'); return; }
    if (S.subSplitType === 'fixed') {
      splitValues = (S.subSplitValues || splitPeople.map(() => 0)).slice(0, splitPeople.length);
    }
  }

  if (!S.subscriptions) S.subscriptions = [];

  let priceHistory = null;
  if (editId) {
    const existing = S.subscriptions.find(s => String(s.id) === String(editId));
    if (existing) priceHistory = existing.priceHistory || null;
    S.subscriptions = S.subscriptions.filter(s => String(s.id) !== String(editId));
    await dbDeleteSub(editId);
  } else {
    priceHistory = [{ amount: amt, from: startDate, note: 'Valor inicial' }];
  }

  const sub = {
    id: editId ? String(editId) : String(Date.now()),
    name, amount: amt, cycle, bank, day,
    startDate, endDate: endDate || null,
    owner, splitPeople, splitValues, priceHistory
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

function toggleSubEvolution(id) {
  const el  = document.getElementById('subEvo_' + id);
  const btn = document.getElementById('subEvoBtn_' + id);
  if (!el) return;
  const showing = el.style.display !== 'none';
  el.style.display  = showing ? 'none' : 'block';
  if (btn) btn.textContent = showing ? '📈 ver evolução' : '📈 ocultar';
}

function _buildSparkline(history) {
  if (!history || history.length < 2) return '';
  const W = 240, H = 52, PAD = 8;
  const now = Date.now();
  const pts = history.map(h => ({
    t: new Date(((h.from || '2000-01') + '-01')).getTime(),
    y: h.amount
  }));
  pts.push({ t: now, y: pts[pts.length - 1].y });

  const minT = pts[0].t, maxT = now;
  const amts = history.map(h => h.amount);
  const minY = Math.min(...amts) * 0.88;
  const maxY = Math.max(...amts) * 1.08;
  const rangeY = maxY - minY || 1;
  const rangeT = maxT - minT || 1;

  const px = t => (PAD + ((t - minT) / rangeT) * (W - PAD * 2)).toFixed(1);
  const py = y => ((H - PAD) - ((y - minY) / rangeY) * (H - PAD * 2)).toFixed(1);

  let d = `M ${px(pts[0].t)} ${py(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` H ${px(pts[i].t)} V ${py(pts[i].y)}`;
  }
  const fillD = d + ` V ${H - PAD} H ${px(pts[0].t)} Z`;

  const dots = history.map(h => {
    const x = px(new Date(((h.from || '2000-01') + '-01')).getTime());
    const y = py(h.amount);
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--accent)" stroke="var(--bg2)" stroke-width="1.5"/>`;
  }).join('');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible;margin-bottom:8px">
    <path d="${fillD}" fill="var(--accent)" opacity="0.08"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
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
    const history = _getEffectiveHistory(s);
    const hasHistory = history.length > 1;
    const initialAmt = history[0].amount;
    const totalPct = hasHistory
      ? ((s.amount - initialAmt) / initialAmt * 100).toFixed(0)
      : null;

    const ownerBadge = owner === 'other'
      ? `<span class="bm bm-other" style="font-size:10px;margin-left:4px">${(s.splitPeople || ['?'])[0]}</span>`
      : owner === 'split'
        ? `<span class="bm bm-split" style="font-size:10px;margin-left:4px">÷${(s.splitPeople || []).length + 1}</span>`
        : '';
    const reajusteBadge = hasHistory
      ? `<span class="bm" style="font-size:10px;margin-left:4px;background:rgba(251,146,60,.15);color:var(--orange)">↑ +${totalPct}%</span>`
      : '';
    const myPartLabel = owner !== 'mine'
      ? `<div style="font-size:10px;color:var(--accent);font-family:var(--mono);margin-top:2px">meu: R$&nbsp;${fmt(myPart)}</div>`
      : '';

    const evoSection = hasHistory ? `
      <div id="subEvo_${s.id}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        ${_buildSparkline(history)}
        ${history.map((h, i) => {
          const isLast = i === history.length - 1;
          const pct = i > 0
            ? ((h.amount - history[i - 1].amount) / history[i - 1].amount * 100).toFixed(1)
            : null;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;${isLast ? '' : 'border-bottom:1px solid var(--border)'}">
            <div>
              <span style="font-family:var(--mono);font-size:12px;${isLast ? 'color:var(--accent);font-weight:600' : 'color:var(--text2)'}">R$&nbsp;${fmt(h.amount)}</span>
              ${h.note ? `<span style="font-size:10px;color:var(--text3);margin-left:5px">${h.note}</span>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text3);font-family:var(--mono)">${(h.from || '').replace('-', '/')}</div>
              <div style="font-size:10px;color:${isLast ? 'var(--accent)' : pct ? 'var(--orange)' : 'var(--text3)'}">
                ${isLast ? 'atual' : pct ? '↑ +' + pct + '%' : 'inicial'}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <button id="subEvoBtn_${s.id}" onclick="event.stopPropagation();toggleSubEvolution('${s.id}')"
        style="background:none;border:none;color:var(--text3);font-size:11px;cursor:pointer;padding:6px 0 0;width:100%;text-align:left">
        📈 ver evolução
      </button>` : '';

    return `
    <div class="scard">
      <div style="position:absolute;top:8px;right:8px;display:flex;gap:3px">
        <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s"
          onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text3)'"
          onclick="openSubM('${s.id}')">✎</button>
        <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:color .15s"
          onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'"
          onclick="deleteSub('${s.id}')">×</button>
      </div>
      <div class="scard-name">${s.name}${ownerBadge}${reajusteBadge}</div>
      <div class="scard-amt">R$&nbsp;${fmt(s.amount)}</div>
      ${myPartLabel}
      <div class="scard-det">
        ${s.cycle}${s.day ? ' · dia ' + s.day : ''}${s.bank ? ' · ' + s.bank : ''}
        ${s.startDate ? ' · desde ' + s.startDate.replace('-', '/') : ''}
      </div>
      ${evoSection}
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