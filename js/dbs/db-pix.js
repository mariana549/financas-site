// ══════════════════════════════════════════════════
// DB-PIX.JS — Pix enviados
// ══════════════════════════════════════════════════

async function dbSavePix(monthKey, px) {
  if (!currentUser) return;
  await sb.from('pix_entries').upsert({
    id: String(px.id), user_id: currentUser.id, month_key: monthKey,
    to_person: px.to, amount: px.amount, entry_date: px.date || null,
    bank_name: px.bank || null, obs: px.obs || null
  }, { onConflict: 'id' });
}

async function dbDeletePix(id) {
  if (!currentUser) return;
  await sb.from('pix_entries').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}
