# João

**Sistema operacional de governança interna e tomada de decisão** para médias e grandes empresas.

A ideia central: em empresas desse porte, decisões importantes se perdem em e-mails, reuniões sem ata e
aprovações informais. O João trata a **decisão como objeto de primeira classe** e aplica, de forma
automática e auditável, as regras de governança — quem pode decidir o quê, com que informação, em que
fórum, com que quórum, e o que acontece depois.

> Esta pasta é um protótipo funcional (HTML + CSS + JS puro, sem build e sem dependências), com dados
> fictícios da empresa *Vértice Industrial S.A.* Veja [Limites](#limites-e-caminho-para-produção).

## Como abrir

Dê dois cliques em `index.html` (Chrome, Edge ou Firefox atuais). Nada para instalar.
Os dados ficam no `localStorage` do navegador; use **Dados e ajustes** para exportar/importar backup
ou restaurar a demonstração.

Dica: o seletor **Ver como**, no topo, troca a pessoa simulada. Experimente:

| Ver como | O que muda |
|---|---|
| Fernanda Lima (CTO) — padrão | tem uma decisão para decidir sozinha (alçada de diretor), um item na pauta do ExCo e uma ação |
| Marcelo Vasconcelos (CEO) | preside o ExCo: conduz e proclama votações; deve dar concordância no plano de sucessão |
| Patrícia Santos (Governança) | perfil administrador: agenda reuniões, monta pauta, edita alçadas, pessoas e fóruns |
| Helena Moraes (Conselho) | preside o Conselho: pauta da próxima reunião do Conselho (expansão de Joinville, R$ 18,5 mi, com parecer prévio do CAR) e concordância pendente no plano de sucessão |
| Letícia Barros (CHRO) | tem uma revisão pós-decisão atrasada (trabalho híbrido) e o plano de sucessão em análise |

## O que o sistema faz

### 1. Decisões (`#/decisoes`)
Ciclo de vida completo: **rascunho → análise → deliberação → decisão → execução → concluída → revisada**
(mais *cancelada* e a possibilidade de **devolver** para complementação).

Cada decisão tem contexto, resultado esperado e como medir, premissas críticas, gatilhos de reversão,
alternativas, critérios ponderados, recomendação, riscos e políticas vinculados, ações de execução,
conversa e histórico.

- **Matriz multicritério** com cálculo ao vivo e **análise de sensibilidade**: o sistema varia o peso de
  cada critério em ±50% e avisa quando o ranking é frágil. Também sinaliza quando a recomendação do
  proponente *diverge* da matriz.
- **Prontidão para deliberar**: checklist de qualidade (alternativas, notas completas, recomendação
  fundamentada, conflito de interesses declarado, concordâncias, parecer prévio, premissas e gatilhos
  para decisões irreversíveis). Itens obrigatórios bloqueiam a submissão.
- **Selo de conteúdo (SHA-256)** gravado na submissão: prova que o texto deliberado é o texto submetido.
  Depois de submetida, a decisão não pode mais ser editada.
- **RAPID**: Recomenda, Concorda (pode dar ressalva ou **veto**, que bloqueia), Consulta, Executa, Decide.
- **Revisão pós-decisão**: compara o esperado com o realizado e separa a *qualidade do processo* do
  *acaso do resultado* — alimenta o quadro "Qualidade × resultado" do painel.

### 2. Matriz de alçadas (`#/alcadas`)
Tabela *tipo de decisão × faixa de valor → instância* (gerente, diretor, Comitê Executivo, Conselho),
editável pela Governança. A instância é **calculada**, e o motivo é mostrado. Ela sobe de nível quando:

1. a decisão é **irreversível** (Tipo 1);
2. há risco vinculado com severidade residual **≥ apetite a risco** (configurável);
3. pede **exceção a uma política** interna;
4. por **segregação de funções**: o decisor natural é o próprio proponente.

Há também *parecer prévio obrigatório* de um comitê assessor (ex.: CAR a partir de R$ 5 mi em CAPEX) e um
**simulador** para testar cenários sem criar decisões.

### 3. Fóruns e reuniões (`#/foruns`)
Conselho, Comitê Executivo e Comitê de Auditoria e Riscos, cada um com composição, quórum e regra de
votação (maioria simples, 2/3 ou unanimidade; voto de minerva opcional). Na reunião: presença e quórum,
pauta (a "fila" vem das decisões roteadas ao fórum), voto de cada membro presente, apuração automática,
adiamento e **ata gerada** pelo sistema.

### 4. Riscos, políticas e ações
- **Riscos**: mapa de calor 5×5 (inerente/residual), dono, mitigação, revisão periódica e apetite.
- **Políticas**: biblioteca com dono, versão e ciclo de revisão; vinculadas às decisões.
- **Ações**: o que precisa acontecer para a decisão virar realidade. Não se conclui uma decisão com ações em aberto.

### 5. Trilha de auditoria (`#/auditoria`)
Todo evento relevante é registrado com pessoa, data e detalhe, e **encadeado por hash** (cada registro
inclui o SHA-256 do anterior). O botão *Verificar integridade* recomputa a cadeia; *Demonstrar detecção*
adultera uma cópia em memória para mostrar a quebra. Exportação em CSV.

### 6. Painel (`#/painel`)
"Minha mesa" (decisões a decidir, votos, pareceres, concordâncias, ações, revisões) e indicadores de
saúde da governança: ciclo médio de decisão, taxa de aprovação, revisões atrasadas, riscos acima do apetite,
políticas vencidas, ações atrasadas, funil e distribuição por instância.

Atalho: **Ctrl K** abre a busca global.

## Estrutura

```
governa-os/
├── index.html
├── css/styles.css        sistema de design (claro/escuro, responsivo, impressão)
└── js/
    ├── util.js           escape seguro, datas, dinheiro, SHA-256 síncrono, ícones
    ├── domain.js         REGRAS (funções puras): rotear, prontidão, matriz, votação, métricas, caixa de entrada
    ├── store.js          estado, persistência, trilha encadeada e AÇÕES de negócio (com permissões)
    ├── seed.js           dados de demonstração (relativos à data de hoje)
    ├── ui.js             roteador, modais, formulários, paleta de comandos
    └── view-*.js         telas
```

As regras de negócio estão separadas da interface (`domain.js` + `store.js`) justamente para poderem ser
reaproveitadas num backend. Todo HTML é montado com `html\`...\``, que escapa qualquer valor interpolado
(os dados importados de um backup não executam código).

## Limites e caminho para produção

Este é um protótipo de uso individual. Para uso corporativo faltam, no mínimo:

- **Autenticação e permissões reais** (SSO/SAML/OIDC). Hoje "Ver como" apenas simula papéis.
- **Servidor e banco de dados** compartilhados; os dados vivem só neste navegador.
- **Trilha imutável de verdade**: gravação somente-anexação (WORM) no servidor, com hash âncora assinado
  e publicado periodicamente. No navegador, quem controla o navegador poderia recriar os hashes.
- **Notificações** (e-mail/Teams) para pendências e prazos, e integração com calendário.
- **Anexos** (estudos, contratos) e assinatura eletrônica de atas.
- **Multiempresa / multi-idioma**, se for o caso.
