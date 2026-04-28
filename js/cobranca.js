// ══════════════════════════════════════════════════
// COBRANCA.JS — Cobrança de Terceiros + Recebimentos
// ══════════════════════════════════════════════════

let _cobData    = null;
let _cobPerson  = null; // pessoa ativa para re-render após toggle

// ── Utilitários ──

function _prevMonthKey(key) {
  const [y, mo] = key.split('-').map(Number);
  if (mo === 1) return `${y - 1}-12`;
  return `${y}-${String(mo - 1).padStart(2, '0')}`;
}

function _monthShortLabel(key) {
  const mObj = S.months.find(mx => mx.key === key);
  if (mObj) return mObj.label;
  const [, mo] = key.split('-').map(Number);
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mo - 1] || key;
}

function _getItemRef(e) {
  if (e._tipo === 'pix')   return `pix:${e.id}`;
  if (e._tipo === 'sub')   return `sub:${e.id}`;
  if (e._tipo === 'split') return `split:${e.id}`;
  return `entry:${e.id}`;
}

function _getMark(itemRef, monthKey, person) {
  return (S.receivableMarks || []).find(
    r => r.itemRef === itemRef && r.monthKey === monthKey && r.person === person
  );
}

function _markId(monthKey, itemRef, person) {
  return `${monthKey}|${itemRef}|${person}`.replace(/[^a-z0-9|:._-]/gi, '_');
}

// ── Computa itens devidos por uma pessoa em um mês ──
function _computeItemsForPerson(monthKey, person) {
  const mObj = S.months.find(mx => mx.key === monthKey);
  if (!mObj) return [];

  const cartao = mObj.banks.flatMap(b =>
    b.entries
      .filter(e => e.owner === 'other' && e.person === person)
      .map(e => ({ ...e, bankName: b.name, _tipo: 'entry' }))
  );

  const splitCartao = mObj.banks.flatMap(b =>
    b.entries
      .filter(e => {
        if (e.owner !== 'split') return false;
        const people = (e.splitPeople || (e.person ? e.person.split(', ') : [])).filter(Boolean);
        return people.includes(person);
      })
      .map(e => {
        const people = (e.splitPeople || (e.person ? e.person.split(', ') : [])).filter(Boolean);
        const count  = e.splitCount || (people.length + 1);
        const myRatio = e.splitRatio ?? (1 / count);
        const share  = e.amount * (1 - myRatio) / people.length;
        return { ...e, amount: share, bankName: b.name, _tipo: 'split', desc: e.desc + ' (dividido)' };
      })
  );

  const pix = (S.pixEntries[monthKey] || [])
    .filter(p => p.to === person)
    .map(p => ({
      id: p.id, desc: `Pix${p.obs ? ' — ' + p.obs : ''}`,
      amount: p.amount, date: p.date, bankName: p.bank,
      _tipo: 'pix', type: 'pix', category: null,
      installCurrent: null, installTotal: null
    }));

  const subs = (S.subscriptions || [])
    .filter(s => {
      if (s.endDate) return false;
      const owner = s.owner || 'mine';
      if (owner === 'other') return (s.splitPeople || [])[0] === person;
      if (owner === 'split') return (s.splitPeople || []).includes(person);
      return false;
    })
    .map(s => {
      const owner = s.owner || 'mine';
      let share;
      if (owner === 'other') {
        share = s.amount;
      } else {
        const people = s.splitPeople || [];
        const idx    = people.indexOf(person);
        const myPart = calcMySubPart(s);
        share = s.splitValues?.[idx] ?? ((s.amount - myPart) / people.length);
      }
      return {
        id: s.id, desc: s.name + ' (assinatura)',
        amount: share, bankName: s.bank || '—',
        _tipo: 'sub', type: 'sub',
        category: null, installCurrent: null, installTotal: null
      };
    });

  return [...cartao, ...splitCartao, ...pix, ...subs];
}

