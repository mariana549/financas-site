<div align="center">

# 💰 Finanças — Organizador Pessoal

**Aplicação web completa para controle financeiro pessoal**
**com múltiplos bancos, parcelamentos automáticos e relatórios visuais.**

![Version](https://img.shields.io/badge/versão-2.0-4d9fff?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-ready-4dff91?style=flat-square)
![Supabase](https://img.shields.io/badge/backend-Supabase-3ecf8e?style=flat-square)
![License](https://img.shields.io/badge/licença-MIT-a78bfa?style=flat-square)

<br>

[🚀 Demo ao vivo](#) · [📖 Como usar](#-como-usar) · [⚙️ Instalação](#️-instalação) · [🗄️ Banco de dados](#️-banco-de-dados)

<br>

</div>

---

## ✨ Funcionalidades

### 📊 Dashboard Completo
- **Cards de resumo** — Total gastos, meus gastos, a receber, entradas e saldo
- **Barra de meta** — Acompanhe seus limites de gastos com indicadores visuais
- **Alertas inteligentes** — Avisos quando atingir 80% da meta ou ultrapassar o limite
- **Vencimentos próximos** — Notifica contas fixas que vencem nos próximos 3 dias

### 🏦 Múltiplos Bancos
- Crie quantos bancos quiser (Nubank, Will, Mercado Pago, etc.)
- Cada banco com **cor personalizada** (16 cores disponíveis)
- Alternância rápida entre bancos por abas
- Totais separados por banco nos relatórios

### 💳 Parcelamentos Automáticos
- Registre compras parceladas (2x a 60x)
- **Parcelas futuras são injetadas automaticamente** nos meses seguintes
- Visualize detalhes do parcelamento (parcela atual, total, valor restante)
- Cancele parcelas futuras individualmente ou todas de uma vez

### 👥 Controle de Pessoas
- Separe gastos entre **"meu"** e **"de outra pessoa"**
- Saiba exatamente quanto cada pessoa te deve
- Histórico completo de compras por pessoa em todos os meses
- Chips rápidos para selecionar pessoas já cadastradas

### 📱 Pix & Contas Fixas
- **Pix enviados** — Registre com destinatário, banco de origem e motivo
- **Contas fixas** — Aluguel, água, luz com dia de vencimento
- Contas fixas são copiadas automaticamente ao criar mês com "Copiar mês anterior"

### 💵 Entradas (Receitas)
- Registre salário, freelas, transferências
- Separe entre dinheiro seu e de outras pessoas
- Controle de quem te deve e quanto

### 📋 Assinaturas
- Cadastre Netflix, Spotify, iCloud, etc.
- Organize por banco/cartão
- Veja total mensal e projeção anual
- Marque como cancelada (com data)

### 📈 Relatórios
- **Por banco** — Barras comparativas com totais
- **Por categoria** — Mercado, Moto, Saúde, Lazer, etc.
- **Por pessoa** — Quem mais comprou no seu cartão
- **Comparativo mensal** — Este mês vs anterior
- **Resumo anual** — Todos os meses do ano em barras visuais

### 🤖 Importação com IA
- Cole texto do extrato e o parser interpreta automaticamente
- Reconhece formatos como:
  - `eu: 55 + 25 + 44` → 3 gastos meus
  - `Sogra: 13 + 44` → 2 gastos da Sogra
  - `iFood 32,00` → gasto normal
  - `Moto 195 1/12` → parcelado, parcela 1 de 12
- Selecione quais lançamentos importar
- Edite valores antes de importar

### 🔐 Autenticação & Sync
- Login/cadastro com e-mail e senha
- Dados salvos na nuvem (Supabase)
- Sincronização em tempo real
- Indicador visual de sync (bolinha verde/laranja)
- Cada usuário vê **apenas seus próprios dados** (RLS)

### 🎨 Tema Dark/Light
- Alternância com um clique
- Preferência salva localmente
- 2 temas completos com variáveis CSS

### 📲 PWA (Progressive Web App)
- Instale no celular como app nativo
- Funciona offline (cache via Service Worker)
- Ícone na tela inicial
- Tela cheia sem barra do navegador

### 💾 Backup & Export
- **Exportar JSON** — Backup completo dos dados
- **Importar JSON** — Restaure de qualquer dispositivo
- **Exportar PDF** — Relatório mensal formatado para impressão

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|------------|-----|
| **HTML5** | Estrutura semântica |
| **CSS3** | Variáveis CSS, Grid, Flexbox, temas |
| **JavaScript ES6+** | Lógica do app (vanilla, sem frameworks) |
| **Supabase** | Backend (PostgreSQL + Auth + RLS) |
| **Service Worker** | Cache offline (PWA) |
| **DM Sans / DM Mono** | Tipografia (Google Fonts) |

---

## ⚙️ Instalação

### Pré-requisitos
- Conta no [Supabase](https://supabase.com) (gratuito)
- Conta no [Vercel](https://vercel.com) ou [GitHub Pages](https://pages.github.com) para deploy

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/financas-site.git
cd financas-site
2. Configure o Supabase
Crie um projeto no Supabase
Vá em SQL Editor e execute o SQL abaixo para criar as tabelas
Copie a URL e a anon key do projeto
Cole em js/supabase-config.js:
Copy
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'sua_chave_aqui';
3. Deploy
Vercel (recomendado):

Copy
npm i -g vercel
vercel
GitHub Pages:

Suba o código para um repositório
Vá em Settings → Pages → Source: main → Save
Local (desenvolvimento): 
```

### 🗺️ Roadmap

 - Autenticação com Supabase
 - CRUD completo (meses, bancos, lançamentos)
 - Parcelamentos automáticos
 - Relatórios visuais
 - PWA com cache offline
 - Tema dark/light
 - Backup JSON + Export PDF
 - Gráficos com Chart.js (pizza, linha)
 - Notificações push de vencimentos
-  Compartilhar relatório por link
-  Modo offline completo com sync posterior
 - Importação de extrato OFX/CSV
 - Multi-idioma (EN/ES)


# 🤝 Contribuindo
Faça um fork do projeto
Crie uma branch (git checkout -b feature/nova-funcionalidade)
Commit suas mudanças (git commit -m 'feat: nova funcionalidade')
Push para a branch (git push origin feature/nova-funcionalidade)
Abra um Pull Request

# 📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

