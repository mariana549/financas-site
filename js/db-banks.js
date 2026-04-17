// ══════════════════════════════════════════════════
// DB-BANKS.JS — Bancos Globais
// ══════════════════════════════════════════════════

async function dbSaveGlobalBank(gb) {
  if (!currentUser) return;
  await sb.from('banks_global').upsert(
    { id: gb.id, user_id: currentUser.id, name: gb.name, color: gb.color },
    { onConflict: 'id' }
  );
}

async function dbDeleteGlobalBank(id) {
  if (!currentUser) return;
  await sb.from('banks_global').delete().eq('id', id).eq('user_id', currentUser.id);
}
