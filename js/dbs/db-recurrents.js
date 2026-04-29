// ══════════════════════════════════════════════════
// DB-RECURRENTS.JS — Contas fixas
// ══════════════════════════════════════════════════

async function dbSaveRecurrent(monthKey, r) {
  if (!currentUser) return;
  await sb.from('recurrents').upsert({
    id: String(r.id), user_id: currentUser.id, month_key: monthKey,
    description: r.desc, amount: r.amount, due_day: r.day || null, obs: r.obs || null,
    context_id: S.activeContext?.id || null
  }, { onConflict: 'id' });
}

async function dbDeleteRecurrent(id) {
  if (!currentUser) return;
  await sb.from('recurrents').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}
