# Ponto de Mar — app da loja de crochê

App de gestão para uma pequena loja de crochê. A dona é iniciante em empreendedorismo: textos em português simples e didático.

## Como funciona
- Abrir `index.html` com dois cliques (Chrome/Edge). Não precisa de internet nem instalação.
- HTML + CSS + JavaScript puro, sem bibliotecas nem build.
- Dados ficam no `localStorage` do navegador (chave `croche-loja-v1`). Backup/restauração em arquivo `.json` pelos botões do topo.

## Estrutura
| Arquivo | Conteúdo | Agente responsável |
|---|---|---|
| `index.html` | casca: topo, abas, ordem dos scripts | — |
| `css/estilo.css` | todo o visual (cores em `:root`) | — |
| `js/dados.js` | objeto global `Loja`: dados, salvar, formatação, valor da hora, backup | — |
| `js/precificacao.js` | aba Precificação | `precificacao` |
| `js/cronometro.js` | cronômetro de trabalho no topo da Precificação (`Loja.dados.trabalhos`; ligado = `inicio` em ms, conta mesmo com o app fechado) + bolinha flutuante | `precificacao` |
| `js/materiais.js` | aba Materiais (linhas, estoque, onde comprei mais barato) | `precificacao` |
| `js/financeiro.js` | aba Finanças da loja | `financeiro` |
| `js/pessoal.js` | aba Meu dinheiro (finanças pessoais) | `financeiro` |
| `js/receitas.js` | aba Receitas | `receitas` |
| `js/agenda.js` | aba Agenda: calendário do mês com tarefas e posts do Instagram (`Loja.dados.agenda`) | — |
| `js/app.js` | troca de abas, aba Início, backup, ícone da marca (clique no nome; fica em `config.logo` como PNG 128px) | — |
| `js/nuvem.js` | login Google + sincronização com Firestore (`usuarios/{uid}/partes/geral` e `r_{idReceita}`) | — |
| `js/firebase-config.js` | config do projeto Firebase da loja (vazio = só local, botão ☁️ some) | — |
| `firebase.json`, `firestore.rules` | hospedagem (Firebase Hosting, pasta raiz) e regras: cada usuário só acessa o próprio `usuarios/{uid}` | — |

## Nuvem
- Sem config ou sem internet o app segue 100% local. Login só funciona pelo site (não em `file://`).
- `Loja.substituir(d, 'nuvem')` aplica dados baixados; o `nuvem.js` ignora a origem `'nuvem'` para não reenviar.
- Publicar: `npx firebase-tools deploy` na pasta `D:\PontoDeMar`: `npx firebase-tools deploy --only "hosting,firestore:rules" --project pontomar --non-interactive` → https://pontomar.web.app

## Regras
- Cada módulo monta a própria `<section>` e escuta `Loja.aoMudar(fn)` para se atualizar.
- `Loja.salvar('origem')` grava e avisa todos os módulos.
- Ao criar campos novos, adicione o padrão em `padrao()` no `dados.js` para não quebrar dados antigos.
- Sempre escapar texto do usuário com `Loja.esc()` ao montar HTML.
- Tipos de material, ícones e o nome completo (`Loja.CATS_MAT`, `Loja.ICONE_MAT`, `Loja.nomeMaterial()`) ficam no `dados.js` e são usados por Materiais e Precificação.
