// ══════════════════════════════════════════════════
// FILTER.JS — Filtro global + Lista de Meses
// ══════════════════════════════════════════════════

const ORDER_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getFilteredMonths() {
  const preset = (S.filter && S.filter.preset) || 'this_year';
  const now = new Date();
  const currentYear = now.getFullYear().toString();

  if (preset === 'all')       return S.months;
  if (preset === 'this_year') return S.months.filter(m => m.year === currentYear);
  if (preset === 'last_year') return S.months.filter(m => m.year === (now.getFullYear() - 1).toString());

  if (preset === 'last_6' || preset === 'last_12') {
    const diff = preset === 'last_6' ? 5 : 11;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - diff, 1);
    return S.months.filter(m => {
      const d = new Date(parseInt(m.year), ORDER_MESES.indexOf(m.label), 1);
      return d >= cutoff;
    });
  }
  return S.months;
}

function renderFilterBar() {
  const el = document.getElementById('filterBar');
  if (!el) return;

  const presets = [
    { id: 'this_year', label: 'Este ano' },
    { id: 'last_year', label: 'Ano passado' },
    { id: 'last_6',    label: 'Últimos 6m' },
    { id: 'last_12',   label: 'Últimos 12m' },
    { id: 'all',       label: 'Todos' },
  ];
  const current = (S.filter && S.filter.preset) || 'this_year';

  el.innerHTML = `<div class="filter-presets">
    ${presets.map(p => `
      <div class="filter-chip ${current === p.id ? 'active' : ''}"
        onclick="setFilterPreset('${p.id}')">${p.label}</div>
    `).join('')}
  </div>`;
}

function setFilterPreset(preset) {
  if (!S.filter) S.filter = { _expandedYears: {} };
  S.filter.preset = preset;
  renderMonthList();
}

function toggleYearFolder(year) {
  if (!S.filter) S.filter = { _expandedYears: {} };
  if (!S.filter._expandedYears) S.filter._expandedYears = {};
  S.filter._expandedYears[year] = S.filter._expandedYears[year] === false ? true : false;
  renderMonthList();
}

// ── Substitui renderMonthList de months.js ──
function renderMonthList() {
  renderFilterBar();

  const el = document.getElementById('monthList');
  if (!el) return;

  const filtered = getFilteredMonths();

  if (!filtered.length) {
    el.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:var(--text3);font-family:var(--mono)">nenhum mês neste período</div>';
    return;
  }

  const years = [...new Set(filtered.map(m => m.year))].sort((a, b) => parseInt(a) - parseInt(b));

  if (years.length > 1) {
    el.innerHTML = years.map(year => {
      const yearMonths = filtered.filter(m => m.year === year);
      const yearTotal  = yearMonths.reduce((s, m) => s + monthTotal(m), 0);
      if (!S.filter) S.filter = { _expandedYears: {} };
      if (!S.filter._expandedYears) S.filter._expandedYears = {};
      const expanded = S.filter._expandedYears[year] !== false;

      return `<div class="year-folder">
        <div class="year-header" onclick="toggleYearFolder('${year}')">
          <span class="year-arrow ${expanded ? 'open' : ''}">▸</span>
          <span class="year-label">${year}</span>
          <span class="badge">R$${fmt(yearTotal)}</span>
        </div>
        <div class="year-months ${expanded ? 'expanded' : 'collapsed'}">
          ${yearMonths.map(m => renderMonthItem(m)).join('')}
        </div>
      </div>`;
    }).join('');
  } else {
    el.innerHTML = filtered.map(m => renderMonthItem(m)).join('');
  }
}

function renderMonthItem(m) {
  return `<div class="month-item ${S.currentMonth === m.key ? 'active' : ''}"
    onclick="selectMonth('${m.key}');showView('dash')"
    title="Abrir no dashboard">
    <span>${m.label.slice(0, 3)} ${m.year}</span>
    <div class="month-actions">
      <button onclick="event.stopPropagation();openEditMonth('${m.key}')"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 3px;line-height:1;transition:color .15s"
        onmouseover="this.style.color='var(--accent)'"
        onmouseout="this.style.color='var(--text3)'"
        title="Editar mês">✎</button>
      <button onclick="event.stopPropagation();openDeleteMonth('${m.key}')"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 3px;line-height:1;transition:color .15s"
        onmouseover="this.style.color='var(--red)'"
        onmouseout="this.style.color='var(--text3)'"
        title="Excluir mês">×</button>
    </div>
    <span class="badge">R$${fmt(monthTotal(m))}</span>
  </div>`;
}
