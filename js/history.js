// ══════════════════════════════════════════════════
// HISTORY.JS — Histórico de Pessoas entre Meses
// ══════════════════════════════════════════════════

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 48%)`;
}

function avatarInitials(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.trim().slice(0, 2).toUpperCase();
}

function toggleHistCard(header) {
  const detail = header.nextElementSibling;
  const chevron = header.querySelector('.hist-chevron');
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  chevron.textContent = isOpen ? '▸' : '▾';
}

function renderHistory() {
  const el = document.getElementById('historyContent');
  if (!el) return;

  // ── Agrega dados por pessoa ──
  const pplAll = {};

  S.months.forEach(m => {
    m.banks.forEach(b => {
      // owner = 'other'
      b.entries.filter(e => e.owner === 'other' && e.person).forEach(e => {
        if (!pplAll[e.person]) pplAll[e.person] = { total: 0, months: {} };
        pplAll[e.person].total += e.amount;
        if (!pplAll[e.person].months[m.key]) pplAll[e.person].months[m.key] = { total: 0, items: [] };
        pplAll[e.person].months[m.key].total += e.amount;
        pplAll[e.person].months[m.key].items.push(e);
      });

      // owner = 'split'
      b.entries.filter(e => e.owner === 'split').forEach(e => {
        const people = (e.splitPeople || (e.person ? e.person.split(', ') : [])).filter(Boolean);
        if (!people.length) return;
        const count = e.splitCount || (people.length + 1);
        const myRatio = e.splitRatio ?? (1 / count);
        const share = e.amount * (1 - myRatio) / people.length;
        people.forEach(p => {
          if (!pplAll[p]) pplAll[p] = { total: 0, months: {} };
          pplAll[p].total += share;
          if (!pplAll[p].months[m.key]) pplAll[p].months[m.key] = { total: 0, items: [] };
          pplAll[p].months[m.key].total += share;
          pplAll[p].months[m.key].items.push({ ...e, desc: e.desc + ' (÷' + count + ')', amount: share });
        });
      });
    });
  });

  // ── Assinaturas de outras pessoas e em conjunto ──
  (S.subscriptions || []).filter(s => !s.endDate).forEach(s => {
    const owner = s.owner || 'mine';
    const monthlyAmt = s.cycle === 'mensal' ? s.amount : s.cycle === 'anual' ? s.amount / 12 : s.amount * 52 / 12;
    if (owner === 'other') {
      const person = (s.splitPeople || ['?'])[0];
      if (!pplAll[person]) pplAll[person] = { total: 0, months: {} };
      if (!pplAll[person].months['assinaturas']) pplAll[person].months['assinaturas'] = { total: 0, items: [] };
      pplAll[person].months['assinaturas'].total += monthlyAmt;
      pplAll[person].months['assinaturas'].items.push({ desc: s.name, amount: monthlyAmt, isSub: true });
      pplAll[person].total += monthlyAmt;
    } else if (owner === 'split') {
      const people = s.splitPeople || [];
      const count = people.length + 1;
      people.forEach((p, i) => {
        const perPerson = s.splitValues ? (s.splitValues[i] || 0) : monthlyAmt / count;
        if (!pplAll[p]) pplAll[p] = { total: 0, months: {} };
        if (!pplAll[p].months['assinaturas']) pplAll[p].months['assinaturas'] = { total: 0, items: [] };
        pplAll[p].months['assinaturas'].total += perPerson;
        pplAll[p].months['assinaturas'].items.push({ desc: s.name, amount: perPerson, isSub: true });
        pplAll[p].total += perPerson;
      });
    }
  });

  if (!Object.keys(pplAll).length) {
    el.innerHTML = '<div class="empty">nenhum lançamento de outras pessoas ainda</div>';
    return;
  }

  // ── Métricas gerais ──
  const totalGeral = Object.values(pplAll).reduce((s, d) => s + d.total, 0);
  const numPessoas = Object.keys(pplAll).length;
  const allMonthKeys = new Set();
  Object.values(pplAll).forEach(d =>
    Object.keys(d.months).forEach(k => k !== 'assinaturas' && allMonthKeys.add(k))
  );

  // ── Cards de resumo no topo ──
  const summaryHTML = `
    <div class="summary-grid" style="margin-bottom:24px">
      <div class="card">
        <div class="card-lbl">Total a Receber</div>
        <div class="card-val b">R$ ${fmt(totalGeral)}</div>
      </div>
      <div class="card">
        <div class="card-lbl">Pessoas Ativas</div>
        <div class="card-val">${numPessoas}</div>
      </div>
      <div class="card">
        <div class="card-lbl">Meses com Dados</div>
        <div class="card-val">${allMonthKeys.size}</div>
      </div>
    </div>`;

  // ── Card por pessoa ──
  const cardsHTML = Object.entries(pplAll)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => {
      const pct = totalGeral > 0 ? (data.total / totalGeral * 100) : 0;
      const monthKeys = Object.keys(data.months).filter(k => k !== 'assinaturas');
      const monthCount = monthKeys.length;
      const avgPerMonth = monthCount > 0 ? data.total / monthCount : data.total;
      const color = avatarColor(name);
      const initials = avatarInitials(name);

      const rows = Object.entries(data.months)
        .sort((a, b) => {
          if (a[0] === 'assinaturas') return 1;
          if (b[0] === 'assinaturas') return -1;
          // Ordena pelos meses na ordem de S.months (mais recente primeiro)
          const ai = S.months.findIndex(m => m.key === a[0]);
          const bi = S.months.findIndex(m => m.key === b[0]);
          return bi - ai;
        })
        .map(([mk, md]) => `
          <tr>
            <td style="font-family:var(--mono);font-size:12px;white-space:nowrap">
              ${mk === 'assinaturas' ? '🔁 Assinaturas' : mk}
            </td>
            <td style="color:var(--text2);font-size:12px;max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${md.items.map(i => i.isSub
                ? `${i.desc} <span class="bm bm-rec" style="font-size:9px">assinatura</span>`
                : i.desc).join(', ')}
            </td>
            <td style="white-space:nowrap">
              <span class="amt" style="color:var(--blue)">R$ ${fmt(md.total)}</span>
              ${mk === 'assinaturas' ? '<span style="font-size:10px;color:var(--text3);display:block">/mês</span>' : ''}
            </td>
          </tr>`).join('');

      return `
        <div class="tbl-block hist-card" style="margin-bottom:12px">
          <div class="tbl-head hist-card-header" onclick="toggleHistCard(this)" style="gap:12px;cursor:pointer;user-select:none">
            <div class="hist-avatar" style="background:${color}">${initials}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px">${name}</div>
              <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">
                R$ ${fmt(data.total)} · ${monthCount} mês${monthCount !== 1 ? 'es' : ''}
              </div>
            </div>
            <span class="tbl-total" style="color:var(--blue);flex-shrink:0">R$ ${fmt(data.total)}</span>
            <span class="hist-chevron">▸</span>
          </div>
          <div class="hist-detail" style="display:none">
            <div style="padding:10px 18px;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="hist-progress-wrap">
                  <div class="hist-progress-fill" style="width:${Math.min(pct, 100).toFixed(1)}%"></div>
                </div>
                <span style="font-size:11px;font-family:var(--mono);color:var(--text2);white-space:nowrap">
                  ${pct.toFixed(1)}% do total
                </span>
              </div>
            </div>
            <table>
              <thead><tr><th>Mês</th><th>Itens</th><th>Total</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="foot-row">
              <div class="foot-grp">
                <span class="foot-lbl">Total</span>
                <span class="foot-amt" style="color:var(--blue)">R$ ${fmt(data.total)}</span>
              </div>
              <div class="foot-grp">
                <span class="foot-lbl">Meses ativos</span>
                <span class="foot-amt">${monthCount}</span>
              </div>
              <div class="foot-grp">
                <span class="foot-lbl">Média/mês</span>
                <span class="foot-amt">R$ ${fmt(avgPerMonth)}</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

  el.innerHTML = summaryHTML + cardsHTML;
}
