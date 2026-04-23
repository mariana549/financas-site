// ══════════════════════════════════════════════════
// DB-RECEIVABLES.JS — Marks de recebimento
// ══════════════════════════════════════════════════

async function dbSaveRecMark(mark) {
  const { error } = await sb.from('receivable_marks').upsert({
    id: mark.id,
    user_id: currentUser.id,
    month_key: mark.monthKey,
    item_ref: mark.itemRef,
    item_type: mark.itemType,
    person: mark.person,
    amount: mark.amount,
    description: mark.desc,
    bank_name: mark.bankName || null,
    received: mark.received,
    received_at: mark.receivedAt || null
  }, { onConflict: 'id' });
  if (error) throw error;
}

async function dbDeleteRecMark(id) {
  const { error } = await sb.from('receivable_marks').delete()
    .eq('id', id).eq('user_id', currentUser.id);
  if (error) throw error;
}
