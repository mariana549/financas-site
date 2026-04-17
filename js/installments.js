// ══════════════════════════════════════════════════
// INSTALLMENTS.JS — Parcelas Futuras
// ══════════════════════════════════════════════════

async function registerFutureInst({desc, partAmt, total, cur, bankName, owner, person, cat, gId, startKey, date}) {
  // Limpa parcelas futuras antigas desse grupo
  await dbDeleteInstallmentsByGroup(gId);
  S.installments = S.installments.filter(i => i.gId !== gId);

  // Registra na tabela installments
  for (let p = cur + 1; p <= total; p++) {
    const inst = {
      id: 'i_' + Date.now() + '_' + p + '_' + Math.random().toString(36).slice(2, 7),
      gId, desc, amount: partAmt, total, partNum: p,
      bankName, owner, person, cat,
      offset: p - cur, startKey, date, done: false
    };
    S.installments.push(inst);
    await dbSaveInstallment(inst);
  }

  // ── INJETA nos meses que já existem ──
  const startIdx = S.months.findIndex(m => m.key === startKey);
  for (let p = cur + 1; p <= total; p++) {
    const targetIdx = startIdx + (p - cur);
    if (targetIdx >= S.months.length) break; // mês ainda não existe, tudo bem

    const targetMonth = S.months[targetIdx];

    // Evita duplicar se já foi injetado
    const jaExiste = targetMonth.banks
      .flatMap(b => b.entries)
      .some(e => e.groupId === gId && e.installCurrent === p);
    if (jaExiste) continue;

    // Acha ou cria o banco no mês destino
    let bk = targetMonth.banks.find(b => b.name === bankName);
    if (!bk) {
      const newBank = { name: bankName, color: 'azure', entries: [] };
      targetMonth.banks.push(newBank);
      await dbSaveBank(targetMonth.key, newBank);
      bk = targetMonth.banks[targetMonth.banks.length - 1];
    }

    // Cria a entrada da parcela
    const entry = {
      id: 'auto_' + Date.now() + '_' + p + '_' + Math.random(),
      desc, amount: partAmt, date,
      owner, person, category: cat,
      type: 'installment',
      installCurrent: p,
      installTotal: total,
      groupId: gId,
      autoInj: true
    };
    bk.entries.push(entry);
    await dbSaveEntry(targetMonth.key, bankName, entry);

    // Marca como done no installments
    const instRec = S.installments.find(i => i.gId === gId && i.partNum === p);
    if (instRec) {
      instRec.done = true;
      await dbMarkInstallmentDone(instRec.id);
    }
  }
}
async function injectInstallments(key) {
  const m = S.months.find(x => x.key === key);
  if (!m) return;
  const mIdx = S.months.findIndex(x => x.key === key);
  for (const inst of S.installments) {
    const si = S.months.findIndex(x => x.key === inst.startKey);
    if (si < 0 || si + inst.offset !== mIdx) continue;
    // Não injeta se já existe entrada com mesmo grupo e número de parcela
    const jaExiste = m.banks
      .flatMap(b => b.entries)
      .some(e => e.groupId === inst.gId && e.installCurrent === inst.partNum);
    if (jaExiste) continue;
    let bk = m.banks.find(b => b.name === inst.bankName);
    if (!bk) {
      const newBank = { name: inst.bankName, color: 'azure', entries: [] };
      m.banks.push(newBank);
      await dbSaveBank(key, newBank);
      bk = m.banks[m.banks.length - 1];
    }
    const entry = {
      id: 'auto_' + Date.now() + '_' + Math.random(),
      desc: inst.desc, amount: inst.amount, date: inst.date,
      owner: inst.owner, person: inst.person, category: inst.cat,
      type: 'installment', installCurrent: inst.partNum, installTotal: inst.total,
      groupId: inst.gId, autoInj: true
    };
    bk.entries.push(entry);
    await dbSaveEntry(key, inst.bankName, entry);
    await dbMarkInstallmentDone(inst.id);
    inst.done = true;
  }
}

async function cancelInst(gId, all) {
  setSyncing(true);
  const si = S.months.findIndex(m => m.key === S.currentMonth);
  for (const m of S.months) {
    const i = S.months.indexOf(m);
    if (all || i > si) {
      for (const b of m.banks) {
        const toDelete = b.entries.filter(e => e.groupId === gId && e.autoInj);
        for (const e of toDelete) await dbDeleteEntry(e.id);
        b.entries = b.entries.filter(e => !(e.groupId === gId && e.autoInj));
      }
    }
  }
  await dbDeleteInstallmentsByGroup(gId);
  S.installments = S.installments.filter(i => i.gId !== gId);
  setSyncing(false);
  renderDash();
  closeModal('mInstDet');
}

