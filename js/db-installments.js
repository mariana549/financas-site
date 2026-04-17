// ══════════════════════════════════════════════════
// DB-INSTALLMENTS.JS — Parcelas futuras
// ══════════════════════════════════════════════════

async function dbSaveInstallment(inst) {
  if (!currentUser) return;
  await sb.from('installments').upsert({
    id: inst.id, user_id: currentUser.id, group_id: inst.gId,
    description: inst.desc, amount: inst.amount, total_parts: inst.total,
    part_num: inst.partNum, bank_name: inst.bankName, owner: inst.owner,
    person: inst.person || null, category: inst.cat || null,
    month_offset: inst.offset, start_month_key: inst.startKey,
    entry_date: inst.date || null, done: inst.done || false
  }, { onConflict: 'id' });
}

async function dbDeleteInstallmentsByGroup(gId) {
  if (!currentUser) return;
  await sb.from('installments').delete().eq('group_id', gId).eq('user_id', currentUser.id);
}

async function dbMarkInstallmentDone(id) {
  if (!currentUser) return;
  await sb.from('installments').update({ done: true }).eq('id', id).eq('user_id', currentUser.id);
}

async function dbDeleteInstallmentById(id) {
  if (!currentUser) return;
  await sb.from('installments').delete().eq('id', id).eq('user_id', currentUser.id);
}
