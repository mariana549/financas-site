// ══════════════════════════════════════════════════
// ENTRIES.JS — CRUD de Lançamentos + Detail Modal
// ══════════════════════════════════════════════════

function openEntryM(editId = null, editBank = null) {
  const m = getMonth();
  if (!m || !m.banks.length) { alert('Adicione um banco primeiro.'); return; }
  fillSel('eBank', m.banks.map(b => b.name));
  if (S.currentBank) document.getElementById('eBank').value = S.currentBank;
  document.getElementById('editEntryId').value = '';
  document.getElementById('editBankName').value = '';
  const titleEl = document.getElementById('entryTitle');
  if (titleEl) titleEl.firstChild.textContent = editId ? 'Editar Lançamento ' : 'Novo Lançamento ';
  clr('eDesc', 'eAmt', 'ePerson', 'eCat', 'eNote');
  // Restringe data ao mês da pasta
  const _m = getMonth();
  if (_m) {
    const { min, max } = getMonthDateRange(_m);
    const dateEl = document.getElementById('eDate');
    dateEl.setAttribute('min', min);
    dateEl.setAttribute('max', max);
    const t = today();
    dateEl.value = (t >= min && t <= max) ? t : min;
  }
  document.getElementById('eInstTotal').value = '';
  document.getElementById('eInstCur').value = '1';
  S.splitPeople = [];
  S.splitCount = 2;
  S.splitCustomPct = false;
  S.splitMyPct = null;
  setEType('normal');
  setOwner('mine');
  document.querySelectorAll('#catChips .chip').forEach(c => c.classList.remove('sel'));
  renderPersonChips();
  updateInstallHint(); // ← hint inicial

  if (editId && editBank) {
    const bk = getMonth().banks.find(b => b.name === editBank);
    const en = bk?.entries.find(e => String(e.id) === String(editId));
    if (en) {
      document.getElementById('editEntryId').value = editId;
      document.getElementById('editBankName').value = editBank;
      document.getElementById('eDesc').value = en.desc;
      // Se for parcelado, mostra o valor total (parcela × total)
      document.getElementById('eAmt').value = en.type === 'installment'
        ? (en.amount * en.installTotal).toFixed(2)
        : en.amount;
      document.getElementById('eDate').value = en.date || today();
      document.getElementById('eBank').value = editBank;
      document.getElementById('eCat').value = en.category || '';
      document.getElementById('eNote').value = en.note || '';
      if (en.owner === 'split') {
        S.splitPeople = en.splitPeople || (en.person ? en.person.split(', ').filter(Boolean) : []);
        S.splitCount = S.splitPeople.length + 1 || 2;
        const expectedRatio = 1 / S.splitCount;
        const storedRatio = en.splitRatio ?? expectedRatio;
        S.splitCustomPct = Math.abs(storedRatio - expectedRatio) > 0.001;
        S.splitMyPct = S.splitCustomPct ? Math.round(storedRatio * 100) : null;
      } else {
        S.splitPeople = [];
        S.splitCount = 2;
        S.splitCustomPct = false;
        S.splitMyPct = null;
      }
      setEType(en.type || 'normal');
      setOwner(en.owner || 'mine');
      if (en.owner !== 'split' && en.person) {
        document.getElementById('ePerson').value = en.person;
      }
      if (en.installTotal) {
        document.getElementById('eInstTotal').value = en.installTotal;
        document.getElementById('eInstCur').value = en.installCurrent;
        updateInstallHint();
      }
    }
  }
  openModal('mEntry');
}

