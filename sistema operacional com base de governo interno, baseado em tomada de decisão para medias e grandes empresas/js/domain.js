/* João — regras de domínio (funções puras sobre o estado) */
(function (G) {
  'use strict';
  const U = G.U;
  const D = {};

  /* ---------- vocabulário ---------- */
  D.STATUS = {
    rascunho:    { label: 'Rascunho',        icon: 'circle', tone: 'neutral' },
    analise:     { label: 'Em análise',      icon: 'dot',    tone: 'info' },
    deliberacao: { label: 'Em deliberação',  icon: 'half',   tone: 'accent' },
    aprovada:    { label: 'Aprovada',        icon: 'check',  tone: 'good' },
    rejeitada:   { label: 'Rejeitada',       icon: 'x',      tone: 'critical' },
    execucao:    { label: 'Em execução',     icon: 'play',   tone: 'info' },
    concluida:   { label: 'Concluída',       icon: 'flag',   tone: 'good' },
    revisada:    { label: 'Revisada',        icon: 'shieldCheck', tone: 'neutral' },
    cancelada:   { label: 'Cancelada',       icon: 'ban',    tone: 'neutral' },
  };
  D.STEPS = [
    { key: 'rascunho', label: 'Rascunho' }, { key: 'analise', label: 'Análise' }, { key: 'deliberacao', label: 'Deliberação' },
    { key: 'decisao', label: 'Decisão' }, { key: 'execucao', label: 'Execução' }, { key: 'concluida', label: 'Concluída' }, { key: 'revisada', label: 'Revisada' },
  ];
  D.stepIndex = (st) => ({ rascunho: 0, analise: 1, deliberacao: 2, aprovada: 3, rejeitada: 3, execucao: 4, concluida: 5, revisada: 6, cancelada: -1 }[st]);
  D.ABERTAS = ['rascunho', 'analise', 'deliberacao'];
  D.NIVEL_DECISAO = { estrategica: 'Estratégica', tatica: 'Tática', operacional: 'Operacional' };
  D.VOTOS = { aprova: 'A favor', rejeita: 'Contra', abstem: 'Abstenção', impedido: 'Impedido' };
  D.REGRAS = {
    maioria: 'Maioria simples',
    dois_tercos: 'Maioria qualificada (2/3)',
    unanimidade: 'Unanimidade (sem votos contrários)',
  };
  D.RISCO_CATS = ['Estratégico', 'Financeiro', 'Operacional', 'Compliance e regulatório', 'Tecnologia e cibersegurança', 'Pessoas', 'Reputacional e ESG'];
  D.POL_CATS = ['Governança', 'Compliance', 'Financeira', 'Pessoas', 'Tecnologia', 'Operações'];
  D.ACAO_STATUS = { a_fazer: 'A fazer', andamento: 'Em andamento', concluida: 'Concluída', bloqueada: 'Bloqueada' };
  D.RESULTADO_REV = { superou: 'Superou o esperado', atendeu: 'Atendeu ao esperado', abaixo: 'Ficou abaixo do esperado' };
  D.QUALIDADE_REV = { sim: 'Boa decisão, dada a informação disponível', parcial: 'Parcialmente: faltou informação ou análise', nao: 'Não: o processo de decisão falhou' };

  /* ---------- acesso ao estado ---------- */
  D.S = () => G.Store.state;
  const find = (arr, id) => (arr || []).find((x) => x.id === id) || null;
  D.pessoa = (id) => find(D.S().pessoas, id);
  D.area = (id) => find(D.S().areas, id);
  D.forum = (id) => find(D.S().foruns, id);
  D.decisao = (id) => find(D.S().decisoes, id);
  D.risco = (id) => find(D.S().riscos, id);
  D.politica = (id) => find(D.S().politicas, id);
  D.tipo = (id) => find(D.S().tipos, id);
  D.reuniao = (id) => find(D.S().reunioes, id);
  D.acao = (id) => find(D.S().acoes, id);
  D.user = () => D.pessoa(D.S().usuarioId);
  D.isAdmin = (p) => !!p && p.perfil === 'admin';
  D.nivel = (n) => D.S().niveis.find((x) => x.n === n);
  D.nomePessoa = (id) => (D.pessoa(id) || {}).nome || '—';

  /* ---------- riscos ---------- */
  D.riscoScore = (r, inerente) => (!inerente && r.residualP && r.residualI ? r.residualP * r.residualI : r.p * r.i);
  D.riscoNivel = (score) => (score >= 15 ? 'critico' : score >= 10 ? 'alto' : score >= 5 ? 'medio' : 'baixo');
  D.RISCO_NIVEL = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' };
  D.riscoAtivo = (r) => r.status !== 'encerrado';
  D.acimaApetite = (r) => D.riscoAtivo(r) && D.riscoScore(r) >= D.S().config.apetiteRisco;

  /* ---------- políticas ---------- */
  D.politicaSituacao = (p) => {
    if (p.status === 'rascunho') return 'rascunho';
    const dias = U.diffDays(U.today(), p.proximaRevisao);
    return dias < 0 ? 'vencida' : dias <= 45 ? 'a_vencer' : 'vigente';
  };

  /* ---------- roteamento de alçada ---------- */
  D.parecerExigido = (d) => {
    const t = D.tipo(d.tipoId);
    if (!t || !t.parecer) return null;
    return (d.valor || 0) >= t.parecer.acima ? t.parecer : null;
  };
  D.faixasOrdenadas = (t) => [...t.faixas].sort((a, b) => (a.ate == null ? Infinity : a.ate) - (b.ate == null ? Infinity : b.ate));
  D.maxRiscoVinculado = (d) => {
    let best = null;
    (d.riscosIds || []).forEach((id) => {
      const r = D.risco(id);
      if (!r || !D.riscoAtivo(r)) return;
      const s = D.riscoScore(r);
      if (!best || s > best.score) best = { risco: r, score: s };
    });
    return best;
  };
  D.rotear = (d) => {
    const S = D.S(), cfg = S.config, niveis = S.niveis, max = Math.max(...niveis.map((n) => n.n));
    const tipo = D.tipo(d.tipoId) || S.tipos[0];
    const valor = d.valor || 0;
    const faixas = D.faixasOrdenadas(tipo);
    let idx = faixas.findIndex((f) => f.ate == null || valor <= f.ate);
    if (idx < 0) idx = faixas.length - 1;
    const faixa = faixas[idx];
    let nivel = faixa.nivel;
    const motivos = [];
    const faixaTxt = faixa.ate == null ? (idx > 0 && faixas[idx - 1].ate != null ? 'acima de ' + U.moneyC(faixas[idx - 1].ate) : 'qualquer valor') : 'até ' + U.moneyC(faixa.ate);
    motivos.push({ kind: 'base', txt: tipo.nome + (valor ? ' de ' + U.moneyC(valor) : ' sem valor financeiro') + ' — faixa ' + faixaTxt + ': ' + D.nivel(nivel).nome });
    const bump = (txt) => {
      if (nivel < max) { nivel++; motivos.push({ kind: 'bump', txt: txt + ' → sobe para ' + D.nivel(nivel).nome }); } else motivos.push({ kind: 'info', txt: txt + ' (já está na instância máxima)' });
    };
    if (cfg.bumpIrreversivel && d.irreversivel) bump('Decisão irreversível (Tipo 1)');
    const mr = D.maxRiscoVinculado(d);
    if (cfg.bumpRisco && mr && mr.score >= cfg.apetiteRisco) bump('Risco ' + mr.risco.id + ' com severidade ' + mr.score + ' (apetite: ' + cfg.apetiteRisco + ')');
    if (cfg.bumpExcecao && d.excecaoPolitica) bump('Exceção a política interna');
    // instância → pessoa/fórum, com segregação de funções
    const area = D.area(d.areaId) || {};
    let inst = D.nivel(nivel), decisorId = null, forumId = null, guard = 0;
    const resolve = () => {
      inst = D.nivel(nivel); decisorId = null; forumId = null;
      if (inst.tipo === 'forum') forumId = inst.forumId;
      else decisorId = inst.cargo === 'gerente' ? area.gerenteId : area.diretorId;
    };
    resolve();
    while (inst.tipo === 'cargo' && nivel < max && guard++ < 6) {
      if (!decisorId) { motivos.push({ kind: 'bump', txt: 'Área sem ' + inst.cargo + ' cadastrado → sobe para o nível seguinte' }); nivel++; resolve(); continue; }
      if (cfg.sod && decisorId === d.proponenteId) {
        motivos.push({ kind: 'sod', txt: 'Segregação de funções: ' + D.nomePessoa(decisorId) + ' é o proponente e não pode decidir a própria proposta → sobe para ' + D.nivel(nivel + 1).nome });
        nivel++; resolve(); continue;
      }
      break;
    }
    return { nivel, instancia: inst, decisorId, forumId, motivos };
  };
  D.instanciaNome = (rot) => {
    if (!rot) return '—';
    if (rot.forumId) { const f = D.forum(rot.forumId); return f ? f.nome : rot.instancia.nome; }
    return rot.instancia.nome + (rot.decisorId ? ' · ' + D.nomePessoa(rot.decisorId) : '');
  };
  D.rotaAtual = (d) => d.roteamento || D.rotear(d);

  /* ---------- matriz multicritério ---------- */
  D.matriz = (d, pesos) => {
    const W = pesos || d.criterios.map((c) => c.peso);
    const tot = U.sum(W);
    return d.alternativas.map((a) => {
      let s = 0, preenchidos = 0;
      d.criterios.forEach((c, i) => {
        const n = (d.notas[a.id] || {})[c.id];
        if (n) preenchidos++;
        s += W[i] * (n || 0);
      });
      return { alt: a, score: tot ? (s / (tot * 5)) * 100 : 0, preenchidos, total: d.criterios.length };
    });
  };
  D.analiseMatriz = (d) => {
    const rows = D.matriz(d);
    const ordenadas = [...rows].sort((a, b) => b.score - a.score);
    const completo = rows.length > 0 && rows.every((r) => r.preenchidos === r.total);
    if (!ordenadas.length || !d.criterios.length) return { rows, ordenadas, lider: null, margem: 0, robusta: true, sensivelA: [], completo: false };
    const lider = ordenadas[0];
    const margem = ordenadas.length > 1 ? lider.score - ordenadas[1].score : 0;
    const sensivelA = [];
    d.criterios.forEach((c, i) => {
      [0.5, 1.5].forEach((f) => {
        const W = d.criterios.map((x, j) => (j === i ? x.peso * f : x.peso));
        const top = [...D.matriz(d, W)].sort((a, b) => b.score - a.score)[0];
        if (top.alt.id !== lider.alt.id && !sensivelA.includes(c.nome)) sensivelA.push(c.nome);
      });
    });
    return { rows, ordenadas, lider, margem, robusta: sensivelA.length === 0, sensivelA, completo };
  };

  /* ---------- prontidão para deliberar ---------- */
  D.prontidao = (d) => {
    const itens = [];
    const add = (id, label, ok, req, hint) => itens.push({ id, label, ok: !!ok, req, hint });
    add('contexto', 'Problema e contexto descritos', (d.contexto || '').trim().length >= 40, true, 'Descreva o problema, a urgência e o que acontece se nada for feito (mín. 40 caracteres).');
    add('alternativas', 'Ao menos 2 alternativas (inclua "não fazer nada")', d.alternativas.length >= 2, true, 'Decidir é escolher entre opções reais. Cadastre pelo menos duas.');
    const am = D.analiseMatriz(d);
    add('criterios', 'Critérios ponderados e todas as notas preenchidas', d.criterios.length >= 2 && am.completo, true, 'Defina ao menos 2 critérios com peso e dê nota a cada alternativa.');
    add('recomendacao', 'Recomendação fundamentada', !!d.recomendacaoId && (d.justificativa || '').trim().length >= 20, true, 'Escolha a alternativa recomendada e justifique (mín. 20 caracteres).');
    add('resultado', 'Resultado esperado e métrica de sucesso', (d.resultadoEsperado || '').trim().length >= 10, true, 'Como saberemos que deu certo? Defina métrica, meta e prazo.');
    add('riscos', 'Riscos avaliados e vinculados', (d.riscosIds || []).length >= 1, false, 'Vincule os riscos do registro corporativo afetados por esta decisão.');
    add('conflito', 'Conflito de interesses declarado', !!d.conflito, true, 'O proponente deve declarar se há (ou não) conflito de interesses.');
    const pend = (d.rapid.concordam || []).filter((c) => !c.resposta).length;
    const veto = (d.rapid.concordam || []).filter((c) => c.resposta === 'veto').length;
    if ((d.rapid.concordam || []).length) add('concordancias', 'Concordâncias obtidas, sem veto em aberto', pend === 0 && veto === 0, true, veto ? 'Há veto em aberto: resolva com quem vetou.' : pend + ' pessoa(s) ainda não responderam.');
    const pe = D.parecerExigido(d);
    if (pe) add('parecer', 'Parecer prévio do ' + ((D.forum(pe.forumId) || {}).sigla || 'comitê'), !!d.parecer, true, 'Esta alçada exige parecer prévio do ' + ((D.forum(pe.forumId) || {}).nome || 'comitê') + '.');
    if (d.irreversivel) add('gatilhos', 'Premissas críticas e gatilhos de reversão', (d.premissas || '').trim().length >= 10 && (d.gatilhos || '').trim().length >= 10, true, 'Decisão irreversível exige premissas explícitas e critérios para parar/rever.');
    const ok = itens.filter((i) => i.ok).length;
    const bloqueios = itens.filter((i) => i.req && !i.ok);
    return { itens, ok, total: itens.length, pct: Math.round((ok / itens.length) * 100), bloqueios, pronta: bloqueios.length === 0 };
  };

  /* ---------- votação ---------- */
  D.contaVotos = (votos) => {
    const c = { aprova: 0, rejeita: 0, abstem: 0, impedido: 0 };
    Object.values(votos || {}).forEach((v) => { if (c[v] != null) c[v]++; });
    return c;
  };
  D.quorum = (forum, presentes) => ({ ok: presentes.length >= forum.quorum, presentes: presentes.length, minimo: forum.quorum });
  D.resolverVotacao = (forum, votos) => {
    const c = D.contaVotos(votos), validos = c.aprova + c.rejeita;
    const out = { ...c, validos, resultado: 'sem_votos', minerva: false, regra: forum.regra };
    if (!validos) return out;
    if (forum.regra === 'dois_tercos') {
      out.necessarios = Math.ceil((validos * 2) / 3);
      out.resultado = c.aprova >= out.necessarios ? 'aprovada' : 'rejeitada';
    } else if (forum.regra === 'unanimidade') {
      out.necessarios = validos;
      out.resultado = c.rejeita === 0 && c.aprova > 0 ? 'aprovada' : 'rejeitada';
    } else {
      out.necessarios = Math.floor(validos / 2) + 1;
      if (c.aprova > c.rejeita) out.resultado = 'aprovada';
      else if (c.rejeita > c.aprova) out.resultado = 'rejeitada';
      else {
        const vp = (votos || {})[forum.presidenteId];
        if (forum.minerva && (vp === 'aprova' || vp === 'rejeita')) { out.resultado = vp === 'aprova' ? 'aprovada' : 'rejeitada'; out.minerva = true; } else out.resultado = 'empate';
      }
    }
    return out;
  };

  /* ---------- permissões ---------- */
  D.podeEditarDecisao = (d, u) => !!u && ['rascunho', 'analise'].includes(d.status) && (D.isAdmin(u) || u.id === d.proponenteId || u.id === d.rapid.recomendaId);
  D.ehDecisorIndividual = (d, u) => !!u && d.status === 'deliberacao' && d.roteamento && d.roteamento.decisorId === u.id;
  D.secretariaReuniao = (m, u) => {
    if (!u) return false;
    const f = D.forum(m.forumId);
    return D.isAdmin(u) || (f && (f.secretarioId === u.id || f.presidenteId === u.id));
  };

  /* ---------- métricas ---------- */
  D.metricas = () => {
    const S = D.S(), hoje = U.today();
    const dec = S.decisoes;
    const decididas = dec.filter((d) => d.decisao);
    const ciclos = decididas.filter((d) => d.submetidaEm && d.decisao.em).map((d) => Math.max(0, U.diffDays(d.submetidaEm, d.decisao.em)));
    const aprov = decididas.filter((d) => d.decisao.resultado === 'aprovada').length;
    const funil = {};
    Object.keys(D.STATUS).forEach((k) => (funil[k] = 0));
    dec.forEach((d) => funil[d.status]++);
    const porNivel = {};
    S.niveis.forEach((n) => (porNivel[n.n] = 0));
    dec.filter((d) => d.roteamento).forEach((d) => porNivel[d.roteamento.nivel]++);
    const qual = { sim_superou: 0, sim_atendeu: 0, sim_abaixo: 0, parcial: 0, nao: 0 };
    dec.filter((d) => d.revisao).forEach((d) => {
      const r = d.revisao;
      if (r.decisaoBoa === 'sim') qual['sim_' + r.resultado]++;
      else qual[r.decisaoBoa]++;
    });
    return {
      abertas: dec.filter((d) => D.ABERTAS.includes(d.status)).length,
      aguardando: dec.filter((d) => d.status === 'deliberacao').length,
      cicloMedio: ciclos.length ? U.avg(ciclos) : null,
      cicloMediana: ciclos.length ? U.median(ciclos) : null,
      aprovacao: decididas.length ? (aprov / decididas.length) * 100 : null,
      decididas: decididas.length,
      revisoesAtrasadas: dec.filter((d) => d.status === 'concluida' && d.revisaoEm && d.revisaoEm < hoje).length,
      riscosAcima: S.riscos.filter(D.acimaApetite).length,
      politicasVencidas: S.politicas.filter((p) => D.politicaSituacao(p) === 'vencida').length,
      acoesAtrasadas: S.acoes.filter((a) => a.status !== 'concluida' && a.prazo < hoje).length,
      funil, porNivel, qual, revisadas: dec.filter((d) => d.revisao).length,
    };
  };

  /* ---------- caixa de entrada (o que espera cada pessoa) ---------- */
  D.inbox = (uid) => {
    const S = D.S(), hoje = U.today(), out = [];
    S.decisoes.forEach((d) => {
      if (d.status === 'deliberacao' && d.roteamento && d.roteamento.decisorId === uid)
        out.push({ tipo: 'decidir', icon: 'scale', titulo: 'Decidir: ' + d.titulo, meta: d.id + ' · ' + D.instanciaNome(d.roteamento), data: d.prazo, href: '#/decisoes/' + d.id, cta: 'Decidir', urg: 1 });
      if (['rascunho', 'analise', 'deliberacao'].includes(d.status)) {
        const c = (d.rapid.concordam || []).find((x) => x.pessoaId === uid && !x.resposta);
        if (c) out.push({ tipo: 'concordar', icon: 'checks', titulo: 'Dar sua concordância: ' + d.titulo, meta: d.id + ' · você é "Concorda" (RAPID)', data: d.prazo, href: '#/decisoes/' + d.id, cta: 'Responder', urg: 2 });
        const pe = D.parecerExigido(d);
        const fo = pe && D.forum(pe.forumId);
        if (fo && !d.parecer && fo.membros.includes(uid) && d.status !== 'rascunho')
          out.push({ tipo: 'parecer', icon: 'shieldCheck', titulo: 'Emitir parecer do ' + fo.sigla + ': ' + d.titulo, meta: d.id + ' · parecer prévio obrigatório', data: d.prazo, href: '#/decisoes/' + d.id, cta: 'Emitir', urg: 2 });
      }
      if (d.status === 'concluida' && d.proponenteId === uid && d.revisaoEm && d.revisaoEm <= U.addDays(hoje, 7))
        out.push({ tipo: 'revisar', icon: 'target', titulo: 'Revisar resultado: ' + d.titulo, meta: d.id + ' · revisão pós-decisão ' + (d.revisaoEm < hoje ? 'atrasada' : 'prevista'), data: d.revisaoEm, href: '#/decisoes/' + d.id, cta: 'Revisar', urg: d.revisaoEm < hoje ? 1 : 3 });
    });
    S.reunioes.filter((m) => m.status === 'agendada').forEach((m) => {
      const f = D.forum(m.forumId);
      if (!f) return;
      const pend = m.pauta.filter((p) => p.status === 'pendente').length;
      if (f.membros.includes(uid) && U.diffDays(hoje, m.data) <= 14)
        out.push({ tipo: 'reuniao', icon: 'calendar', titulo: f.sigla + ' · reunião de ' + U.fmtDate(m.data), meta: U.plural(pend, 'item na pauta', 'itens na pauta') + ' · ' + (f.presidenteId === uid ? 'você preside' : 'você é membro'), data: m.data, href: '#/reunioes/' + m.id, cta: 'Ver pauta', urg: 2 });
    });
    S.acoes.forEach((a) => {
      if (a.responsavelId === uid && a.status !== 'concluida' && a.prazo <= U.addDays(hoje, 7))
        out.push({ tipo: 'acao', icon: 'list', titulo: a.titulo, meta: a.id + ' · ' + (a.decisaoId || 'ação avulsa') + (a.prazo < hoje ? ' · atrasada' : ''), data: a.prazo, href: '#/acoes', cta: 'Abrir', urg: a.prazo < hoje ? 1 : 3 });
    });
    S.riscos.forEach((r) => {
      if (r.donoId === uid && D.riscoAtivo(r) && r.proximaRevisao <= U.addDays(hoje, 7))
        out.push({ tipo: 'risco', icon: 'alert', titulo: 'Revisar risco: ' + r.titulo, meta: r.id + ' · severidade ' + D.riscoScore(r), data: r.proximaRevisao, href: '#/riscos', cta: 'Revisar', urg: r.proximaRevisao < hoje ? 1 : 3 });
    });
    S.politicas.forEach((p) => {
      if (p.donoId === uid && p.status !== 'rascunho' && p.proximaRevisao <= U.addDays(hoje, 30))
        out.push({ tipo: 'politica', icon: 'book', titulo: 'Revisar política: ' + p.titulo, meta: p.id + ' · v' + p.versao, data: p.proximaRevisao, href: '#/politicas', cta: 'Revisar', urg: p.proximaRevisao < hoje ? 1 : 4 });
    });
    return out.sort((a, b) => a.urg - b.urg || String(a.data).localeCompare(String(b.data)));
  };

  G.D = D;
})(window);
