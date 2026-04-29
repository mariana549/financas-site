// ══════════════════════════════════════════════════
// DB-ENTRIES.JS — Transações (lançamentos)
// ══════════════════════════════════════════════════

async function dbSaveEntry(monthKey, bankName, entry) {
  if (!currentUser) return;
  const { error } = await sb.from('transacoes').upsert({
    id: String(entry.id), user_id: currentUser.id, month_key: monthKey, bank_name: bankName,
    description: entry.desc, amount: entry.amount, entry_date: entry.date || null,
    owner: entry.owner || 'mine', person: entry.person || null, category: entry.category || null,
    note: entry.note || null, type: entry.type || 'normal',
    install_current: entry.installCurrent || null, install_total: entry.installTotal || null,
    group_id: entry.groupId || null, auto_injected: entry.autoInj || false,
    context_id: S.activeContext?.id || null
  }, { onConflict: 'id' });
  if (error) console.error('[dbSaveEntry] Supabase error:', error);
}

async function dbDeleteEntry(id) {
  if (!currentUser) return;
  await sb.from('transacoes').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}
