// ══════════════════════════════════════════════════
// UTILS — Funções utilitárias globais
// ══════════════════════════════════════════════════

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  try { const [y, mo, day] = d.split('-'); return `${day}/${mo}`; }
  catch { return d; }
}

function fmtDateLong(d) {
  if (!d) return '—';
  try {
    const [y, mo, day] = d.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day} ${months[parseInt(mo) - 1]} ${y}`;
  } catch { return d; }
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function fillSel(id, opts) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join('');
}

function clr(...ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
  if (id === 'mBank') buildColorGrid();
  if (id === 'mMonth') {
    const now = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    let mo = now.getMonth(); // 0-based
    let yr = now.getFullYear();
    // Se o mês atual já existe, sugere o próximo
    if (S.months.find(x => x.key === months[mo] + '/' + yr)) {
      mo = (mo + 1) % 12;
      if (mo === 0) yr++;
    }
    const mSel = document.getElementById('mSel');
    const mYear = document.getElementById('mYear');
    if (mSel) mSel.value = months[mo];
    if (mYear) mYear.value = yr;
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function normalizeName(name) {
  return (name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function getAllPeople() {
  const s = new Set();
  S.months.forEach(m => m.banks.forEach(b => b.entries.forEach(e => {
    if (e.owner === 'other' && e.person) s.add(normalizeName(e.person));
    if (e.splitPeople) e.splitPeople.filter(Boolean).forEach(p => s.add(normalizeName(p)));
  })));
  return [...s];
}

const MONTH_NUM = {
  'Janeiro':1,'Fevereiro':2,'Março':3,'Abril':4,'Maio':5,'Junho':6,
  'Julho':7,'Agosto':8,'Setembro':9,'Outubro':10,'Novembro':11,'Dezembro':12
};

function getMonthDateRange(m) {
  const mn = MONTH_NUM[m.label] || 1;
  const yr = parseInt(m.year);
  const pad = n => String(n).padStart(2, '0');
  const min = `${yr}-${pad(mn)}-01`;
  const lastDay = new Date(yr, mn, 0).getDate();
  const max = `${yr}-${pad(mn)}-${pad(lastDay)}`;
  return { min, max };
}

// Retorna true se a assinatura deve aparecer no mês dado
function isSubActiveInMonth(s, monthKey) {
  const month = (S.months || []).find(m => m.key === monthKey);
  if (!month) return true;
  const mn = MONTH_NUM[month.label] || 1;
  const yr = parseInt(month.year);
  // Primeiro dia do mês atual (YYYY-MM-01)
  const pad = n => String(n).padStart(2, '0');
  const curStr = `${yr}-${pad(mn)}-01`;
  if (s.startDate && curStr < s.startDate.slice(0, 7) + '-01') return false;
  if (s.endDate   && curStr > s.endDate.slice(0, 7)   + '-01') return false;
  return true;
}

// ── Toast global ──
function showToast(msg, type = 'ok') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);' +
      'padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;' +
      'font-family:var(--mono);white-space:nowrap;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(toast);
  }
  const isErr = type === 'error';
  toast.style.background = isErr ? '#1a0a0a' : 'var(--bg3)';
  toast.style.border = `1px solid ${isErr ? '#ff4d4d55' : 'var(--border2)'}`;
  toast.style.color = isErr ? 'var(--red)' : 'var(--text)';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── Skeleton Screens ──
function renderSkeleton() {
  const card = (w1, w2) =>
    `<div class="card"><div class="skel" style="width:${w1}%;height:10px;margin-bottom:10px"></div><div class="skel" style="width:${w2}%;height:22px"></div></div>`;
  return `
    <div class="summary-grid" style="margin-bottom:22px">
      ${card(55,80)}${card(65,70)}${card(50,85)}${card(60,75)}
    </div>
    <div class="skel" style="height:38px;border-radius:8px;margin-bottom:18px"></div>
    <div class="skel" style="height:48px;border-radius:8px;margin-bottom:10px"></div>
    <div class="skel" style="height:48px;border-radius:8px;margin-bottom:10px"></div>
    <div class="skel" style="height:48px;border-radius:8px"></div>
  `;
}

// ── Ícones automáticos por categoria/descrição ──
function getCategoryIcon(desc, cat) {
  const MAP = [
    [/uber|99|cabify|táxi|taxi|lyft/i,                            '🚗'],
    [/ifood|rappi|delivery|pizza|lanche|hamburguer|burger|sushi/i,'🍕'],
    [/restaurante|almoço|almoco|jantar|bar |boteco/i,             '🍽️'],
    [/mercado|supermercado|carrefour|atacado|feira|hortifruti/i,  '🛒'],
    [/netflix|spotify|prime|disney|hbo|streaming/i,               '📺'],
    [/farmácia|farmacia|remédio|remedio|drogaria|saúde|saude|médico|medico|hospital|plano.saúde/i, '💊'],
    [/academia|gym|fitness|crossfit/i,                            '💪'],
    [/gasolina|combustível|combustivel|posto|etanol|álcool.carro/i,'⛽'],
    [/luz|energia|elétrica|eletrica|cpfl|cemig|enel|coelba/i,    '💡'],
    [/água|agua|saneamento|sabesp|cagece/i,                       '💧'],
    [/internet|tim|claro|vivo|oi |net |telefone|celular|plano.móvel|plano.movel/i,'📱'],
    [/aluguel|condomínio|condominio|iptu|moradia/i,               '🏠'],
    [/escola|faculdade|curso|livro|educação|educacao|ensino/i,    '📚'],
    [/viagem|hotel|airbnb|passagem|voo|turismo|pousada/i,         '✈️'],
    [/roupa|calçado|calcado|moda|zara|hm |riachuelo|lojas/i,     '👕'],
    [/cinema|teatro|show|ingresso|entretenimento|jogo /i,         '🎬'],
    [/pet|veterinário|veterinario|ração|racao|petshop/i,          '🐾'],
    [/cabelo|salão|salao|barbearia|manicure|estética|estetica/i,  '💈'],
    [/pix /i,                                                     '💸'],
    [/cartão|cartao|anuidade/i,                                   '💳'],
    [/padaria|café|cafe|cafeteria|cafézinho/i,                    '☕'],
    [/presente|gift|natal|aniversário|aniversario/i,              '🎁'],
    [/seguro/i,                                                   '🛡️'],
    [/imposto|ir |irpf|receita.federal/i,                         '🏛️'],
  ];
  const text = `${desc || ''} ${cat || ''}`;
  for (const [re, icon] of MAP) {
    if (re.test(text)) return icon;
  }
  return '';
}

// ── Swipe to delete/edit em linhas de lançamento ──
function initSwipeRows() {
  const THRESHOLD = 75;
  document.querySelectorAll('#view-dash .entry-row[data-entry-id]').forEach(row => {
    let startX = 0, startY = 0, dx = 0, moved = false, rafId = null;
    const cellsArr = Array.from(row.querySelectorAll('td')); // cache — evita requery no touchmove

    const setCellsBg = bg => { for (let i = 0; i < cellsArr.length; i++) cellsArr[i].style.background = bg; };

    row.addEventListener('click', e => {
      if (moved) { e.stopImmediatePropagation(); moved = false; }
    }, true);

    row.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0; moved = false;
      row.style.transition = 'none';
      row.style.willChange = 'transform'; // promove para camada própria durante o swipe
    }, { passive: true });

    row.addEventListener('touchmove', e => {
      const cx = e.touches[0].clientX;
      const cy = e.touches[0].clientY;
      const ddx = cx - startX;
      const ddy = cy - startY;
      if (!moved && Math.abs(ddx) < 10) return;
      if (!moved && Math.abs(ddy) > Math.abs(ddx)) return; // scroll vertical
      moved = true;
      dx = ddx;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        row.style.transform = `translateX(${dx}px)`;
        const pct = Math.min(Math.abs(dx) / THRESHOLD, 1);
        setCellsBg(dx < 0
          ? `rgba(255,77,77,${(pct * 0.22).toFixed(2)})`
          : `rgba(77,160,255,${(pct * 0.22).toFixed(2)})`);
      });
    }, { passive: true });

    row.addEventListener('touchend', () => {
      if (rafId) cancelAnimationFrame(rafId);
      row.style.willChange = ''; // libera camada
      row.style.transition = 'transform .22s ease, background .22s ease';
      if (dx < -THRESHOLD) {
        setCellsBg('rgba(255,77,77,0.22)');
        setTimeout(() => {
          row.style.transform = '';
          setCellsBg('');
          deleteEntry(row.dataset.bank, row.dataset.entryId);
        }, 220);
      } else if (dx > THRESHOLD) {
        setCellsBg('rgba(77,160,255,0.22)');
        setTimeout(() => {
          row.style.transform = '';
          setCellsBg('');
          openEntryM(row.dataset.entryId, row.dataset.bank);
        }, 220);
      } else {
        row.style.transform = '';
        setCellsBg('');
      }
      dx = 0;
    });
  });
}

// ── Fechar modal ao clicar fora ──
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

function showSplash(onDone) {
  const coins = [
    { left: '5%', sz: '18px', dur: '2.4s', delay: '0s', rot: '320deg', ico: '💰' },
    { left: '15%', sz: '13px', dur: '3.0s', delay: '.4s', rot: '-180deg', ico: '💸' },
    { left: '25%', sz: '15px', dur: '2.2s', delay: '.9s', rot: '270deg', ico: '🪙' },
    { left: '38%', sz: '12px', dur: '2.8s', delay: '.2s', rot: '420deg', ico: '💵' },
    { left: '52%', sz: '16px', dur: '2.5s', delay: '.6s', rot: '-300deg', ico: '💳' },
    { left: '63%', sz: '11px', dur: '3.2s', delay: '1.1s', rot: '200deg', ico: '💴' },
    { left: '72%', sz: '17px', dur: '2.0s', delay: '.35s', rot: '-240deg', ico: '💸' },
    { left: '82%', sz: '13px', dur: '2.7s', delay: '.75s', rot: '150deg', ico: '🪙' },
    { left: '90%', sz: '15px', dur: '2.3s', delay: '1.4s', rot: '380deg', ico: '💰' },
    { left: '46%', sz: '10px', dur: '3.4s', delay: '.15s', rot: '-120deg', ico: '💵' },
  ];

  const el = document.createElement('div');
  el.className = 'splash-screen';
  el.id = 'splashScreen';

  coins.forEach(c => {
    const s = document.createElement('span');
    s.className = 'splash-coin';
    s.style.cssText = `left:${c.left};--sz:${c.sz};--dur:${c.dur};--delay:${c.delay};--rot:${c.rot}`;
    s.textContent = c.ico;
    el.appendChild(s);
  });

  el.insertAdjacentHTML('beforeend', `
    <div class="splash-center">
      <div class="splash-logo">Finanças</div>
      <div class="splash-sub">organizador pessoal</div>
      <div class="splash-line"></div>
      <div class="splash-loading">carregando...</div>
    </div>
  `);

  document.body.appendChild(el);

  // Após 2.2s começa a sumir, aos 2.7s remove do DOM
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      el.remove();
      if (onDone) onDone();
    }, 500);
  }, 2200);
}

