// ══════════════════════════════════════════════════
// STATE — Estado global da aplicação
// ══════════════════════════════════════════════════

function defaultState() {
  return {
    months: [], currentMonth: null, currentBank: null, currentInnerTab: 'gastos',
    subscriptions: [], pixEntries: {}, recurrents: {}, incomes: {}, installments: [],
    globalBanks: [], receivableMarks: [],
    devUsers: [], changelogEntries: [], announcements: [], isDev: false,
    profile: { nickname: '' },
    currentView: 'dash', entryOwner: 'mine', entryType: 'normal',
    incomeOwner: 'mine', incomeType: 'Salário', pickedColor: 'azure',
    theme: 'dark', aiParsed: [], aiFileData: null, aiFileType: null,
    filter: { preset: 'this_year', _expandedYears: {} }
  };
}

let S = defaultState();

// Carregar tema do localStorage
const _t = localStorage.getItem('fin_theme');
if (_t) S.theme = _t;

function save() {
  // Só salva preferência de tema localmente — dados vão pro Supabase
  localStorage.setItem('fin_theme', S.theme);
}