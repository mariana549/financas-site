// ══════════════════════════════════════════════════
// DB-SUBSCRIPTIONS.JS — Assinaturas
// ══════════════════════════════════════════════════

async function dbSaveSub(sub) {
  if (!currentUser) return;
  await sb.from('subscriptions').upsert({
    id: String(sub.id), user_id: currentUser.id, name: sub.name, amount: sub.amount,
    cycle: sub.cycle, bank_name: sub.bank || null, due_day: sub.day || null,
    start_date: sub.startDate || null, end_date: sub.endDate || null,
    owner: sub.owner || 'mine',
    split_people: sub.splitPeople ? JSON.stringify(sub.splitPeople) : null,
    split_values: sub.splitValues ? JSON.stringify(sub.splitValues) : null,
    price_history: sub.priceHistory ? JSON.stringify(sub.priceHistory) : '[]'
  }, { onConflict: 'id' });
}

async function dbDeleteSub(id) {
  if (!currentUser) return;
  await sb.from('subscriptions').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}
