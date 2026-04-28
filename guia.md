# 📘 GUIA COMPLETO: ESCALA, INFRAESTRUTURA E SEGURANÇA (SUPABASE)

## 🏁 1. CHECKLIST DE EXECUÇÃO
- [ ] Criar conta no Resend e gerar API Key.
- [ ] Configurar SMTP Personalizado no painel do Supabase.
- [ ] Testar envio de e-mail (verificar se passou do limite de 3/hora).
- [ ] Personalizar o HTML do Template de e-mail no Supabase.
- [ ] Criar o Bucket de Cold Storage no Supabase Storage.
- [ ] Executar o prompt de Arquivamento de Dados com a sua IA.
- [ ] Realizar um Backup Manual do banco de dados (CSV ou SQL).
- [ ] Configurar o Ambiente de Preview (Projeto de DEV ou CLI).

---

## 📧 2. CONFIGURAÇÃO DE E-MAIL (RESEND + SMTP)

**Sua parte no Resend:**
1. Acesse resend.com e crie sua conta gratuita.
2. Vá em API Keys > Create API Key e copie o código (ele começa com re_...).

**Sua parte no Supabase:**
1. Vá no seu Dashboard > Settings (Engrenagem) > Auth.
2. Procure por SMTP Settings e ative a chave Enable Custom SMTP.
3. Preencha os campos exatamente assim:
   * SMTP Host: ://resend.com
   * Port: 465 (ou 587)
   * Username: resend
   * Password: Cole aqui a API Key que você criou no Resend.
   * Sender Email: O e-mail que você validou no Resend.
----
resende n da tem um outro que da que eo brevo.com 

Como você não pode comprar um domínio agora e está usando o .vercel.app, a melhor alternativa gratuita e que permite enviar e-mails para qualquer pessoa é o Brevo (antigo Sendinblue) ou usar o próprio SMTP do Gmail.

Aqui estão os dois caminhos:

Opção 1: Brevo (Recomendado)
O Brevo permite que você valide apenas o seu endereço de e-mail (Gmail) e o utilize como remetente. Eles oferecem 300 e-mails por dia no plano gratuito.

Crie a conta: Vá em brevo.com e crie sua conta gratuita.

Valide seu e-mail: * No menu superior, clique no seu nome e vá em Senders & IP.

Clique em Add a sender.

Coloque seu nome e seu e-mail (maridev889@gmail.com).

Você receberá um e-mail de confirmação. Clique no link para validar.

Pegue a Chave SMTP:

Vá em SMTP & API no menu lateral.

Clique na aba SMTP.

Clique em Generate a new SMTP key, dê um nome e copie o código.

No Supabase:

Host: smtp-relay.brevo.com

Port: 587

Username: maridev889@gmail.com (o e-mail da conta Brevo)

Password: A chave que você acabou de gerar.

Opção 2: SMTP do Gmail (O mais simples)
Você pode usar o seu próprio Gmail para disparar os e-mails do sistema. É ótimo para testes, mas tem um limite de cerca de 500 envios por dia.

Ative a Verificação em 2 Etapas: Vá na sua Conta Google > Segurança e ative a verificação em duas etapas.

Crie uma Senha de App:

Pesquise por "Senhas de App" na barra de busca da conta Google.

Dê um nome (ex: "Supabase App") e gere a senha.

Copie o código de 16 letras que vai aparecer.

No Supabase:

Host: smtp.gmail.com

Port: 465

Username: maridev889@gmail.com

Password: Aquela senha de 16 letras que você gerou (sem os espaços).

Sender Email: maridev889@gmail.com

⚠️ O "Pulo do Gato" (Aviso Importante)
Como você não tem um domínio próprio (.com.br), o Gmail e outros provedores podem identificar os e-mails de confirmação como Spam.

Dica: Avise seus usuários (ou teste você mesmo) para olharem sempre a caixa de Spam ou a aba Promoções.
---

## 📝 3. PROMPTS PARA A INTELIGÊNCIA ARTIFICIAL (IA)

### A. Lógica de Autenticação e Tratamento de Erros
> Contexto: Estou configurando um provedor SMTP externo (Resend) no meu projeto Supabase para remover o limite de 3 e-mails por hora.
> 
> Tarefa: Como um Engenheiro de Software Sênior, revise a lógica de Autenticação (Sign-up) e Recuperação de Senha do meu sistema considerando os seguintes pontos:
> 1. Tratamento de Erros: Melhore o bloco try/catch do cadastro para identificar erros específicos do Supabase Auth (como e-mail já existente ou falha no envio) e retornar mensagens amigáveis para o usuário final, sem expor logs técnicos.
> 2. Feedback Visual: Implemente uma lógica que informe claramente ao usuário que o e-mail de confirmação foi enviado e que ele deve verificar a caixa de entrada (incluindo o spam).
> 3. Configuração de Redirecionamento: Certifique-se de que o parâmetro redirectTo no método signUp esteja configurado corretamente para levar o usuário de volta à URL correta do meu app após ele clicar no link do e-mail.
> 4. Segurança: Garanta que não existam chaves sensíveis (como a API Key do Resend ou Service Role do Supabase) expostas no código do lado do cliente (client-side).
> 
> Restrição: Foque apenas na lógica de autenticação e no fluxo de feedback do usuário. Não altere outras configurações do projeto.

