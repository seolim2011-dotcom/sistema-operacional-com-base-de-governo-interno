/* João — dados de demonstração (empresa fictícia). Tudo é relativo à data de hoje. */
(function (G) {
  'use strict';
  const U = G.U, D = G.D;
  const Seed = {};

  Seed.build = () => {
    const T = U.today(), Y = new Date().getFullYear();
    const d = (n) => U.addDays(T, n);
    const pad = (n) => String(n).padStart(3, '0');
    const DID = (n) => 'DEC-' + Y + '-' + pad(n);
    const RID = (n) => 'REU-' + Y + '-' + pad(n);
    const tsOf = (date, h) => { const x = U.parse(date); x.setHours(h || 9, 0, 0, 0); return x.toISOString(); };

    const S = {
      versao: 1,
      empresa: { nome: 'Vértice Industrial S.A.', setor: 'Indústria e logística · 2.400 colaboradores' },
      usuarioId: 'p-fernanda',
      config: { apetiteRisco: 15, bumpIrreversivel: true, bumpRisco: true, bumpExcecao: true, sod: true },
      seq: { dec: 19, risco: 12, pol: 9, acao: 13, reu: 7 },
      pessoas: [], areas: [], foruns: [], niveis: [], tipos: [], decisoes: [], riscos: [], politicas: [], acoes: [], reunioes: [], audit: [],
    };
    G.Store.state = S; // as regras de domínio (rotear etc.) leem daqui

    /* ---------- pessoas e áreas ---------- */
    [
      ['p-helena', 'Helena Moraes', 'Presidente do Conselho de Administração', 'a-ca', 5],
      ['p-ricardo', 'Ricardo Teixeira', 'Conselheiro independente · presidente do Comitê de Auditoria e Riscos', 'a-ca', 5],
      ['p-beatriz', 'Beatriz Nogueira', 'Conselheira independente', 'a-ca', 5],
      ['p-paulo', 'Paulo Andrade', 'Conselheiro', 'a-ca', 5],
      ['p-sergio', 'Sérgio Albuquerque', 'Conselheiro independente', 'a-ca', 5],
      ['p-marcelo', 'Marcelo Vasconcelos', 'CEO', 'a-gov', 4],
      ['p-camila', 'Camila Duarte', 'CFO — Diretora Financeira', 'a-fin', 4],
      ['p-rodrigo', 'Rodrigo Pires', 'COO — Diretor de Operações', 'a-ops', 4],
      ['p-fernanda', 'Fernanda Lima', 'CTO — Diretora de Tecnologia', 'a-ti', 4],
      ['p-leticia', 'Letícia Barros', 'CHRO — Diretora de Pessoas', 'a-pes', 4],
      ['p-andre', 'André Siqueira', 'Diretor Jurídico e Compliance', 'a-jur', 4],
      ['p-gustavo', 'Gustavo Reis', 'Diretor Comercial', 'a-com', 4],
      ['p-eduardo', 'Eduardo Farias', 'Gerente de Controladoria', 'a-fin', 2],
      ['p-diego', 'Diego Martins', 'Gerente da Planta Joinville', 'a-ops', 2],
      ['p-thiago', 'Thiago Rocha', 'Gerente de Suprimentos', 'a-sup', 2],
      ['p-juliana', 'Juliana Prado', 'Gerente de TI e Segurança da Informação', 'a-ti', 2],
      ['p-mariana', 'Mariana Costa', 'Gerente de Pessoas e Cultura', 'a-pes', 2],
      ['p-aline', 'Aline Torres', 'Gerente Comercial e de Atendimento', 'a-com', 2],
      ['p-patricia', 'Patrícia Santos', 'Secretária de Governança Corporativa', 'a-gov', 2, 'admin'],
    ].forEach(([id, nome, cargo, areaId, nivel, perfil]) => {
      const slug = U.norm(nome).replace(/[^a-z ]/g, '').split(' ').filter(Boolean);
      S.pessoas.push({ id, nome, cargo, areaId, nivel, perfil: perfil || 'membro', email: slug[0] + '.' + slug[slug.length - 1] + '@verticeindustrial.example' });
    });
    [
      ['a-ca', 'Conselho de Administração', null, null],
      ['a-gov', 'Governança Corporativa', 'p-marcelo', 'p-patricia'],
      ['a-fin', 'Financeiro e Controladoria', 'p-camila', 'p-eduardo'],
      ['a-ops', 'Operações', 'p-rodrigo', 'p-diego'],
      ['a-sup', 'Suprimentos', 'p-rodrigo', 'p-thiago'],
      ['a-ti', 'Tecnologia e Segurança da Informação', 'p-fernanda', 'p-juliana'],
      ['a-pes', 'Pessoas e Cultura', 'p-leticia', 'p-mariana'],
      ['a-jur', 'Jurídico e Compliance', 'p-andre', null],
      ['a-com', 'Comercial e Atendimento', 'p-gustavo', 'p-aline'],
    ].forEach(([id, nome, diretorId, gerenteId]) => S.areas.push({ id, nome, diretorId, gerenteId }));

    /* ---------- fóruns ---------- */
    S.foruns.push(
      { id: 'f-ca', sigla: 'CA', nome: 'Conselho de Administração', deliberativo: true, finalidade: 'Define a estratégia, aprova investimentos e operações de grande porte, M&A, políticas corporativas e supervisiona a gestão. Última instância de decisão da companhia.', periodicidade: 'Mensal', quorum: 3, regra: 'maioria', minerva: true, presidenteId: 'p-helena', secretarioId: 'p-patricia', membros: ['p-helena', 'p-ricardo', 'p-beatriz', 'p-paulo', 'p-sergio'] },
      { id: 'f-exco', sigla: 'ExCo', nome: 'Comitê Executivo', deliberativo: true, finalidade: 'Delibera sobre decisões táticas e estratégicas de alçada executiva: investimentos médios, contratos relevantes, políticas internas e priorização do portfólio de iniciativas.', periodicidade: 'Quinzenal', quorum: 4, regra: 'maioria', minerva: true, presidenteId: 'p-marcelo', secretarioId: 'p-patricia', membros: ['p-marcelo', 'p-camila', 'p-rodrigo', 'p-fernanda', 'p-leticia', 'p-andre', 'p-gustavo'] },
      { id: 'f-car', sigla: 'CAR', nome: 'Comitê de Auditoria e Riscos', deliberativo: false, finalidade: 'Comitê assessor do Conselho. Emite parecer prévio sobre decisões de alto valor ou risco, supervisiona controles internos, auditoria e o apetite a risco. Não delibera: recomenda.', periodicidade: 'Bimestral', quorum: 2, regra: 'maioria', minerva: false, presidenteId: 'p-ricardo', secretarioId: 'p-patricia', membros: ['p-ricardo', 'p-beatriz', 'p-sergio'] },
    );
    S.niveis.push(
      { n: 1, nome: 'Gerente da área', tipo: 'cargo', cargo: 'gerente' },
      { n: 2, nome: 'Diretor da área', tipo: 'cargo', cargo: 'diretor' },
      { n: 3, nome: 'Comitê Executivo', tipo: 'forum', forumId: 'f-exco' },
      { n: 4, nome: 'Conselho de Administração', tipo: 'forum', forumId: 'f-ca' },
    );
    const F = (a, b, c, e) => [{ ate: a, nivel: 1 }, { ate: b, nivel: 2 }, { ate: c, nivel: 3 }, { ate: e, nivel: 4 }];
    S.tipos.push(
      { id: 'capex', nome: 'Investimento (CAPEX)', faixas: F(250000, 1500000, 10000000, null), parecer: { forumId: 'f-car', acima: 5000000 } },
      { id: 'opex', nome: 'Despesa operacional (OPEX)', faixas: F(100000, 750000, 5000000, null), parecer: null },
      { id: 'contrato', nome: 'Contrato com fornecedor', faixas: F(200000, 1000000, 8000000, null), parecer: null },
      { id: 'pessoas', nome: 'Pessoas e remuneração', faixas: F(150000, 1000000, 6000000, null), parecer: null },
      { id: 'tecnologia', nome: 'Tecnologia e dados', faixas: F(150000, 1000000, 8000000, null), parecer: null },
      { id: 'financeiro', nome: 'Financeiro e tesouraria', faixas: [{ ate: 500000, nivel: 2 }, { ate: 5000000, nivel: 3 }, { ate: null, nivel: 4 }], parecer: { forumId: 'f-car', acima: 10000000 } },
      { id: 'mna', nome: 'Fusões, aquisições e parcerias', faixas: [{ ate: null, nivel: 4 }], parecer: { forumId: 'f-car', acima: 0 } },
      { id: 'politica', nome: 'Política corporativa', faixas: [{ ate: null, nivel: 3 }], parecer: null },
      { id: 'estrategia', nome: 'Estratégia e organização', faixas: [{ ate: null, nivel: 4 }], parecer: null },
    );

    /* ---------- riscos ---------- */
    [
      ['Ataque de ransomware e vazamento de dados', 'Tecnologia e cibersegurança', 4, 5, 3, 4, 'p-juliana', 'mitigando', 'MFA em todos os acessos, EDR nos endpoints, backup imutável e exercício de resposta a incidentes semestral.', 25],
      ['Concentração em fornecedor único de aço laminado', 'Operacional', 4, 4, 4, 4, 'p-thiago', 'mitigando', 'Homologar segundo fornecedor até o 1º trimestre; estoque de segurança de 45 dias para itens críticos.', -5],
      ['Volatilidade cambial nas importações', 'Financeiro', 4, 3, 3, 2, 'p-camila', 'mitigando', 'Política de hedge escalonado (DEC-004) e revisão trimestral da exposição líquida.', 40],
      ['Descumprimento da LGPD e sanções da ANPD', 'Compliance e regulatório', 3, 4, 2, 4, 'p-andre', 'mitigando', 'Mapeamento de dados, RIPDs para tratamentos de alto risco e treinamento anual.', 55],
      ['Obsolescência do ERP legado', 'Tecnologia e cibersegurança', 5, 3, 4, 3, 'p-fernanda', 'mitigando', 'Suporte estendido contratado até dez/2028; plano de migração em avaliação (DEC-015).', 18],
      ['Perda de talentos-chave na engenharia', 'Pessoas', 3, 4, 3, 3, 'p-leticia', 'mitigando', 'Plano de retenção para 40 posições críticas e política de trabalho híbrido.', 33],
      ['Interrupção operacional na planta de Joinville', 'Operacional', 2, 5, 2, 5, 'p-diego', 'mitigando', 'Plano de continuidade de negócios, seguro patrimonial e brigada treinada. Risco inerente alto, ocorrência improvável.', 70],
      ['Inadimplência de clientes classe B', 'Financeiro', 3, 3, 3, 2, 'p-eduardo', 'mitigando', 'Revisão trimestral de limites de crédito e seguro de crédito para contas > R$ 500 mil.', 48],
      ['Risco reputacional na cadeia de suprimentos', 'Reputacional e ESG', 2, 5, 2, 4, 'p-thiago', 'mitigando', 'Auditoria social anual em fornecedores críticos e cláusulas contratuais de conformidade.', 62],
      ['Capacidade insuficiente para a demanda contratada', 'Estratégico', 4, 4, 4, 4, 'p-rodrigo', 'identificado', 'Aguardando decisão de expansão (DEC-014). Hoje: horas extras e terceirização pontual.', 9],
      ['Mudança regulatória tributária', 'Compliance e regulatório', 3, 3, 3, 3, 'p-camila', 'aceito', 'Acompanhamento via consultoria tributária; impacto absorvível pela margem atual.', 85],
      ['Dependência de transportadora única', 'Operacional', 3, 4, 3, 3, 'p-thiago', 'mitigando', 'Cláusula de contingência e rota alternativa homologada.', 100],
    ].forEach(([titulo, categoria, p, i, rp, ri, donoId, status, mitigacao, rev], k) => {
      S.riscos.push({ id: 'R-' + pad(k + 1).slice(1), titulo, categoria, descricao: '', p, i, residualP: rp, residualI: ri, donoId, status, mitigacao, revisadoEm: d(rev - 90), proximaRevisao: d(rev) });
    });

    /* ---------- políticas ---------- */
    [
      ['Política de Alçadas e Delegação de Autoridade', 'Governança', 'p-patricia', '3.1', -200, 165, 'Define quem decide o quê, até que valor, e as regras de escalonamento por risco, irreversibilidade e exceções.'],
      ['Código de Conduta e Ética', 'Compliance', 'p-andre', '4.0', -300, 65, 'Princípios de integridade, canais de denúncia e consequências por violações.'],
      ['Política de Conflito de Interesses e Partes Relacionadas', 'Governança', 'p-andre', '2.2', -420, -20, 'Exige declaração prévia de conflito e impedimento de voto em transações com partes relacionadas.'],
      ['Política de Compras e Contratações', 'Operações', 'p-thiago', '5.0', -150, 215, 'Cotação mínima, homologação de fornecedores e critérios de contratação direta.'],
      ['Política de Segurança da Informação', 'Tecnologia', 'p-juliana', '3.3', -360, 5, 'Classificação de dados, controle de acesso e uso de serviços externos de tratamento de dados.'],
      ['Política de Privacidade e Proteção de Dados (LGPD)', 'Compliance', 'p-andre', '2.0', -250, 115, 'Bases legais, direitos dos titulares e papéis de controlador e operador.'],
      ['Política de Gestão de Riscos Corporativos', 'Governança', 'p-patricia', '1.4', -330, 35, 'Metodologia 5×5, apetite a risco e ciclo de revisão do registro de riscos.'],
      ['Política de Trabalho Híbrido', 'Pessoas', 'p-leticia', '1.0', -60, 305, 'Modelo 3×2 para funções administrativas elegíveis (DEC-009).'],
      ['Política de Viagens e Despesas', 'Financeira', 'p-eduardo', '2.1', -190, 175, 'Limites por nível, antecedência mínima e prestação de contas.'],
    ].forEach(([titulo, categoria, donoId, versao, desde, prox, resumo], k) => {
      S.politicas.push({ id: 'POL-' + pad(k + 1).slice(1), titulo, categoria, donoId, versao, vigenteDesde: d(desde), proximaRevisao: d(prox), resumo, status: 'vigente' });
    });

    /* ---------- decisões ---------- */
    const mkDec = (x) => {
      const dec = {
        id: DID(x.n), titulo: x.titulo, tipoId: x.tipo, areaId: x.area, nivelDecisao: x.nivel || 'tatica', proponenteId: x.prop, valor: x.valor == null ? null : x.valor,
        irreversivel: !!x.irrev, excecaoPolitica: !!x.excecao, prazo: x.prazo == null ? d(30) : d(x.prazo), contexto: x.contexto || '', resultadoEsperado: x.esperado || '',
        premissas: x.premissas || '', gatilhos: x.gatilhos || '', alternativas: [], criterios: [], notas: {}, recomendacaoId: null, justificativa: x.just || '',
        riscosIds: (x.riscos || []).map((n) => 'R-' + pad(n).slice(1)), politicasIds: (x.pols || []).map((n) => 'POL-' + pad(n).slice(1)),
        rapid: { recomendaId: x.recomenda || x.prop, concordam: (x.conc || []).map(([pessoaId, resposta, nota, dias]) => ({ pessoaId, resposta, nota: nota || '', em: resposta ? d(dias == null ? -3 : dias) : null })), consultados: x.cons || [], executaId: x.exec || null },
        conflito: x.conflito === undefined ? { tipo: 'nenhum', texto: '' } : x.conflito, parecer: null, status: x.status, roteamento: null, selo: null,
        criadaEm: d(x.criada), submetidaEm: x.submetida == null ? null : d(x.submetida), decisao: null, execucaoInicioEm: null, concluidaEm: null, revisaoEm: x.revisaoEm == null ? null : d(x.revisaoEm), revisao: null,
        devolucoes: [], comentarios: (x.coment || []).map(([autorId, dias, texto], k) => ({ id: 'c' + x.n + k, autorId, em: tsOf(d(dias), 14), texto })), atualizadaEm: tsOf(d(x.atual == null ? -1 : x.atual), 11),
      };
      (x.alts || []).forEach(([nome, desc], k) => dec.alternativas.push({ id: 'alt' + x.n + '-' + k, nome, descricao: desc || '' }));
      (x.crits || []).forEach(([nome, peso], k) => dec.criterios.push({ id: 'crt' + x.n + '-' + k, nome, peso }));
      (x.notas || []).forEach((linha, ai) => {
        dec.notas[dec.alternativas[ai].id] = {};
        linha.forEach((n, ci) => { if (n) dec.notas[dec.alternativas[ai].id][dec.criterios[ci].id] = n; });
      });
      if (x.rec != null) dec.recomendacaoId = dec.alternativas[x.rec].id;
      if (x.parecer) dec.parecer = { forumId: 'f-car', resultado: x.parecer[0], texto: x.parecer[1], porId: 'p-ricardo', em: d(x.parecer[2]) };
      if (x.devolucao) dec.devolucoes.push({ em: d(x.devolucao[0]), porId: x.devolucao[1], texto: x.devolucao[2], instancia: 'Comitê Executivo' });
      S.decisoes.push(dec);
      return dec;
    };

    mkDec({
      n: 4, titulo: 'Hedge cambial de 50% da exposição em dólar nas importações (12 meses)', tipo: 'financeiro', area: 'a-fin', nivel: 'estrategica', prop: 'p-camila', recomenda: 'p-eduardo',
      valor: 12000000, status: 'revisada', criada: -90, submetida: -75, prazo: -63, revisaoEm: -15, atual: -10,
      contexto: '40% dos componentes são importados e faturados em dólar. A exposição líquida projetada é de US$ 2,2 mi por mês. Em 2025 a variação cambial consumiu 1,9 p.p. da margem EBITDA e o orçamento 2026 foi construído com câmbio médio de R$ 5,70.',
      esperado: 'Travar custo médio ≤ R$ 5,70/US$ para 50% da exposição e limitar a variação da margem EBITDA a ±0,5 p.p. no ano.',
      alts: [['Hedge de 50% com NDF escalonado'], ['Hedge de 100% da exposição'], ['Sem hedge (exposição natural)']],
      crits: [['Proteção da margem', 9], ['Custo da operação', 5], ['Flexibilidade e ganho de oportunidade', 4], ['Complexidade de gestão', 3]],
      notas: [[4, 4, 4, 4], [5, 2, 1, 3], [1, 5, 5, 5]], rec: 0,
      just: 'Protege a maior parte da margem mantendo espaço para capturar eventual apreciação do real e com custo de carregamento aceitável.',
      riscos: [3], pols: [], conc: [['p-marcelo', 'de_acordo', '', -78]], cons: ['p-eduardo'], exec: 'p-eduardo',
      parecer: ['favoravel', 'Operação alinhada à política de tesouraria. Recomenda-se relatório mensal de efetividade do hedge ao Comitê.', -68],
    });
    mkDec({
      n: 6, titulo: 'Aquisição da Fertex Distribuidora (100% do capital)', tipo: 'mna', area: 'a-fin', nivel: 'estrategica', prop: 'p-camila', valor: 42000000, irrev: true,
      status: 'rejeitada', criada: -80, submetida: -50, prazo: -35, atual: -35,
      contexto: 'A Fertex distribui componentes no Centro-Oeste, com receita de R$ 210 mi e margem EBITDA de 6%. A aquisição ampliaria o alcance comercial e reduziria o custo de distribuição, mas exige alavancagem de 2,4x dívida líquida/EBITDA e a integração de 380 colaboradores.',
      esperado: 'Sinergias de R$ 18 mi/ano em 24 meses; TIR ≥ 14%; alavancagem ≤ 2,0x em 36 meses.',
      premissas: 'Retenção de 85% da carteira de clientes da Fertex nos 12 primeiros meses; custo de integração limitado a R$ 6 mi.',
      gatilhos: 'Não prosseguir se a due diligence apontar contingências acima de R$ 8 mi ou se a alavancagem projetada passar de 2,5x.',
      alts: [['Aquisição de 100% do capital'], ['Aquisição de 51% com opção de compra do restante'], ['Parceria comercial sem participação societária'], ['Não adquirir']],
      crits: [['Retorno financeiro', 8], ['Alavancagem e risco financeiro', 9], ['Aderência estratégica', 7], ['Complexidade de integração', 6]],
      notas: [[4, 2, 4, 2], [3, 3, 4, 3], [2, 5, 3, 5], [1, 5, 1, 5]], rec: 0,
      just: 'A aquisição integral garante controle da integração e captura total das sinergias projetadas.',
      riscos: [3, 11], conc: [['p-marcelo', 'de_acordo', '', -55], ['p-andre', 'ressalva', 'Há contingências trabalhistas na Fertex a quantificar antes de qualquer sinal de compra.', -54]],
      parecer: ['ressalvas', 'Alavancagem projetada no limite do covenant. A matriz do próprio estudo favorece a opção de parceria; recomenda-se justificar a divergência.', -45],
    });
    mkDec({
      n: 9, titulo: 'Política de trabalho híbrido (3 dias presenciais × 2 remotos)', tipo: 'politica', area: 'a-pes', nivel: 'tatica', prop: 'p-leticia', valor: 480000,
      status: 'concluida', criada: -100, submetida: -85, prazo: -75, revisaoEm: -7, atual: -35,
      contexto: 'Em pesquisa de clima, 62% dos colaboradores administrativos pedem flexibilidade e a rotatividade nessas funções subiu para 21% ao ano (meta: 14%). A política vigente exige presença integral e não existem regras para o trabalho remoto parcial.',
      esperado: 'Rotatividade administrativa ≤ 15% em 12 meses, entregas no prazo ≥ 92% e eNPS ≥ +30.',
      alts: [['Híbrido 3×2 para funções administrativas'], ['Presencial integral com bônus de assiduidade'], ['Remoto total para funções elegíveis']],
      crits: [['Retenção de talentos', 8], ['Produtividade e colaboração', 8], ['Custo e infraestrutura', 5], ['Cultura e liderança', 6]],
      notas: [[4, 4, 4, 4], [2, 4, 3, 3], [5, 3, 5, 2]], rec: 0,
      just: 'Equilibra retenção e colaboração presencial; permite revisão em 90 dias com dados reais de produtividade.',
      riscos: [6], conc: [['p-marcelo', 'de_acordo', '', -92], ['p-andre', 'de_acordo', '', -91]], cons: ['p-mariana'], exec: 'p-mariana',
      coment: [['p-andre', -88, 'Incluir cláusula sobre ergonomia e reembolso de despesas de home office para evitar passivo trabalhista.'], ['p-leticia', -87, 'Incorporado ao texto da política (seção 5).']],
    });
    mkDec({
      n: 11, titulo: 'Consolidar três transportadoras rodoviárias em contrato único de 36 meses', tipo: 'contrato', area: 'a-sup', nivel: 'tatica', prop: 'p-thiago', valor: 7200000,
      status: 'execucao', criada: -50, submetida: -32, prazo: -21, atual: -2,
      contexto: 'Hoje operamos com três transportadoras sem contrato de volume. O frete representa 7,8% da receita e o OTIF (entrega completa no prazo) está em 87%, abaixo da meta de 94%. Um contrato único (R$ 2,4 mi/ano, R$ 7,2 mi em 36 meses) permite SLA, multas e ganho de escala.',
      esperado: 'Reduzir o custo de frete em 9% (≈ R$ 1,4 mi/ano) e elevar o OTIF para ≥ 94% em 6 meses.',
      alts: [['Contrato único com a Rota Sul (36 meses)'], ['Manter as três com contratos de volume'], ['Dois contratos regionais (Sul e Sudeste)']],
      crits: [['Custo logístico', 8], ['Nível de serviço (OTIF)', 8], ['Risco de dependência', 6], ['Facilidade de transição', 4]],
      notas: [[5, 4, 2, 3], [2, 3, 4, 5], [4, 4, 3, 3]], rec: 0,
      just: 'Maior economia e melhor nível de serviço contratável; a dependência é mitigada por cláusula de contingência e rota alternativa homologada.',
      riscos: [12], pols: [4], conc: [['p-camila', 'de_acordo', '', -36], ['p-gustavo', 'ressalva', 'Exigir SLA com multa e rota de contingência para clientes críticos.', -35]], cons: ['p-diego'], exec: 'p-thiago',
    });
    mkDec({
      n: 12, titulo: 'Terceirizar a operação do centro de distribuição de Betim (5 anos)', tipo: 'contrato', area: 'a-ops', nivel: 'tatica', prop: 'p-rodrigo', valor: 7400000,
      status: 'analise', criada: -40, submetida: null, prazo: 14, atual: -9,
      contexto: 'O CD de Betim opera com 210 colaboradores próprios e custo logístico 14% acima do benchmark. Um operador especializado assumiria a operação e os investimentos em automação, com SLA contratual por cinco anos.',
      esperado: 'Reduzir o custo por pedido em 12% e evitar o investimento de R$ 3,5 mi em automação nos próximos 3 anos.',
      alts: [['Terceirização total para operador logístico'], ['Terceirização parcial (picking e expedição)'], ['Manter operação própria com automação']],
      crits: [['Custo total', 8], ['Risco trabalhista e reputacional', 8], ['Nível de serviço', 7], ['Controle operacional', 5]],
      notas: [[5, 1, 4, 2], [4, 3, 4, 3], [2, 5, 3, 5]], rec: 1,
      just: 'A terceirização parcial captura boa parte da economia com risco trabalhista menor que a total.',
      riscos: [9, 6], conc: [['p-leticia', 'de_acordo', '', -20], ['p-andre', 'ressalva', 'Necessário parecer sobre sucessão trabalhista e responsabilidade solidária.', -18]],
      devolucao: [-9, 'p-marcelo', 'O ExCo adiou a deliberação: falta quantificar o passivo trabalhista da terceirização e o impacto reputacional junto ao sindicato. Retornar com parecer jurídico e simulação de custo de desligamento.'],
      coment: [['p-marcelo', -9, 'Adiado na reunião do ExCo. Rodrigo, traga o levantamento de passivo (ACT-06) e uma alternativa com transição gradual.']],
    });
    mkDec({
      n: 14, titulo: 'Expansão da planta de Joinville — linha 4 de estampagem', tipo: 'capex', area: 'a-ops', nivel: 'estrategica', prop: 'p-rodrigo', valor: 18500000, irrev: true,
      status: 'deliberacao', criada: -45, submetida: -12, prazo: 14, atual: -2,
      contexto: 'A demanda do segmento automotivo cresce 18% ao ano e a planta de Joinville opera com 94% de utilização desde o 2º trimestre. Em 2026, 11% dos pedidos foram recusados por falta de capacidade (≈ R$ 46 mi de receita). Contratos-âncora com duas montadoras exigem a ampliação até o 1º semestre de 2028.',
      esperado: 'Receita adicional de R$ 62 mi/ano a partir do 3º ano; TIR ≥ 17%; payback ≤ 5,5 anos; utilização da planta entre 78% e 85%.',
      premissas: 'Contratos-âncora cobrem ≥ 80% do volume projetado; câmbio médio ≤ R$ 5,60/US$ nos equipamentos importados; licenciamento ambiental em até 9 meses.',
      gatilhos: 'Suspender o desembolso da fase 2 se (i) os contratos-âncora cobrirem < 65% da capacidade nova até dez/2027 ou (ii) o custo total ultrapassar 12% do orçamento aprovado.',
      alts: [['Linha 4 em Joinville (brownfield)', 'Amplia a planta existente em 2 fases, aproveitando utilidades e logística.'], ['Nova planta em Camaçari (greenfield)', 'Investimento de R$ 61 mi; mais capacidade, mais prazo.'], ['Terceirizar o excedente em estampadores parceiros', 'Sem CAPEX; margem menor e risco de qualidade.'], ['Não expandir (manter status quo)']],
      crits: [['Retorno financeiro', 9], ['Risco de execução', 7], ['Aderência estratégica', 8], ['Flexibilidade e reversibilidade', 5], ['Prazo até a operação', 6]],
      notas: [[4, 4, 5, 2, 4], [3, 2, 4, 3, 1], [2, 4, 2, 5, 5], [1, 5, 1, 5, 5]], rec: 0,
      just: 'Melhor retorno ajustado ao risco, aproveita a infraestrutura existente e atende ao prazo dos contratos-âncora. O risco de execução é mitigado pela contratação em lotes.',
      riscos: [10, 3, 2], pols: [4], conc: [['p-camila', 'de_acordo', '', -14], ['p-andre', 'ressalva', 'Condicionar o 2º lote à emissão da licença ambiental definitiva.', -13], ['p-fernanda', 'de_acordo', '', -13]],
      cons: ['p-diego', 'p-eduardo', 'p-thiago'], exec: 'p-diego',
      parecer: ['ressalvas', 'Favorável, com ressalvas: (1) fasear o desembolso em dois lotes com gatilho de contratos; (2) revisar o plano de hedge dos equipamentos importados.', -8],
      coment: [['p-ricardo', -7, 'No parecer do CAR deixei registrado o gatilho de contratos. Gostaria de ver a sensibilidade da TIR com utilização de 70%.'], ['p-rodrigo', -6, 'Sensibilidade anexada à proposta: com 70% de utilização a TIR cai para 13,8%, abaixo da meta mas acima do custo de capital.']],
    });
    mkDec({
      n: 15, titulo: 'Migração do ERP legado para plataforma em nuvem', tipo: 'tecnologia', area: 'a-ti', nivel: 'estrategica', prop: 'p-fernanda', valor: 6200000,
      status: 'deliberacao', criada: -30, submetida: -6, prazo: 7, atual: -1,
      contexto: 'O ERP atual (2011) sai do suporte do fabricante em dez/2028, roda em infraestrutura própria com 14 customizações críticas e responde por 31% dos incidentes de TI. O fechamento contábil leva 9 dias úteis, contra 4 do benchmark. Postergar eleva o risco de parada no faturamento e de não conformidade com as novas exigências de documentos fiscais eletrônicos de 2027.',
      esperado: 'Fechamento contábil em até 5 dias úteis; redução de 40% nos incidentes de TI; payback em 4 anos; go-live sem parada de faturamento superior a 8 horas.',
      alts: [['ERP em nuvem — plataforma única, go-live por filial'], ['ERP modular em nuvem — migração por ondas'], ['Modernizar o ERP atual e estender o suporte'], ['Não migrar (manter status quo)']],
      crits: [['Aderência funcional', 8], ['Custo total em 5 anos', 7], ['Risco de implantação', 8], ['Escalabilidade e integração', 6], ['Esforço de gestão da mudança', 4]],
      notas: [[5, 3, 2, 5, 2], [4, 4, 4, 4, 4], [3, 3, 3, 2, 4], [1, 5, 1, 1, 5]], rec: 1,
      just: 'Menor risco de implantação entre as opções que resolvem a obsolescência; a onda piloto (Financeiro e Fiscal) valida o fornecedor antes de comprometer o restante do orçamento.',
      riscos: [5, 1], pols: [5], conc: [['p-camila', 'de_acordo', '', -9], ['p-rodrigo', 'ressalva', 'O go-live não pode coincidir com a safra de pedidos de nov–dez.', -8]], cons: ['p-juliana', 'p-eduardo'], exec: 'p-juliana',
      coment: [['p-camila', -8, 'Concordo, desde que o orçamento de contingência (15%) fique explícito na proposta ao ExCo.'], ['p-fernanda', -7, 'Contingência de 15% incluída: R$ 0,8 mi dentro do valor total.']],
    });
    mkDec({
      n: 16, titulo: 'Contratação de seguro cibernético (cobertura de R$ 40 mi)', tipo: 'tecnologia', area: 'a-ti', nivel: 'tatica', prop: 'p-juliana', valor: 380000,
      status: 'deliberacao', criada: -14, submetida: -3, prazo: 5, atual: -3,
      contexto: 'Nos últimos 12 meses houve 3 incidentes de phishing com acesso indevido a contas e 1 tentativa de ransomware contida. Contratos com duas montadoras passam a exigir seguro cibernético com cobertura mínima de R$ 25 mi a partir de jan/2027.',
      esperado: 'Apólice vigente até 15/dez com cobertura ≥ R$ 40 mi e prêmio ≤ R$ 380 mil/ano, atendendo à exigência contratual das montadoras.',
      alts: [['Apólice de R$ 40 mi (Seguradora A)'], ['Apólice de R$ 25 mi (mínimo contratual)'], ['Autosseguro com reserva financeira']],
      crits: [['Cobertura e exclusões', 8], ['Prêmio anual', 6], ['Atendimento à exigência contratual', 9]],
      notas: [[5, 3, 5], [3, 4, 4], [1, 2, 1]], rec: 0,
      just: 'Cobertura robusta com prêmio dentro do orçamento; a apólice de R$ 25 mi deixaria folga zero frente ao mínimo contratual.',
      riscos: [1], pols: [5], conc: [['p-camila', 'de_acordo', '', -5]], exec: 'p-juliana',
    });
    mkDec({
      n: 17, titulo: 'Troca de operadora do plano de saúde corporativo', tipo: 'pessoas', area: 'a-pes', nivel: 'tatica', prop: 'p-mariana', valor: 2800000,
      status: 'rascunho', criada: -2, prazo: 45, atual: -1, conflito: null,
      contexto: 'O reajuste proposto pela operadora atual é de 17,8% para o próximo ciclo, acima da inflação médica de 12%.',
    });
    mkDec({
      n: 18, titulo: 'Piloto de IA generativa no atendimento ao cliente (90 dias)', tipo: 'tecnologia', area: 'a-com', nivel: 'tatica', prop: 'p-aline', valor: 650000, excecao: true,
      status: 'deliberacao', criada: -20, submetida: -2, prazo: 10, atual: -2,
      contexto: 'O SAC recebe 18 mil contatos por mês, com tempo médio de primeira resposta de 11 horas. O piloto usaria um modelo de linguagem de terceiro para sugerir respostas e classificar chamados, o que envolve enviar dados de clientes a um provedor externo — vedado hoje pela Política de Segurança da Informação (item 7.4) sem exceção formal.',
      esperado: 'Reduzir o tempo de primeira resposta de 11 h para ≤ 4 h e elevar a resolução no primeiro contato em 15 p.p. ao fim dos 90 dias, sem incidentes de privacidade.',
      alts: [['Piloto com provedor externo e dados anonimizados (exige exceção)'], ['Solução em ambiente próprio, sem dados saindo da rede'], ['Ampliar a equipe do SAC, sem IA']],
      crits: [['Impacto no tempo de resposta', 8], ['Risco de privacidade e segurança', 9], ['Custo do piloto', 5], ['Velocidade de implantação', 6]],
      notas: [[5, 2, 4, 5], [4, 5, 2, 2], [3, 5, 2, 3]], rec: 0,
      just: 'Único caminho que entrega resultado mensurável em 90 dias; o risco de privacidade é tratado com anonimização na origem, contrato de operador e RIPD prévio.',
      riscos: [4], pols: [5, 6], conc: [['p-andre', 'ressalva', 'Exigir RIPD, contrato de operador de dados e anonimização na origem antes do go-live.', -4], ['p-fernanda', 'de_acordo', '', -3]], exec: 'p-aline',
    });
    mkDec({
      n: 19, titulo: 'Plano de sucessão da Diretoria Industrial (COO)', tipo: 'estrategia', area: 'a-pes', nivel: 'estrategica', prop: 'p-leticia', valor: null,
      status: 'analise', criada: -8, prazo: 40, atual: -2, conflito: null,
      contexto: 'O atual COO completa 60 anos em 2028 e há apenas um sucessor interno mapeado com prontidão "pronto em 2–3 anos". A sucessão não planejada é um dos principais riscos de continuidade da operação industrial.',
      alts: [['Sucessão interna com programa de desenvolvimento de 18 meses'], ['Contratação externa de executivo industrial']],
      crits: [['Aderência à cultura', 7], ['Prazo de prontidão', 8]],
      notas: [[5, 3], [3]],
      conc: [['p-marcelo', null, ''], ['p-helena', null, '']],
    });

    /* ---------- reuniões ---------- */
    const votosDe = (spec) => { const o = {}; Object.keys(spec).forEach((v) => spec[v].forEach((pid) => (o[pid] = v))); return o; };
    const mkReu = (n, forumId, dias, hora, local, presentes, pauta, extra) => {
      const f = D.forum(forumId), past = dias < 0;
      const m = { id: RID(n), forumId, data: d(dias), hora, local, status: past ? 'realizada' : 'agendada', presentes, pauta: [], observacoes: (extra && extra.obs) || '', ata: null };
      pauta.forEach((p) => {
        const it = { decisaoId: DID(p.n), status: p.status || 'pendente', votos: p.votos ? votosDe(p.votos) : {}, resultado: null, nota: p.nota || '' };
        if (it.status === 'decidido') {
          const r = D.resolverVotacao(f, it.votos);
          it.resultado = r.resultado; it.contagem = r;
          const dec = D.decisao(DID(p.n));
          dec.decisao = { resultado: r.resultado, por: 'forum', forumId, reuniaoId: m.id, votos: { ...it.votos }, contagem: r, texto: it.nota, em: m.data };
        }
        m.pauta.push(it);
      });
      S.reunioes.push(m);
      return m;
    };
    const exco = D.forum('f-exco').membros, ca = D.forum('f-ca').membros;
    mkReu(1, 'f-exco', -75, '09:00', 'Sala do Comitê — 12º andar', exco.filter((x) => x !== 'p-gustavo'), [{ n: 9, status: 'decidido', votos: { aprova: ['p-marcelo', 'p-camila', 'p-rodrigo', 'p-fernanda', 'p-leticia'], abstem: ['p-andre'] }, nota: 'Aprovada com revisão de resultados em 90 dias após a conclusão. Jurídico abstém-se até a redação final da cláusula de ergonomia.' }]);
    mkReu(2, 'f-ca', -63, '14:00', 'Sala do Conselho', ca, [{ n: 4, status: 'decidido', votos: { aprova: ['p-helena', 'p-ricardo', 'p-beatriz', 'p-sergio'], abstem: ['p-paulo'] }, nota: 'Aprovada. Solicitado relatório mensal de efetividade do hedge ao CAR.' }]);
    mkReu(3, 'f-ca', -35, '14:00', 'Sala do Conselho', ca, [{ n: 6, status: 'decidido', votos: { aprova: ['p-paulo', 'p-sergio'], rejeita: ['p-helena', 'p-ricardo', 'p-beatriz'] }, nota: 'Rejeitada: alavancagem projetada incompatível com o apetite a risco e divergência entre a recomendação e a matriz. Reapresentar alternativa de parceria se houver interesse.' }]);
    mkReu(4, 'f-exco', -21, '09:00', 'Sala do Comitê — 12º andar', exco, [{ n: 11, status: 'decidido', votos: { aprova: ['p-marcelo', 'p-camila', 'p-rodrigo', 'p-fernanda', 'p-leticia', 'p-andre'], rejeita: ['p-gustavo'] }, nota: 'Aprovada com exigência de SLA com multa e rota de contingência (ressalva do Comercial).' }]);
    mkReu(5, 'f-exco', -9, '09:00', 'Sala do Comitê — 12º andar', exco.filter((x) => x !== 'p-fernanda'), [{ n: 12, status: 'adiado', nota: 'Adiada: falta quantificar passivo trabalhista e impacto reputacional. Devolvida à proponente.' }]);
    mkReu(6, 'f-exco', 7, '09:00', 'Sala do Comitê — 12º andar', [...exco], [{ n: 15 }]);
    mkReu(7, 'f-ca', 14, '14:00', 'Sala do Conselho', [...ca], [{ n: 14 }]);

    /* ---------- derivados das decisões ---------- */
    S.decisoes.forEach((dec) => {
      if (['deliberacao', 'aprovada', 'rejeitada', 'execucao', 'concluida', 'revisada'].includes(dec.status)) {
        dec.roteamento = D.rotear(dec);
        dec.selo = G.Store.seloConteudo(dec);
      }
      if (['execucao', 'concluida', 'revisada'].includes(dec.status)) dec.execucaoInicioEm = U.addDays(dec.decisao.em, 1);
      if (['concluida', 'revisada'].includes(dec.status)) dec.concluidaEm = dec.status === 'concluida' ? d(-35) : d(-30);
    });
    D.decisao(DID(4)).revisao = { resultado: 'superou', decisaoBoa: 'sim', kpiReal: 'Câmbio médio travado em R$ 5,41/US$ (orçamento: R$ 5,70). Economia de R$ 1,1 mi; variação de margem EBITDA limitada a +0,2 p.p.', licoes: 'A escalada em NDFs trimestrais deu flexibilidade sem custo relevante. Para o próximo ciclo, ampliar para 60% da exposição e automatizar o relatório de efetividade.', porId: 'p-camila', em: d(-10) };
    const mDec = (n) => D.decisao(DID(n));
    mDec(12).submetidaEm = null;

    /* ---------- ações ---------- */
    [
      [11, 'Assinar o contrato único com a Rota Sul', 'p-thiago', -8, 'concluida'],
      [11, 'Migrar as rotas da região Sul para a nova transportadora', 'p-thiago', 14, 'andamento'],
      [11, 'Encerrar os contratos das duas transportadoras remanescentes', 'p-thiago', -3, 'a_fazer'],
      [9, 'Publicar a política e treinar os gestores', 'p-mariana', -50, 'concluida'],
      [9, 'Medir engajamento e produtividade após 90 dias', 'p-mariana', -35, 'concluida'],
      [12, 'Levantar o passivo trabalhista da terceirização', 'p-andre', 10, 'andamento'],
      [14, 'Pré-qualificar fornecedores de prensas', 'p-diego', 30, 'a_fazer'],
      [15, 'Mapear as integrações críticas do ERP legado', 'p-juliana', 9, 'andamento'],
      [16, 'Obter cotações de 3 seguradoras', 'p-juliana', 4, 'andamento'],
      [18, 'Elaborar o relatório de impacto à proteção de dados (RIPD) do piloto', 'p-andre', 12, 'andamento'],
      [18, 'Definir escopo e métricas do piloto', 'p-aline', -2, 'concluida'],
      [null, 'Atualizar a matriz de alçadas após a revisão do estatuto social', 'p-patricia', 20, 'a_fazer'],
      [15, 'Validar a arquitetura-alvo do novo ERP com consultoria independente', 'p-fernanda', 3, 'andamento'],
    ].forEach(([n, titulo, responsavelId, dias, status], k) => {
      S.acoes.push({ id: 'ACT-' + pad(k + 1).slice(1), decisaoId: n ? DID(n) : null, titulo, responsavelId, prazo: d(dias), status, concluidaEm: status === 'concluida' ? d(Math.min(dias, -1)) : null });
    });

    /* ---------- atas e trilha de auditoria (cada evento encadeado por hash) ---------- */
    S.reunioes.filter((m) => m.status === 'realizada').forEach((m) => { m.ata = G.A.ataTexto(m); });
    const ev = [];
    const E = (date, hour, userId, entidade, id, acao, det) => ev.push({ ts: tsOf(date, hour), userId, entidade, id, acao, det });
    E(d(-420), 10, 'p-patricia', 'config', 'empresa', 'criou', 'Organização cadastrada: ' + S.empresa.nome);
    E(d(-120), 15, 'p-patricia', 'alcada', 'config', 'editou', 'Regras de escalonamento: apetite 15 · irreversível sim · risco sim · exceção sim · SoD sim');
    S.riscos.forEach((r) => E(d(-400), 11, r.donoId, 'risco', r.id, 'criou', r.titulo + ' · severidade ' + D.riscoScore(r)));
    S.politicas.forEach((p) => E(p.vigenteDesde, 16, p.donoId, 'politica', p.id, 'criou', p.titulo + ' v' + p.versao));
    S.decisoes.forEach((x) => {
      E(x.criadaEm, 9, x.proponenteId, 'decisao', x.id, 'criou', 'Decisão criada: ' + x.titulo);
      if (x.status !== 'rascunho') E(U.addDays(x.criadaEm, 1), 10, x.proponenteId, 'decisao', x.id, 'status', 'Rascunho → Em análise');
      (x.rapid.concordam || []).forEach((c) => { if (c.resposta) E(c.em, 15, c.pessoaId, 'decisao', x.id, 'concordância', D.nomePessoa(c.pessoaId) + ': ' + { de_acordo: 'de acordo', ressalva: 'de acordo com ressalva', veto: 'VETO' }[c.resposta] + (c.nota ? ' — ' + c.nota : '')); });
      if (x.parecer) E(x.parecer.em, 17, x.parecer.porId, 'decisao', x.id, 'parecer', 'CAR: ' + { favoravel: 'favorável', ressalvas: 'favorável com ressalvas', desfavoravel: 'DESFAVORÁVEL' }[x.parecer.resultado] + ' (' + D.nomePessoa(x.parecer.porId) + ')');
      x.devolucoes.forEach((v) => E(v.em, 12, v.porId, 'decisao', x.id, 'devolveu', 'Devolvida para complementação: ' + v.texto));
      if (x.roteamento) {
        const sub = x.submetidaEm || (x.decisao ? U.addDays(x.decisao.em, -12) : x.criadaEm);
        E(sub, 11, x.proponenteId, 'decisao', x.id, 'status', 'Em análise → Em deliberação · instância: ' + D.instanciaNome(x.roteamento) + ' · selo ' + x.selo.slice(0, 12));
      }
      if (x.decisao) {
        const r = x.decisao.contagem;
        E(x.decisao.em, 16, (D.forum(x.decisao.forumId) || {}).secretarioId || x.decisao.pessoaId, 'decisao', x.id, 'decidiu', (x.decisao.resultado === 'aprovada' ? 'APROVADA' : 'REJEITADA') + ' pelo ' + D.forum(x.decisao.forumId).sigla + (r ? ' (' + r.aprova + ' a favor, ' + r.rejeita + ' contra, ' + r.abstem + ' abst., ' + r.impedido + ' impedido(s))' : ''));
      }
      if (x.execucaoInicioEm) E(x.execucaoInicioEm, 9, x.proponenteId, 'decisao', x.id, 'status', 'Aprovada → Em execução');
      if (x.concluidaEm) E(x.concluidaEm, 17, x.proponenteId, 'decisao', x.id, 'status', 'Em execução → Concluída · revisão pós-decisão em ' + U.fmtDate(x.revisaoEm));
      if (x.revisao) E(x.revisao.em, 11, x.revisao.porId, 'decisao', x.id, 'revisou', 'Revisão pós-decisão: ' + D.RESULTADO_REV[x.revisao.resultado] + ' · qualidade da decisão: boa');
      x.comentarios.forEach((c) => ev.push({ ts: c.em, userId: c.autorId, entidade: 'decisao', id: x.id, acao: 'comentou', det: c.texto.slice(0, 120) }));
    });
    S.reunioes.forEach((m) => {
      const f = D.forum(m.forumId);
      E(U.addDays(m.data, -10) > T ? d(-6) : U.addDays(m.data, -10), 10, 'p-patricia', 'reuniao', m.id, 'agendou', f.sigla + ' em ' + U.fmtDate(m.data));
      m.pauta.forEach((p) => E(U.addDays(m.data, -3) > T ? d(-2) : U.addDays(m.data, -3), 10, 'p-patricia', 'reuniao', m.id, 'pauta', 'Incluída na pauta: ' + p.decisaoId));
      if (m.status === 'realizada') E(m.data, 18, 'p-patricia', 'reuniao', m.id, 'encerrou', 'Reunião encerrada e ata gerada (' + m.pauta.length + ' item(ns))');
    });
    S.acoes.forEach((a) => E(U.addDays(T, Math.min(-1, (U.diffDays(T, a.prazo)) - 20)), 10, a.responsavelId, 'acao', a.id, 'criou', a.titulo + (a.decisaoId ? ' (' + a.decisaoId + ')' : '')));
    ev.sort((a, b) => a.ts.localeCompare(b.ts)).forEach((e) => G.Store.log(e.entidade, e.id, e.acao, e.det, { ts: e.ts, userId: e.userId }));
    return S;
  };

  G.Seed = Seed;
})(window);
