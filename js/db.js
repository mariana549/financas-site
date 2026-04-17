// ══════════════════════════════════════════════════
// DB.JS — Carregamento inicial (loadAllFromSupabase)
// Funções de salvar/deletar ficam nos arquivos db-*.js
// ══════════════════════════════════════════════════

async function loadAllFromSupabase() {
  if (!currentUser) return;
  setSyncing(true);
  try {
    const uid = currentUser.id;
    const [mRes, bRes, tRes, pRes, rRes, iRes, sRes, instRes, gbRes] = await Promise.all([
      sb.from('months').select('*').eq('user_id', uid).order('created_at'),
      sb.from('banks').select('*').eq('user_id', uid),
      sb.from('transacoes').select('*').eq('user_id', uid),
      sb.from('pix_entries').select('*').eq('user_id', uid),
      sb.from('recurrents').select('*').eq('user_id', uid),
      sb.from('incomes').select('*').eq('user_id', uid),
      sb.from('subscriptions').select('*').eq('user_id', uid),
      sb.from('installments').select('*').eq('user_id', uid),
      sb.from('banks_global').select('*').eq('user_id', uid).order('created_at'),
    ]);

    // ── Months + Banks (por mês) + Entries ──
    const months = (mRes.data || []).map(m => ({
      key: m.key, label: m.label, year: m.year, goal: m.goal,
      banks: (bRes.data || [])
        .filter(b => b.month_key === m.key)
        .map(b => ({
          name: b.name, color: b.color,
          entries: (tRes.data || [])
            .filter(t => t.month_key === m.key && t.bank_name === b.name)
            .map(t => ({
              id: t.id, desc: t.description, amount: parseFloat(t.amount),
              date: t.entry_date, owner: t.owner, person: t.person,
              category: t.category, note: t.note, type: t.type || 'normal',
              installCurrent: t.install_current, installTotal: t.install_total,
              groupId: t.group_id, autoInj: t.auto_injected
            }))
        }))
    }));

    // ── Pix ──
    const pixEntries = {};
    (pRes.data || []).forEach(p => {
      if (!pixEntries[p.month_key]) pixEntries[p.month_key] = [];
      pixEntries[p.month_key].push({
        id: p.id, to: p.to_person, amount: parseFloat(p.amount),
        date: p.entry_date, bank: p.bank_name, obs: p.obs
      });
    });

    // ── Contas Fixas ──
    const recurrents = {};
    (rRes.data || []).forEach(r => {
      if (!recurrents[r.month_key]) recurrents[r.month_key] = [];
      recurrents[r.month_key].push({
        id: r.id, desc: r.description, amount: parseFloat(r.amount),
        day: r.due_day, obs: r.obs
      });
    });

    // ── Entradas (receitas) ──
    const incomes = {};
    (iRes.data || []).forEach(i => {
      if (!incomes[i.month_key]) incomes[i.month_key] = [];
      incomes[i.month_key].push({
        id: i.id, desc: i.description, amount: parseFloat(i.amount),
        date: i.entry_date, incType: i.income_type, from: i.from_source,
        owner: i.owner, person: i.person
      });
    });

    // ── Assinaturas ──
    const parsePeople = v => {
      if (!v) return null;
      if (Array.isArray(v)) return v;
      try { return JSON.parse(v); } catch { return v.split(',').map(x => x.trim()); }
    };
    const parseValues = v => {
      if (!v) return null;
      if (Array.isArray(v)) return v.map(Number);
      try { return JSON.parse(v).map(Number); } catch { return null; }
    };
    const subscriptions = (sRes.data || []).map(s => ({
      id: s.id, name: s.name, amount: parseFloat(s.amount), cycle: s.cycle,
      bank: s.bank_name, day: s.due_day, startDate: s.start_date, endDate: s.end_date,
      owner: s.owner || 'mine',
      splitPeople: parsePeople(s.split_people),
      splitValues: parseValues(s.split_values)
    }));

    // ── Parcelas futuras ──
    const installments = (instRes.data || []).map(i => ({
      id: i.id, gId: i.group_id, desc: i.description, amount: parseFloat(i.amount),
      total: i.total_parts, partNum: i.part_num, bankName: i.bank_name,
      owner: i.owner, person: i.person, cat: i.category,
      offset: i.month_offset, startKey: i.start_month_key, date: i.entry_date, done: i.done
    }));

    // ── Bancos Globais ──
    const globalBanks = (gbRes?.data || []).map(g => ({
      id: g.id, name: g.name, color: g.color
    }));

    // ── Popula estado global ──
    S.months       = months;
    S.pixEntries   = pixEntries;
    S.recurrents   = recurrents;
    S.incomes      = incomes;
    S.subscriptions = subscriptions;
    S.installments = installments;
    S.globalBanks  = globalBanks;

    // ── Seeding: migra bancos existentes para banks_global na primeira vez ──
    if (S.globalBanks.length === 0 && months.length > 0 && !gbRes?.error) {
      const seen = new Set();
      for (const m of months) {
        for (const b of m.banks) {
          if (!seen.has(b.name)) {
            seen.add(b.name);
            const gb = {
              id: 'gb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              name: b.name, color: b.color || 'azure'
            };
            S.globalBanks.push(gb);
            await dbSaveGlobalBank(gb);
          }
        }
      }
    }

    const saved = localStorage.getItem('fin_theme');
    if (saved) S.theme = saved;

  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
  setSyncing(false);
}
