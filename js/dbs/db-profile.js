// ══════════════════════════════════════════════════
// DB-PROFILE.JS — Operações de conta do usuário
// ══════════════════════════════════════════════════

async function dbLoadProfile() {
  if (!currentUser) return null;
  const { data, error } = await sb.from('user_profiles').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (error) { console.error('[dbLoadProfile]', error); return null; }
  return data;
}

async function dbSaveNickname(nickname) {
  if (!currentUser) return false;
  const { error } = await sb.from('user_profiles').upsert(
    { user_id: currentUser.id, nickname: nickname.trim(), updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) { console.error('[dbSaveNickname]', error); return false; }
  return true;
}

async function dbDeleteAccount() {
  if (!currentUser) return false;
  const { error } = await sb.rpc('delete_my_account');
  if (error) { console.error('[dbDeleteAccount]', error); return false; }
  return true;
}
