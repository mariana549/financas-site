// ══════════════════════════════════════════════════
// DB-MONTHS.JS — Meses e Bancos (por mês)
// ══════════════════════════════════════════════════

async function dbSaveMonth(m) {
  if (!currentUser) return;
  await sb.from('months').upsert(
    { user_id: currentUser.id, key: m.key, label: m.label, year: m.year, goal: m.goal || null },
    { onConflict: 'user_id,key' }
  );
}

async function dbSaveBank(monthKey, bank) {
  if (!currentUser) return;
  await sb.from('banks').upsert(
    { user_id: currentUser.id, month_key: monthKey, name: bank.name, color: bank.color },
    { onConflict: 'user_id,month_key,name' }
  );
}
