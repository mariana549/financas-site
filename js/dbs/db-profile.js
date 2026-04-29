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
  const val = nickname.trim();
  // Verifica se já existe um perfil
  const { data: existing } = await sb.from('user_profiles').select('user_id').eq('user_id', currentUser.id).maybeSingle();
  let error;
  if (existing) {
    ({ error } = await sb.from('user_profiles')
      .update({ nickname: val, updated_at: new Date().toISOString() })
      .eq('user_id', currentUser.id));
  } else {
    ({ error } = await sb.from('user_profiles')
      .insert({ user_id: currentUser.id, nickname: val, updated_at: new Date().toISOString() }));
  }
  if (error) { console.error('[dbSaveNickname]', error); return false; }
  return true;
}

async function dbSavePushSubscription(subscription) {
  if (!currentUser) return false;
  const { error } = await sb.from('push_subscriptions').upsert(
    { user_id: currentUser.id, subscription, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) { console.error('[dbSavePushSubscription]', error); return false; }
  return true;
}

async function dbRemovePushSubscription() {
  if (!currentUser) return;
  await sb.from('push_subscriptions').delete().eq('user_id', currentUser.id);
}

async function dbLogError(message, stack, url) {
  if (!currentUser) return;
  // fire-and-forget — não bloqueia o app
  sb.from('error_logs').insert({
    user_id: currentUser.id,
    message: String(message).slice(0, 500),
    stack: stack ? String(stack).slice(0, 2000) : null,
    url: url || window.location.href
  }).then(({ error }) => { if (error) console.warn('[dbLogError]', error); });
}

async function dbDeleteAccount() {
  if (!currentUser) return false;
  const { error } = await sb.rpc('delete_my_account');
  if (error) { console.error('[dbDeleteAccount]', error); return false; }
  return true;
}
