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
      id: 'i_' + Date.now() + '_' + p,
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
    if (inst.done) continue;
    const si = S.months.findIndex(x => x.key === inst.startKey);
    if (si < 0 || si + inst.offset !== mIdx) continue;
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
  document.getElementById('instDetContent').innerHTML = `
    <div class="summary-grid" style="margin-bottom:0">
      <div class="card"><div class="card-lbl">Parcela</div><div class="card-val a">${e.installCurrent}/${e.installTotal}</div></div>
      <div class="card"><div class="card-lbl">Por parcela</div><div class="card-val">R$ ${fmt(e.amount)}</div></div>
      <div class="card"><div class="card-lbl">Total</div><div class="card-val">R$ ${fmt(e.amount * e.installTotal)}</div></div>
      <div class="card"><div class="card-lbl">Restam</div><div class="card-val o">${e.installTotal - e.installCurrent}x</div></div>
    </div>`;
  document.getElementById('instDetActions').innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mInstDet')">Fechar</button>
    <button class="btn btn-ghost btn-sm" style="color:var(--orange)" onclick="cancelInst('${e.groupId}',false)">Cancelar próximas</button>
    <button class="btn btn-danger btn-sm" onclick="cancelInst('${e.groupId}',true)">Cancelar todas</button>`;
  openModal('mInstDet');
}