function showInst(e) {
  S._currentInstEntry = e;
  const maxAnt = (e.installTotal - e.installCurrent) - 1;

  const antSection = maxAnt >= 1 ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <div class="card-lbl" style="margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Antecipar parcelas</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <input type="number" id="antN" min="1" max="${maxAnt}" value="1"
          class="modal-input" style="width:72px;text-align:center" oninput="updateAnticipatePreview()">
        <span style="font-size:12px;color:var(--text2)">de <strong>${maxAnt}</strong> possível${maxAnt !== 1 ? 'is' : ''}</span>
      </div>
      <div id="antPreview" style="font-size:12px;color:var(--text2);line-height:1.6"></div>
    </div>` : '';

  document.getElementById('instDetContent').innerHTML = `
    <div class="summary-grid" style="margin-bottom:0">
      <div class="card"><div class="card-lbl">Parcela</div><div class="card-val a">${e.installCurrent}/${e.installTotal}</div></div>
      <div class="card"><div class="card-lbl">Por parcela</div><div class="card-val">R$ ${fmt(e.amount)}</div></div>
      <div class="card"><div class="card-lbl">Total</div><div class="card-val">R$ ${fmt(e.amount * e.installTotal)}</div></div>
      <div class="card"><div class="card-lbl">Restam</div><div class="card-val o">${e.installTotal - e.installCurrent}x</div></div>
    </div>
    ${antSection}`;

  const antBtn = maxAnt >= 1
    ? `<button class="btn btn-primary btn-sm" onclick="confirmAnticipateParcelas()">Antecipar</button>`
    : '';

  document.getElementById('instDetActions').innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mInstDet')">Fechar</button>
    <button class="btn btn-ghost btn-sm" style="color:var(--orange)" onclick="cancelInst('${e.groupId}',false)">Cancelar próximas</button>
    <button class="btn btn-danger btn-sm" onclick="cancelInst('${e.groupId}',true)">Cancelar todas</button>
    ${antBtn}`;

  openModal('mInstDet');
  if (maxAnt >= 1) updateAnticipatePreview();
}

function updateAnticipatePreview() {
  const e = S._currentInstEntry;
  if (!e) return;
  const n = parseInt(document.getElementById('antN')?.value) || 0;
  const prev = document.getElementById('antPreview');
  if (!prev) return;
  if (n < 1) { prev.innerHTML = ''; return; }

  const cur = e.installCurrent;
  const total = e.installTotal;
  const gId = e.groupId;
  const newCur = cur + n;
  const si = S.months.findIndex(m => m.key === S.currentMonth);

  const affectedLabels = [];
  for (let i = si + 1; i < S.months.length; i++) {
    const m = S.months[i];
    const has = m.banks.some(b =>
      b.entries.some(x => x.groupId === gId && x.installCurrent > cur && x.installCurrent <= newCur)
    );
    if (has) affectedLabels.push(m.label);
  }

  let html = `Parcela atual: <strong>${cur}/${total}</strong> → <strong>${newCur}/${total}</strong>`;
  if (affectedLabels.length > 0) {
    html += `<br>Meses excluídos: <strong>${affectedLabels.join(', ')}</strong>`;
  }
  if (newCur < total) {
    html += `<br>Próxima restante: <strong>${newCur + 1}/${total}</strong>`;
  } else {
    html += `<br>Esta será a última parcela`;
  }
  prev.innerHTML = html;
}

async function confirmAnticipateParcelas() {
  const e = S._currentInstEntry;
  if (!e) return;
  const n = parseInt(document.getElementById('antN')?.value) || 0;
  const cur = e.installCurrent;
  const total = e.installTotal;
  const gId = e.groupId;
  const maxAnt = total - cur - 1;
  if (n < 1 || n > maxAnt) { showToast('Valor inválido para antecipação', 'error'); return; }

  const newCur = cur + n;
  setSyncing(true);

  // 1. Atualiza a parcela atual no mês corrente
  const si = S.months.findIndex(m => m.key === S.currentMonth);
  const curMonth = S.months[si];
  for (const b of curMonth.banks) {
    const found = b.entries.find(x => x.id === e.id);
    if (found) {
      found.installCurrent = newCur;
      await dbSaveEntry(S.currentMonth, b.name, found);
      break;
    }
  }

  // 2. Remove entradas intermediárias dos meses futuros
  for (let i = si + 1; i < S.months.length; i++) {
    const m = S.months[i];
    for (const b of m.banks) {
      const toDelete = b.entries.filter(x =>
        x.groupId === gId && x.installCurrent > cur && x.installCurrent <= newCur
      );
      for (const x of toDelete) await dbDeleteEntry(x.id);
      b.entries = b.entries.filter(x =>
        !(x.groupId === gId && x.installCurrent > cur && x.installCurrent <= newCur)
      );
    }
  }

  // 3. Remove registros de installments das parcelas puladas
  const toDeleteInst = S.installments.filter(i =>
    i.gId === gId && i.partNum > cur && i.partNum <= newCur
  );
  for (const inst of toDeleteInst) await dbDeleteInstallmentById(inst.id);
  S.installments = S.installments.filter(i =>
    !(i.gId === gId && i.partNum > cur && i.partNum <= newCur)
  );

  setSyncing(false);
  S._currentInstEntry = null;
  showToast('Parcelas antecipadas!', 'ok');
  closeModal('mInstDet');
  renderDash();
}