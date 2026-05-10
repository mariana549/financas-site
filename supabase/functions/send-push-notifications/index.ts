// ══════════════════════════════════════════════════
// send-push-notifications — Edge Function
// Dispara Web Push para usuários com contas a vencer
// Invocada diariamente via pg_cron às 08:00
// ══════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY     = Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BDiUaS0Fg_u2-MpjNuhK3fZ9WMngSQ1IxhsDXk1FKDnQIacME4CyNSK4n_g_6L8J6ZEkw3dKz2osFKvHnOXbshM';
const VAPID_PRIVATE_KEY    = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_MAILTO         = Deno.env.get('VAPID_MAILTO') || 'mailto:admin@financas.app';

// ── Utilitário: base64url → Uint8Array ──
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ── Assina o JWT VAPID com Web Crypto ──
async function signVapidJwt(audience: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: now + 86400,
    sub: VAPID_MAILTO,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${header}.${payload}`;
  const privateKeyBytes = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${signingInput}.${signature}`;
}

// ── Envia Web Push para uma subscription ──
async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await signVapidJwt(audience);

  const body = JSON.stringify(payload);
  const encoder = new TextEncoder();

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
    },
    body: encoder.encode(body),
  });
  return res.status;
}

// ── MONTH_NUM: nomes em PT → número ──
const MONTH_NUM: Record<string, number> = {
  'Janeiro':1,'Fevereiro':2,'Março':3,'Abril':4,'Maio':5,'Junho':6,
  'Julho':7,'Agosto':8,'Setembro':9,'Outubro':10,'Novembro':11,'Dezembro':12
};

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  // Aceita POST (cron) ou GET (teste manual)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!VAPID_PRIVATE_KEY) {
    return new Response('VAPID_PRIVATE_KEY not set', { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  const todayStr = isoToday();
  const todayD   = new Date();
  const results: string[] = [];

  // ── 1. Busca todos os usuários com push_subscriptions ──
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription');

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0, msg: 'no subscriptions' }), { status: 200 });
  }

  // ── 2. Para cada usuário, descobre itens que vencem hoje/amanhã ──
  for (const row of subs) {
    const uid = row.user_id;
    const subData = typeof row.subscription === 'string'
      ? JSON.parse(row.subscription) : row.subscription;

    // Carrega perfil do usuário (notify_days_before)
    const { data: profile } = await admin
      .from('user_profiles')
      .select('notify_days_before')
      .eq('user_id', uid)
      .maybeSingle();
    const n = profile?.notify_days_before ?? 3;

    const futureD = new Date(); futureD.setDate(futureD.getDate() + n);
    const futureStr = futureD.toISOString().split('T')[0];

    // Busca contexto pessoal
    const { data: ctxRow } = await admin.rpc('ensure_personal_context', { p_user_id: uid });
    const { data: ctxList } = await admin.from('contexts').select('id').eq('user_id', uid).eq('type', 'personal');
    const cid = ctxList?.[0]?.id;
    if (!cid) continue;

    // Boletos pendentes que vencem até N dias
    const { data: boletos } = await admin.from('transacoes')
      .select('id, description, entry_date')
      .eq('user_id', uid).eq('context_id', cid)
      .eq('type', 'boleto')
      .is('paid', false)
      .gte('entry_date', todayStr)
      .lte('entry_date', futureStr);

    // Contas fixas que vencem no período
    const { data: months } = await admin.from('months')
      .select('key, label, year')
      .eq('user_id', uid).eq('context_id', cid);
    const curMonth = months?.find(m => {
      const mn = MONTH_NUM[m.label] || 1;
      return mn === todayD.getMonth() + 1 && parseInt(m.year) === todayD.getFullYear();
    });

    let recDueCount = 0;
    if (curMonth) {
      const { data: recs } = await admin.from('recurrents')
        .select('due_day, description')
        .eq('user_id', uid).eq('context_id', cid)
        .eq('month_key', curMonth.key);
      recDueCount = (recs || []).filter(r => {
        const diff = parseInt(r.due_day) - todayD.getDate();
        return diff >= 0 && diff <= n;
      }).length;
    }

    const totalDue = (boletos?.length || 0) + recDueCount;
    if (totalDue === 0) continue;

    // Verifica se já enviamos hoje
    const itemRef = `due_${todayStr}`;
    const { data: alreadySent } = await admin.from('push_log')
      .select('id')
      .eq('user_id', uid)
      .eq('sent_date', todayStr)
      .eq('item_type', 'summary')
      .eq('item_id', itemRef)
      .maybeSingle();
    if (alreadySent) continue;

    // Envia push
    const label = n === 1 ? 'amanhã' : `nos próximos ${n} dias`;
    const pushPayload = {
      title: '⏰ Contas a vencer — Finanças',
      body: `${totalDue} conta(s) vencem ${label}. Toque para ver a agenda.`,
      url: '/?view=agenda'
    };
    try {
      const status = await sendPush({
        endpoint: subData.endpoint,
        p256dh: subData.keys?.p256dh || '',
        auth: subData.keys?.auth || '',
      }, pushPayload);
      results.push(`${uid}: status ${status}`);
      if (status < 400) {
        await admin.from('push_log').insert({
          user_id: uid, sent_date: todayStr,
          item_type: 'summary', item_id: itemRef
        });
      }
    } catch (e) {
      results.push(`${uid}: error ${e}`);
    }
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  });
});