function setEType(t) {
  S.entryType = t;
  ['tNormal', 'tInstall', 'tPix', 'tDebit', 'tCash'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const map = { normal: 'tNormal', installment: 'tInstall', pix: 'tPix', debit: 'tDebit', cash: 'tCash' };
  const el = document.getElementById(map[t]);
  if (el) el.classList.add('active');
  const installGroup = document.getElementById('installGroup');
  installGroup.style.display = t === 'installment' ? 'block' : 'none';
  updateInstallHint();
}

function setOwner(o) {
  S.entryOwner = o;
  document.getElementById('tMine').classList.toggle('active', o === 'mine');
  document.getElementById('tOther').classList.toggle('active', o === 'other');
  document.getElementById('tSplit').classList.toggle('active', o === 'split');
  document.getElementById('personGroup').style.display = o === 'other' ? 'block' : 'none';
  document.getElementById('splitGroup').style.display = o === 'split' ? 'block' : 'none';
  if (o === 'split') {
    if (!S.splitPeople) S.splitPeople = [];
    if (!S.splitCount || S.splitCount < 2) S.splitCount = 2;
    while (S.splitPeople.length < S.splitCount - 1) S.splitPeople.push('');
    S.splitPeople = S.splitPeople.slice(0, S.splitCount - 1);
    document.getElementById('splitCountVal').textContent = S.splitCount;
    // Restaura estado de porcentagem personalizada
    const cb = document.getElementById('splitCustomPct');
    if (cb) cb.checked = S.splitCustomPct || false;
    const pctRow = document.getElementById('splitPctRow');
    if (pctRow) pctRow.style.display = S.splitCustomPct ? 'block' : 'none';
    if (S.splitCustomPct && S.splitMyPct) {
      const pctIn = document.getElementById('splitMyPct');
      if (pctIn) pctIn.value = S.splitMyPct;
    }
    renderSplitNamesContainer();
    updateSplitHint();
  }
}

function adjustSplitCount(delta) {
  S.splitCount = Math.max(2, (S.splitCount || 2) + delta);
  if (!S.splitPeople) S.splitPeople = [];
  while (S.splitPeople.length < S.splitCount - 1) S.splitPeople.push('');
  S.splitPeople = S.splitPeople.slice(0, S.splitCount - 1);
  document.getElementById('splitCountVal').textContent = S.splitCount;
  renderSplitNamesContainer();
  updateSplitHint();
}

function renderSplitNamesContainer() {
  const wrap = document.getElementById('splitNamesWrap');
  if (!wrap) return;
  const known = getAllPeople();
  const count = S.splitCount || 2;
  const people = S.splitPeople || [];

  const chipsHtml = known.length ? `
    <div style="font-size:11px;color:var(--text3);margin-bottom:5px">Pessoas já cadastradas — clique para preencher:</div>
    <div class="chips" style="margin-bottom:12px">${known.map(p =>
      `<div class="chip" onclick="fillSplitName('${p.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'">${p}</div>`
    ).join('')}</div>` : '';

  const fieldsHtml = Array.from({ length: count - 1 }, (_, i) => {
    const val = (people[i] || '').replace(/"/g, '&quot;');
    const clearBtn = val ? `<button type="button" onclick="clearSplitPerson(${i})"
      style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;
      color:var(--text3);cursor:pointer;font-size:16px;padding:0;line-height:1">×</button>` : '';
    return `<div class="fg" style="margin-bottom:6px;position:relative">
      <input type="text" placeholder="Nome da pessoa ${i + 1}" value="${val}"
        oninput="S.splitPeople[${i}]=this.value;updateSplitHint()"
        style="padding-right:${val ? 28 : 10}px">
      ${clearBtn}
    </div>`;
  }).join('');

  wrap.innerHTML = chipsHtml + fieldsHtml;
}

function fillSplitName(name) {
  if (!S.splitPeople) S.splitPeople = [];
  const emptyIdx = S.splitPeople.findIndex(p => !p);
  if (emptyIdx >= 0) {
    S.splitPeople[emptyIdx] = name;
  } else {
    return; // all fields already filled
  }
  renderSplitNamesContainer();
  updateSplitHint();
}

function clearSplitPerson(i) {
  if (S.splitPeople) S.splitPeople[i] = '';
  renderSplitNamesContainer();
  updateSplitHint();
}

function toggleSplitCustomPct(checked) {
  S.splitCustomPct = checked;
  if (!checked) S.splitMyPct = null;
  const pctRow = document.getElementById('splitPctRow');
  if (pctRow) pctRow.style.display = checked ? 'block' : 'none';
  if (!checked) {
    const pctIn = document.getElementById('splitMyPct');
    if (pctIn) pctIn.value = '';
  }
  updateSplitHint();
}

function updateSplitHint() {
  if (S.entryOwner !== 'split') return;
  const hint = document.getElementById('splitHint');
  if (!hint) return;
  const count = S.splitCount || 2;
  const people = (S.splitPeople || []).filter(Boolean);
  const amt = parseFloat(document.getElementById('eAmt')?.value) || 0;

  // Calcula partes
  const myRatio = (S.splitCustomPct && S.splitMyPct) ? S.splitMyPct / 100 : 1 / count;
  const myAmt = amt * myRatio;
  const othersTotal = amt * (1 - myRatio);
  const eachOther = count > 1 ? othersTotal / (count - 1) : 0;

  if (amt <= 0) {
    hint.textContent = `Dividindo entre ${count} pessoa${count > 1 ? 's' : ''} · informe o valor acima`;
    return;
  }
  const lines = [`<span style="color:var(--accent)">Eu: R$ ${fmt(myAmt)}</span>`];
  people.forEach(p => lines.push(`<span style="color:var(--blue)">${p}: R$ ${fmt(eachOther)}</span>`));
  const unnamed = count - 1 - people.length;
  for (let i = 0; i < unnamed; i++) lines.push(`<span style="color:var(--text3)">Pessoa ${people.length + i + 1}: R$ ${fmt(eachOther)}</span>`);
  hint.innerHTML = `<span style="color:var(--text3)">÷${count} ·</span> ${lines.join(' · ')}`;
}

function pickCat(el) {
  document.querySelectorAll('#catChips .chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('eCat').value = el.textContent;
}

function renderPersonChips() {
  const pp = getAllPeople();
  document.getElementById('personChips').innerHTML = pp.map(p =>
    `<div class="chip" onclick="document.getElementById('ePerson').value='${p}'">${p}</div>`
  ).join('');
}

// ── Hint dinâmico: mostra valor por parcela e divisão em tempo real ──
function updateInstallHint() {
  if (S.entryOwner === 'split') updateSplitHint();

  const hint = document.getElementById('installHint');
  if (!hint) return;

  if (S.entryType !== 'installment') {
    hint.style.display = 'none';
    return;
  }

  const total = parseInt(document.getElementById('eInstTotal')?.value) || 0;
  const amt = parseFloat(document.getElementById('eAmt')?.value) || 0;

  if (total >= 2 && amt > 0) {
    const parcel = amt / total;
    hint.style.display = 'block';
    hint.innerHTML = `→ <span style="color:var(--accent)">${total}x de R$ ${fmt(parcel)}</span> por mês`;
  } else {
    hint.style.display = 'none';
  }
}

async function saveEntry() {
  const desc = document.getElementById('eDesc').value.trim();
  const amtRaw = parseFloat(document.getElementById('eAmt').value);
  const date = document.getElementById('eDate').value;
  const bankName = document.getElementById('eBank').value;
  const splitCount = S.entryOwner === 'split' ? (S.splitCount || 2) : null;
  const splitPeople = S.entryOwner === 'split' ? (S.splitPeople || []).filter(Boolean) : [];
  const person = S.entryOwner === 'other'
    ? document.getElementById('ePerson').value.trim()
    : S.entryOwner === 'split'
      ? splitPeople.join(', ')
      : null;
  const splitRatio = S.entryOwner === 'split'
    ? ((S.splitCustomPct && S.splitMyPct) ? S.splitMyPct / 100 : 1 / (splitCount || 2))
    : null;
  const cat = document.getElementById('eCat').value.trim() || null;
  const note = document.getElementById('eNote').value.trim() || null;
  const type = S.entryType;
  const editId = document.getElementById('editEntryId').value;
  const editBank = document.getElementById('editBankName').value;

  if (!desc || isNaN(amtRaw) || amtRaw <= 0) { alert('Preencha descrição e valor.'); return; }
  if (S.entryOwner === 'other' && !person) { alert('Informe o nome da pessoa.'); return; }
  if (S.entryOwner === 'split' && splitPeople.length === 0) { alert('Informe ao menos um nome para dividir.'); return; }

  const m = getMonth();
  const bank = m.banks.find(b => b.name === bankName);
  if (!bank) { alert('Banco não encontrado. Selecione um banco válido.'); return; }

  if (editId && editBank) {
    const oldBank = m.banks.find(b => b.name === editBank);
    if (oldBank) oldBank.entries = oldBank.entries.filter(e => String(e.id) !== String(editId));
    await dbDeleteEntry(editId);
  }

  setSyncing(true);

if (type === 'installment') {
  const total = parseInt(document.getElementById('eInstTotal').value) || 0;
  const cur = parseInt(document.getElementById('eInstCur').value) || 1;
  if (total < 2) { alert('Informe o total de parcelas.'); setSyncing(false); return; }
  if (cur > total) { alert(`Parcela atual (${cur}) não pode ser maior que o total (${total}).`); setSyncing(false); return; }

  const partAmt = parseFloat((amtRaw / total).toFixed(2));
  const gId = editId ? ('grp_' + editId) : 'grp_' + Date.now();

  // ── Se é edição de parcelado, pergunta sobre bulk update ──
  if (editId) {
    const entry = {
      id: editId, desc, amount: partAmt, date,
      owner: S.entryOwner, person,
      splitPeople: S.entryOwner === 'split' ? splitPeople : null,
      splitCount: S.entryOwner === 'split' ? splitCount : null,
      splitRatio: S.entryOwner === 'split' ? splitRatio : null,
      category: cat, note,
      type: 'installment', installCurrent: cur, installTotal: total, groupId: gId
    };
    bank.entries.push(entry);
    await dbSaveEntry(m.key, bankName, entry);

    const applyAll = confirm('Deseja aplicar esta alteração em TODAS as parcelas (passadas e futuras)?\n\nOK = Todas as parcelas\nCancelar = Apenas esta');
    if (applyAll) {
      await bulkUpdateInstallments(gId, bankName, desc, partAmt, cat, note);
    }
  } else {
    // Novo lançamento parcelado
    const entry = {
      id: Date.now(), desc, amount: partAmt, date,
      owner: S.entryOwner, person,
      splitPeople: S.entryOwner === 'split' ? splitPeople : null,
      splitCount: S.entryOwner === 'split' ? splitCount : null,
      splitRatio: S.entryOwner === 'split' ? splitRatio : null,
      category: cat, note,
      type: 'installment', installCurrent: cur, installTotal: total, groupId: gId
    };
    bank.entries.push(entry);
    await dbSaveEntry(m.key, bankName, entry);
    await registerFutureInst({
      desc, partAmt, total, cur, bankName,
      owner: S.entryOwner, person, cat, gId,
      startKey: S.currentMonth, date
    });
  }
} else {
  // ── Lançamento normal, pix ou dividido ──
  const entry = {
    id: editId ? String(editId) : String(Date.now()),
    desc, amount: amtRaw, date,
    owner: S.entryOwner, person,
    splitPeople: S.entryOwner === 'split' ? splitPeople : null,
    splitCount: S.entryOwner === 'split' ? splitCount : null,
    splitRatio,
    category: cat, note,
    type, installCurrent: null, installTotal: null, groupId: null
  };
  bank.entries.push(entry);
  await dbSaveEntry(m.key, bankName, entry);
}
  setSyncing(false);
  renderDash();
  closeModal('mEntry');
  showToast('✓ Lançamento salvo');
}

async function deleteEntry(bankName, id) {
  if (!confirm('Excluir lançamento?')) return;
  const m = getMonth();
  const bk = m.banks.find(b => b.name === bankName);
  const en = bk?.entries.find(e => String(e.id) === String(id));
  setSyncing(true);
  if (en?.groupId && confirm('Cancelar parcelas futuras também?')) await cancelInst(en.groupId, false);
  if (bk) bk.entries = bk.entries.filter(e => String(e.id) !== String(id));
  await dbDeleteEntry(id);
  setSyncing(false);
  renderDash();
  closeModal('mDetail');
  showToast('Lançamento excluído');
}

function showEntryDetail(entry, bankName) {
  const color = PALETTE[S.months.find(x => x.key === S.currentMonth)?.banks.find(b => b.name === bankName)?.color] || '#4d9fff';
  let html = `
    <div class="detail-header">
      <div>
        <div class="detail-desc">${entry.desc}</div>
        <div style="font-size:12px;color:var(--text3);font-family:var(--mono)">${bankName}</div>
      </div>
      <div class="detail-amount" style="color:${color}">R$ ${fmt(entry.amount)}</div>
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-item-label">Data</div>
        <div class="detail-item-val">${fmtDateLong(entry.date)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-item-label">De quem</div>
        <div class="detail-item-val">${
          entry.owner === 'split'
            ? `Dividido com ${(entry.splitPeople || (entry.person ? [entry.person] : [])).filter(Boolean).join(', ')}`
            : entry.owner === 'other' ? entry.person : 'Meu'
        }</div>
      </div>
      ${entry.owner === 'split' ? (() => {
        const count = entry.splitCount || ((entry.splitPeople?.length || 1) + 1);
        const share = entry.amount / count;
        const people = (entry.splitPeople || (entry.person ? entry.person.split(', ') : [])).filter(Boolean);
        const peopleStr = people.length ? people.join(', ') : 'outros';
        return `
      <div class="detail-item">
        <div class="detail-item-label">Minha parte (1/${count})</div>
        <div class="detail-item-val" style="color:var(--accent)">R$ ${fmt(share)}</div>
      </div>
      <div class="detail-item" style="grid-column:1/-1">
        <div class="detail-item-label">Cada um paga · ${peopleStr}</div>
        <div class="detail-item-val" style="color:var(--blue)">R$ ${fmt(share)} cada</div>
      </div>`;
      })() : ''}
      ${entry.category ? `
      <div class="detail-item">
        <div class="detail-item-label">Categoria</div>
        <div class="detail-item-val">${entry.category}</div>
      </div>` : ''}
      ${entry.type === 'installment' ? `
      <div class="detail-item">
        <div class="detail-item-label">Parcela</div>
        <div class="detail-item-val">${entry.installCurrent}/${entry.installTotal} · R$ ${fmt(entry.amount * entry.installTotal)} total</div>
      </div>` : ''}
      ${(entry.type === 'pix' || entry.type === 'debit' || entry.type === 'cash') ? `
      <div class="detail-item">
        <div class="detail-item-label">Tipo</div>
        <div class="detail-item-val">${entry.type === 'pix' ? 'Pix' : entry.type === 'debit' ? 'Débito' : 'Dinheiro'}</div>
      </div>` : ''}
    </div>
    ${entry.note ? `<div class="note-box">${entry.note}</div>` : ''}`;

  document.getElementById('detailTitle').innerHTML = `Detalhes <button class="modal-close" onclick="closeModal('mDetail')">×</button>`;
  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('detailActions').innerHTML = `
    <button class="btn btn-danger btn-sm" onclick="deleteEntry('${bankName}',${entry.id})">🗑 Excluir</button>
    ${entry.type === 'installment' ? `
    <button class="btn btn-ghost btn-sm" style="color:var(--orange)"
      onclick="closeModal('mDetail');showInst(${JSON.stringify(entry).replace(/"/g, '&quot;')})">
      📦 Parcelas
    </button>` : ''}
    <button class="btn btn-primary btn-sm" onclick="closeModal('mDetail');openEntryM(${entry.id},'${bankName}')">✎ Editar</button>`;
  openModal('mDetail');
}

// ── Bulk Update: aplica edição em todas as parcelas do grupo ──
async function bulkUpdateInstallments(gId, bankName, newDesc, newAmt, newCat, newNote) {
  setSyncing(true);
  for (const m of S.months) {
    for (const b of m.banks) {
      for (const e of b.entries) {
        if (e.groupId === gId) {
          e.desc = newDesc;
          e.amount = newAmt;
          e.category = newCat;
          e.note = newNote;
          await dbSaveEntry(m.key, b.name, e);
        }
      }
    }
  }
  // Atualiza também os installments pendentes
  for (const inst of S.installments) {
    if (inst.gId === gId) {
      inst.desc = newDesc;
      inst.amount = newAmt;
      inst.cat = newCat;
      await dbSaveInstallment(inst);
    }
  }
  setSyncing(false);
}