// ══════════════════════════════════════════════════
// DB-INCOMES.JS — Entradas (receitas)
// ══════════════════════════════════════════════════

async function dbSaveIncome(monthKey, inc) {
  if (!currentUser) return;
  await sb.from('incomes').upsert({
    id: String(inc.id), user_id: currentUser.id, month_key: monthKey,
    description: inc.desc, amount: inc.amount, entry_date: inc.date || null,
    income_type: inc.incType || null, from_source: inc.from || null,
    owner: inc.owner || 'mine', person: inc.person || null,
    context_id: S.activeContext?.id || null
  }, { onConflict: 'id' });
}

async function dbDeleteIncome(id) {
  if (!currentUser) return;
  await sb.from('incomes').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}