// ── Abre modal de cobrança ──
function openCobranca(person) {
  _cobPerson = person;
  const m = getMonth();
  if (!m) return;

  // Itens do mês corrente
  const currentRaw = _computeItemsForPerson(m.key, person);

  // Carry-over: entradas e pix do mês anterior ainda não recebidos
  const prevKey  = _prevMonthKey(m.key);
  const prevRaw  = _computeItemsForPerson(prevKey, person).filter(e => e._tipo !== 'sub');
  const carryRaw = prevRaw.filter(e => {
    const mark = _getMark(_getItemRef(e), prevKey, person);
    return !mark || !mark.received;
  });

  // Entradas registradas desta pessoa no mês
  const personIncomes = (S.incomes[m.key] || []).filter(
    i => i.owner === 'other' && i.person === person
  );
  const incomeTotal = personIncomes.reduce((s, i) => s + i.amount, 0);

  // Montar lista completa com estado de recebimento
  const tagItem = (e, monthKey, isCarry) => {
    const ref  = _getItemRef(e);
    const mark = _getMark(ref, monthKey, person);
    return {
      ...e,
      _ref:        ref,
      _monthKey:   monthKey,
      _received:   mark?.received || false,
      _receivedAt: mark?.receivedAt || null,
      _carryOver:  isCarry,
      _carryLabel: isCarry ? _monthShortLabel(prevKey) : null
    };
  };

  const allItems = [
    ...currentRaw.map(e => tagItem(e, m.key, false)),
    ...carryRaw.map(e => tagItem(e, prevKey, true))
  ];

  const pending      = allItems.filter(e => !e._received);
  const received     = allItems.filter(e => e._received);
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);
  const receivedTotal = received.reduce((s, e) => s + e.amount, 0);

  // _cobData usa só pendentes para copiar o texto de cobrança
  _cobData = { person, items: pending, total: pendingTotal, month: m };

  // ── Render ──
  const el = document.getElementById('mCobrancaContent');
  if (!el) return;

  const mkRow = (e, section) => {
    const isDone  = section === 'received';
    const safeRef  = e._ref.replace(/'/g, '&#39;');
    const safeDesc = (e.desc || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    const safeBank = (e.bankName || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    const safePers = person.replace(/'/g, '&#39;');
    return `
      <tr class="entry-row">
        <td>
          ${e.desc}
          ${e.installCurrent ? `<span class="bm bm-inst" style="margin-left:4px">${e.installCurrent}/${e.installTotal}</span>` : ''}
          ${e._tipo === 'pix' ? `<span class="bm bm-pix" style="margin-left:4px">pix</span>` : ''}
          ${e._tipo === 'sub' ? `<span class="bm bm-rec" style="margin-left:4px">assinatura</span>` : ''}
          ${e.category ? `<span class="bm bm-cat" style="margin-left:4px">${e.category}</span>` : ''}
          ${e._carryOver ? `<span class="bm rcv-carry" style="margin-left:4px">← ${e._carryLabel}</span>` : ''}
          ${e._receivedAt ? `<span style="font-size:10px;color:var(--text3);margin-left:4px">· ${e._receivedAt}</span>` : ''}
        </td>
        <td style="color:var(--text3);font-size:12px;font-family:var(--mono)">${e.bankName || '—'}</td>
        <td><span class="amt${isDone ? ' rcv-amt-done' : ''}">R$ ${fmt(e.amount)}</span></td>
        <td style="width:36px;text-align:center">
          <button class="rcv-toggle${isDone ? ' rcv-toggle--done' : ''}"
            onclick="toggleRecMark('${safeRef}','${e._monthKey}','${e._tipo}','${safePers}',${e.amount},'${safeDesc}','${safeBank}')"
            title="${isDone ? 'Desfazer recebimento' : 'Marcar como recebido'}">
            ${isDone ? '✓' : ''}
          </button>
        </td>
      </tr>`;
  };

  const incomeBar = personIncomes.length ? `
    <div class="rcv-income-bar" onclick="setInnerTab('entradas');closeModal('mCobranca')">
      <span style="font-size:14px">💰</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500">Entrada registrada: <strong>R$ ${fmt(incomeTotal)}</strong></div>
        <div style="font-size:10px;color:var(--text3)">${personIncomes.length} lançamento(s) de ${person} · toque para ver</div>
      </div>
      <span style="font-size:11px;color:var(--accent)">ver →</span>
    </div>` : '';

  const pendingBlock = pending.length ? `
    <div class="tbl-block" style="margin-bottom:12px">
      <div class="tbl-head">
        <span class="tbl-title">Pendente</span>
        <span class="tbl-total" style="color:var(--blue)">R$ ${fmt(pendingTotal)}</span>
      </div>
      <table>
        <thead><tr><th>Descrição</th><th>Banco</th><th>Valor</th><th></th></tr></thead>
        <tbody>${pending.map(e => mkRow(e, 'pending')).join('')}</tbody>
      </table>
    </div>` : `<div class="empty" style="padding:16px 0;text-align:center">✓ tudo recebido!</div>`;

  const receivedBlock = received.length ? `
    <div class="tbl-block" style="margin-bottom:12px">
      <div class="tbl-head">
        <span class="tbl-title" style="color:var(--green)">✓ Recebido</span>
        <span class="tbl-total" style="color:var(--green)">R$ ${fmt(receivedTotal)}</span>
      </div>
      <table>
        <thead><tr><th>Descrição</th><th>Banco</th><th>Valor</th><th></th></tr></thead>
        <tbody>${received.map(e => mkRow(e, 'received')).join('')}</tbody>
      </table>
    </div>` : '';

  el.innerHTML = `
    <div style="text-align:center;padding:12px 0 18px">
      <div style="font-size:30px;font-weight:700;font-family:var(--mono);color:var(--blue)">R$ ${fmt(pendingTotal)}</div>
      <div style="font-size:13px;color:var(--text2);margin-top:4px;font-weight:500">${person}</div>
      <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:2px">
        ${m.label} ${m.year} · ${pending.length} pendente(s)${received.length ? ` · <span style="color:var(--green)">✓ ${received.length} recebido(s)</span>` : ''}
      </div>
      ${receivedTotal > 0 ? `<div style="font-size:11px;color:var(--green);margin-top:3px;font-family:var(--mono)">recebido: R$ ${fmt(receivedTotal)}</div>` : ''}
    </div>
    ${incomeBar}
    ${pendingBlock}
    ${receivedBlock}
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="copiarCobranca('simples')">📋 Simples</button>
      <button class="btn btn-primary" onclick="copiarCobranca('completo')">💬 Completo</button>
    </div>`;

  openModal('mCobranca');
}

// ── Marcar / desmarcar recebimento ──
async function toggleRecMark(itemRef, monthKey, itemType, person, amount, desc, bankName) {
  if (!S.receivableMarks) S.receivableMarks = [];

  const existing = _getMark(itemRef, monthKey, person);
  if (existing) {
    existing.received   = !existing.received;
    existing.receivedAt = existing.received ? today() : null;
    setSyncing(true);
    try { await dbSaveRecMark(existing); } finally { setSyncing(false); }
  } else {
    const mark = {
      id:         _markId(monthKey, itemRef, person),
      monthKey, itemRef, itemType, person, amount, desc, bankName,
      received:   true,
      receivedAt: today()
    };
    S.receivableMarks.push(mark);
    setSyncing(true);
    try { await dbSaveRecMark(mark); } finally { setSyncing(false); }
  }

  renderDash();
  openCobranca(person); // re-render modal sem fechar
}

// ── Gerar texto de cobrança (só pendentes) ──
function copiarCobranca(tipo) {
  if (!_cobData) return;
  const { person, items, total, month } = _cobData;

  let texto;
  if (tipo === 'simples') {
    const linhas = items.map(e => {
      let l = `• ${e.desc}: R$ ${fmt(e.amount)}`;
      if (e.installCurrent) l += ` ${e.installCurrent}/${e.installTotal}`;
      return l;
    }).join('\n');
    texto = `${person} — ${month.label} ${month.year}:\n${linhas}\n─────────────────\nTotal: R$ ${fmt(total)}`;
  } else {
    const linhas = items.map(e => {
      let l = `• ${e.desc}: R$ ${fmt(e.amount)}`;
      if (e.installCurrent) l += ` (parcela ${e.installCurrent}/${e.installTotal})`;
      if (e._tipo === 'pix') l += ' (pix)';
      if (e._carryOver) l += ` (← ${e._carryLabel})`;
      return l;
    }).join('\n');
    texto = `💰 ${person}\n📅 ${month.label} ${month.year}\n\n${linhas}\n\n═══════════════════\n💵 Total: R$ ${fmt(total)}`;
  }

  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    showToast('📋 Cobrança copiada!');
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto)
      .then(() => showToast('📋 Cobrança copiada!'))
      .catch(fallback);
  } else {
    fallback();
  }
}
