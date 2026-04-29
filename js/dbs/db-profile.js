// ══════════════════════════════════════════════════
// DB-PROFILE.JS — Operações de conta do usuário
// ══════════════════════════════════════════════════

async function dbDeleteAccount() {
  if (!currentUser) return false;
  const { error } = await sb.rpc('delete_my_account');
  if (error) { console.error('[dbDeleteAccount]', error); return false; }
  return true;
}