### B. Personalização Visual do E-mail (HTML/CSS)
> Contexto: Quero substituir o e-mail padrão e feio do Supabase por um template HTML profissional e responsivo para o meu app de finanças.
> 
> Tarefa: Como um Designer de Interface e Desenvolvedor Sênior, crie o código HTML e CSS inline para o template de "Confirmação de E-mail" (Confirm Signup).
> 
> Requisitos do Design:
> 1. Visual: Use um visual limpo (Clean), com fontes sans-serif. Use tons de azul escuro ou verde (que passam confiança financeira).
> 2. Branding: Inclua um espaço para eu colocar a URL da minha logo no topo.
> 3. Call to Action: Crie um botão grande e centralizado para a confirmação. O link do botão DEVE ser a variável {{ .ConfirmationURL }}.
> 4. Conteúdo: Escreva um texto de boas-vindas amigável, explicando que o app vai ajudar o usuário a organizar as finanças Pessoais e PJ.
> 5. Rodapé: Adicione um aviso legal dizendo que, se o usuário não solicitou o cadastro, ele pode ignorar o e-mail.
> 
> Entrega: Apenas o código HTML pronto para eu copiar e colar no campo "Confirm Signup" dentro do dashboard do Supabase.

### C. Estratégia de Cold Storage (Arquivamento de Dados)
> Contexto: Tenho um app de finanças no Supabase. Quero implementar uma estratégia de "Cold Storage" focada exclusivamente em SQL e Supabase Storage.
> 
> Persona: Engenheiro de Dados Sênior.
> 
> Objetivo: Criar uma lógica para mover registros antigos de uma tabela chamada transacoes para um bucket no Supabase Storage.
> 
> Requisitos Estritos:
> 1. Isolamento: Foque apenas na lógica do banco de dados (PostgreSQL/SQL) e na integração com o Supabase Storage. Não utilize frameworks de frontend ou backend externos.
> 2. Processo de Arquivamento:
>    - Selecionar registros com base em uma coluna de data.
>    - Garantir a integridade: o dado só deve ser removido do banco após a confirmação de que o arquivo foi salvo com sucesso no Storage.
> 3. Estrutura do Banco: Forneça o script SQL para criar os índices necessários na tabela para buscas eficientes por data e usuário.
> 4. Formato: O dado deve ser transformado em JSON para armazenamento no bucket.
> 5. Segurança: Use funções do PostgreSQL (PL/pgSQL) ou descreva a lógica via Supabase Edge Functions se for necessário para a comunicação com o Storage.
> 
> Restrição: Não adicione nenhuma configuração de ambiente, bibliotecas de terceiros ou frameworks de UI. Foque apenas nos dados e na comunicação entre Banco de Dados e Storage do Supabase.

---

## 🛡️ 4. SEGURANÇA: BACKUP MANUAL (PLANO GRATUITO)

**Opção 1: Exportação via Dashboard (Simples)**
1. Vá em Table Editor.
2. Selecione a tabela (ex: transacoes).
3. Clique em Export > Export to CSV. Guarde o arquivo com a data de hoje.

**Opção 2: Backup Total via Terminal (Profissional)**
Use o utilitário pg_dump (requer Postgres instalado no PC):
```bash
pg_dump -h db.seu-projeto.supabase.co -U postgres -d postgres -f backup_meu_app.sql
```
*(As informações de Host você encontra em Settings > Database > Connection Info).*

---

## 🧪 5. AMBIENTE DE PREVIEW (DESENVOLVIMENTO)

Para não bugar o sistema dos usuários ativos, escolha uma das opções:

**Opção A: Segundo Projeto Gratuito (Staging)**
1. Crie um novo projeto no Supabase (ex: MeuApp-DEV).
2. Teste todas as mudanças de SQL e Auth lá primeiro.
3. Após validar, aplique as mudanças no projeto de Produção.

**Opção B: Desenvolvimento Local (CLI + Docker)**
1. Instale o Supabase CLI.
2. Na pasta do projeto: supabase init.
3. Para iniciar o banco no PC: supabase start.
4. Para criar uma alteração: supabase migration new nome_da_mudanca.
5. Para enviar para a nuvem: supabase db push.

---

**Nota Final para a sua IA:** Sempre que for pedir algo novo, use o aviso: "Estamos trabalhando em um ambiente com SMTP Resend configurado. Foque na tarefa sem alterar configurações de infraestrutura já existentes."