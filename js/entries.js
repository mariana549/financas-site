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
  document.getElementById('eDate').value = today();
  document.getElementById('eInstTotal').value = '';
  document.getElementById('eInstCur').value = '1';
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
      setEType(en.type || 'normal');
      setOwner(en.owner || 'mine');
      if (en.person) document.getElementById('ePerson').value = en.person;
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
  ['tNormal', 'tInstall', 'tPix'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const map = { normal: 'tNormal', installment: 'tInstall', pix: 'tPix' };
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
  document.getElementById('personGroup').style.display = o === 'other' ? 'block' : 'none';
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

// ── Hint dinâmico: mostra valor por parcela em tempo real ──
function updateInstallHint() {
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
  const person = S.entryOwner === 'other' ? document.getElementById('ePerson').value.trim() : null;
  const cat = document.getElementById('eCat').value.trim() || null;
  const note = document.getElementById('eNote').value.trim() || null;
  const type = S.entryType;
  const editId = document.getElementById('editEntryId').value;
  const editBank = document.getElementById('editBankName').value;

  if (!desc || isNaN(amtRaw) || amtRaw <= 0) { alert('Preencha descrição e valor.'); return; }
  if (S.entryOwner === 'other' && !person) { alert('Informe o nome da pessoa.'); return; }

  const m = getMonth();
  const bank = m.banks.find(b => b.name === bankName);

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

  const partAmt = parseFloat((amtRaw / total).toFixed(2));
  const gId = editId ? ('grp_' + editId) : 'grp_' + Date.now();

  // ── Se é edição de parcelado, pergunta sobre bulk update ──
  if (editId) {
    const entry = {
      id: editId, desc, amount: partAmt, date,
      owner: S.entryOwner, person, category: cat, note,
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
      owner: S.entryOwner, person, category: cat, note,
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
}
  setSyncing(false);
  renderDash();
  closeModal('mEntry');
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
        <div class="detail-item-val">${entry.owner === 'other' ? entry.person : 'Meu'}</div>
      </div>
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
      ${entry.type === 'pix' ? `
      <div class="detail-item">
        <div class="detail-item-label">Tipo</div>
        <div class="detail-item-val">Pix</div>
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