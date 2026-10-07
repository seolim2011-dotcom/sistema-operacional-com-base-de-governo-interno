/* João — estado, persistência, trilha de auditoria e ações de negócio */
(function (G) {
  'use strict';
  const U = G.U, D = G.D;
  const KEY = 'governa-os-v1';
  const ZERO = '0'.repeat(64);

  class RuleError extends Error {}
  const fail = (msg) => { throw new RuleError(msg); };

  /* =================== Store =================== */
  const Store = { state: null, onChange: null, storageOk: true };

  Store.load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (Store.valid(s)) { Store.state = s; return; } }
    } catch (e) { Store.storageOk = false; }
    Store.state = G.Seed.build();
    Store.save();
  };
  Store.valid = (s) => s && s.versao === 1 && ['pessoas', 'areas', 'foruns', 'niveis', 'tipos', 'decisoes', 'riscos', 'politicas', 'acoes', 'reunioes', 'audit'].every((k) => Array.isArray(s[k])) && s.config && s.seq;
  Store.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(Store.state)); Store.storageOk = true; } catch (e) { Store.storageOk = false; }
  };
  Store.commit = (fn) => { const r = fn(Store.state); Store.save(); if (Store.onChange) Store.onChange(); return r; };
  Store.reset = () => { Store.state = G.Seed.build(); Store.save(); if (Store.onChange) Store.onChange(); };
  Store.exportJson = () => JSON.stringify(Store.state, null, 1);
  Store.importJson = (text) => {
    let s;
    try { s = JSON.parse(text); } catch (e) { fail('Arquivo inválido: não é um JSON.'); }
    if (!Store.valid(s)) fail('Arquivo inválido: não parece um backup do João.');
    Store.state = s; Store.save(); if (Store.onChange) Store.onChange();
  };

  const PFX = { dec: 'DEC-', risco: 'R-', pol: 'POL-', acao: 'ACT-', reu: 'REU-' };
  Store.nextId = (kind) => {
    const S = Store.state, n = ++S.seq[kind];
    if (kind === 'dec') return 'DEC-' + new Date().getFullYear() + '-' + String(n).padStart(3, '0');
    if (kind === 'reu') return 'REU-' + new Date().getFullYear() + '-' + String(n).padStart(3, '0');
    return PFX[kind] + String(n).padStart(2, '0');
  };

  /* ---- trilha de auditoria encadeada (cada registro contém o hash do anterior) ---- */
  const hashOf = (e) => U.sha256([e.prev, e.seq, e.ts, e.userId, e.entidade, e.entidadeId, e.acao, e.detalhe].join('|'));
  Store.log = (entidade, entidadeId, acao, detalhe, o) => {
    o = o || {};
    const a = Store.state.audit;
    const e = { seq: a.length + 1, ts: o.ts || U.nowTs(), userId: o.userId || Store.state.usuarioId, entidade, entidadeId: entidadeId || '', acao, detalhe: detalhe || '', prev: a.length ? a[a.length - 1].hash : ZERO };
    e.hash = hashOf(e);
    a.push(e);
  };
  Store.verify = (arr) => {
    const a = arr || Store.state.audit;
    let prev = ZERO;
    for (let i = 0; i < a.length; i++) {
      const e = a[i];
      if (e.prev !== prev || e.seq !== i + 1 || hashOf(e) !== e.hash) return { ok: false, em: i + 1, total: a.length };
      prev = e.hash;
    }
    return { ok: true, total: a.length, ultimo: prev };
  };

  /* selo de conteúdo: prova de que o que foi deliberado é o que foi submetido */
  Store.seloConteudo = (d) => U.sha256(JSON.stringify([d.titulo, d.tipoId, d.valor, d.irreversivel, d.contexto, d.resultadoEsperado, d.premissas, d.gatilhos, d.alternativas, d.criterios, d.notas, d.recomendacaoId, d.justificativa]));

  /* =================== Ações =================== */
  const A = { RuleError };
  const me = () => D.user();
  const needAdmin = () => { if (!D.isAdmin(me())) fail('Apenas o Escritório de Governança (perfil administrador) pode fazer isso.'); };
  const getDec = (id) => D.decisao(id) || fail('Decisão não encontrada.');
  const getReu = (id) => D.reuniao(id) || fail('Reunião não encontrada.');
  const editavel = (d) => { if (!D.podeEditarDecisao(d, me())) fail('Somente o proponente (ou a Governança) pode editar, e só enquanto a decisão está em rascunho ou análise.'); };
  const log = Store.log;

  A.setUsuario = (id) => { Store.state.usuarioId = id; Store.save(); if (Store.onChange) Store.onChange(); };

  /* ---------- decisões ---------- */
  A.criarDecisao = (x) => Store.commit((S) => {
    const u = me();
    const id = Store.nextId('dec');
    const d = {
      id, titulo: x.titulo.trim(), tipoId: x.tipoId, areaId: x.areaId, nivelDecisao: x.nivelDecisao || 'tatica',
      proponenteId: x.proponenteId || u.id, valor: x.valor == null ? null : x.valor, irreversivel: !!x.irreversivel, excecaoPolitica: !!x.excecaoPolitica,
      prazo: x.prazo || U.addDays(U.today(), 30), contexto: x.contexto || '', resultadoEsperado: x.resultadoEsperado || '', premissas: '', gatilhos: '',
      alternativas: [], criterios: [], notas: {}, recomendacaoId: null, justificativa: '', riscosIds: [], politicasIds: [],
      rapid: { recomendaId: x.proponenteId || u.id, concordam: [], consultados: [], executaId: null },
      conflito: null, parecer: null, status: 'rascunho', roteamento: null, selo: null,
      criadaEm: U.today(), submetidaEm: null, decisao: null, execucaoInicioEm: null, concluidaEm: null, revisaoEm: null, revisao: null,
      devolucoes: [], comentarios: [], atualizadaEm: U.nowTs(),
    };
    S.decisoes.push(d);
    log('decisao', id, 'criou', 'Decisão criada: ' + d.titulo);
    return id;
  });

  const CAMPOS = { titulo: 'título', tipoId: 'tipo', areaId: 'área', nivelDecisao: 'nível', proponenteId: 'proponente', valor: 'valor', irreversivel: 'reversibilidade', excecaoPolitica: 'exceção de política', prazo: 'prazo', contexto: 'contexto', resultadoEsperado: 'resultado esperado', premissas: 'premissas', gatilhos: 'gatilhos', conflito: 'conflito de interesses' };
  A.editarDecisao = (id, patch, opts) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    const mudou = [];
    Object.keys(patch).forEach((k) => {
      if (JSON.stringify(d[k]) !== JSON.stringify(patch[k])) { d[k] = patch[k]; if (CAMPOS[k]) mudou.push(CAMPOS[k]); }
    });
    if (patch.proponenteId) d.rapid.recomendaId = patch.proponenteId;
    d.atualizadaEm = U.nowTs();
    if (mudou.length && !(opts && opts.silencioso)) log('decisao', id, 'editou', 'Campos alterados: ' + mudou.join(', '));
  });
  A.salvarRapid = (id, rapid) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    const antigos = d.rapid.concordam || [];
    d.rapid.consultados = rapid.consultados;
    d.rapid.executaId = rapid.executaId || null;
    d.rapid.concordam = rapid.concordam.map((pid) => antigos.find((c) => c.pessoaId === pid) || { pessoaId: pid, resposta: null, nota: '', em: null });
    d.atualizadaEm = U.nowTs();
    log('decisao', id, 'editou', 'Papéis RAPID atualizados (' + d.rapid.concordam.length + ' concordância(s) exigida(s))');
  });
  A.setVinculos = (id, riscosIds, politicasIds) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    d.riscosIds = riscosIds; d.politicasIds = politicasIds; d.atualizadaEm = U.nowTs();
    log('decisao', id, 'editou', 'Vínculos atualizados: ' + riscosIds.length + ' risco(s), ' + politicasIds.length + ' política(s)');
  });

  /* matriz de decisão — edições "silenciosas" não poluem a trilha; o selo registra o conteúdo final */
  const touch = (d) => { d.atualizadaEm = U.nowTs(); };
  A.altAdd = (id, nome) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    if (d.alternativas.length >= 8) fail('Máximo de 8 alternativas.');
    d.alternativas.push({ id: U.uid('alt'), nome: nome.trim(), descricao: '' }); touch(d);
    log('decisao', id, 'editou', 'Alternativa adicionada: ' + nome.trim());
  });
  A.altRemove = (id, altId) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    d.alternativas = d.alternativas.filter((a) => a.id !== altId); delete d.notas[altId];
    if (d.recomendacaoId === altId) d.recomendacaoId = null;
    touch(d); log('decisao', id, 'editou', 'Alternativa removida');
  });
  A.critAdd = (id, nome, peso) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    if (d.criterios.length >= 8) fail('Máximo de 8 critérios.');
    d.criterios.push({ id: U.uid('crt'), nome: nome.trim(), peso: U.clamp(peso || 5, 1, 10) }); touch(d);
    log('decisao', id, 'editou', 'Critério adicionado: ' + nome.trim());
  });
  A.critRemove = (id, critId) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    d.criterios = d.criterios.filter((c) => c.id !== critId);
    Object.keys(d.notas).forEach((a) => delete d.notas[a][critId]);
    touch(d); log('decisao', id, 'editou', 'Critério removido');
  });
  A.altRename = (id, altId, nome, descricao) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    const a = d.alternativas.find((x) => x.id === altId); if (!a) return;
    a.nome = nome.trim() || a.nome; a.descricao = descricao || ''; touch(d);
  });
  A.critRename = (id, critId, nome) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    const c = d.criterios.find((x) => x.id === critId); if (!c) return;
    c.nome = nome.trim() || c.nome; touch(d);
  });
  // silenciosas (sem re-render global): quem chama atualiza o DOM
  A.setNota = (id, altId, critId, n) => {
    const d = getDec(id); editavel(d);
    d.notas[altId] = d.notas[altId] || {};
    if (n >= 1 && n <= 5) d.notas[altId][critId] = n; else delete d.notas[altId][critId];
    touch(d); Store.save();
  };
  A.setPeso = (id, critId, peso) => {
    const d = getDec(id); editavel(d);
    const c = d.criterios.find((x) => x.id === critId); if (!c) return;
    c.peso = U.clamp(peso, 1, 10); touch(d); Store.save();
  };
  A.setRecomendacao = (id, altId, justificativa) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    d.recomendacaoId = altId || null; d.justificativa = justificativa || ''; touch(d);
    log('decisao', id, 'editou', 'Recomendação registrada: ' + ((d.alternativas.find((a) => a.id === altId) || {}).nome || '—'));
  });

  /* ---------- ciclo de vida ---------- */
  A.enviarAnalise = (id) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    if (d.status !== 'rascunho') fail('A decisão não está em rascunho.');
    if (d.titulo.trim().length < 5) fail('Dê um título mais descritivo à decisão.');
    d.status = 'analise'; touch(d);
    log('decisao', id, 'status', 'Rascunho → Em análise');
  });
  A.submeter = (id) => Store.commit(() => {
    const d = getDec(id); editavel(d);
    if (d.status !== 'analise') fail('Só decisões em análise podem ser submetidas.');
    const pr = D.prontidao(d);
    if (!pr.pronta) fail('Faltam itens obrigatórios: ' + pr.bloqueios.map((b) => b.label).join('; ') + '.');
    d.roteamento = D.rotear(d);
    d.selo = Store.seloConteudo(d);
    d.submetidaEm = U.today(); d.status = 'deliberacao'; touch(d);
    log('decisao', id, 'status', 'Em análise → Em deliberação · instância: ' + D.instanciaNome(d.roteamento) + ' · selo ' + d.selo.slice(0, 12));
  });
  A.decidirIndividual = (id, resultado, texto) => Store.commit(() => {
    const d = getDec(id), u = me();
    if (!D.ehDecisorIndividual(d, u)) fail('Apenas o decisor designado (' + D.nomePessoa(d.roteamento && d.roteamento.decisorId) + ') pode registrar esta decisão.');
    if (!['aprovada', 'rejeitada'].includes(resultado)) fail('Resultado inválido.');
    if (resultado === 'rejeitada' && !(texto || '').trim()) fail('Informe a justificativa da rejeição.');
    d.decisao = { resultado, por: 'pessoa', pessoaId: u.id, texto: (texto || '').trim(), em: U.today() };
    d.status = resultado; touch(d);
    log('decisao', id, 'decidiu', (resultado === 'aprovada' ? 'APROVADA' : 'REJEITADA') + ' por ' + u.nome + (texto ? ' — ' + texto.trim() : ''));
  });
  A.devolver = (id, texto) => Store.commit((S) => {
    const d = getDec(id), u = me();
    const rot = d.roteamento;
    const f = rot && rot.forumId && D.forum(rot.forumId);
    const pode = D.ehDecisorIndividual(d, u) || (f && (f.presidenteId === u.id || f.secretarioId === u.id)) || D.isAdmin(u);
    if (d.status !== 'deliberacao' || !pode) fail('Apenas o decisor, o presidente/secretário do fórum ou a Governança podem devolver.');
    if (!(texto || '').trim()) fail('Explique o que precisa ser complementado.');
    d.devolucoes.push({ em: U.today(), porId: u.id, texto: texto.trim(), instancia: D.instanciaNome(rot) });
    d.status = 'analise'; d.roteamento = null; d.selo = null; d.submetidaEm = null; touch(d);
    S.reunioes.filter((m) => m.status === 'agendada').forEach((m) => { m.pauta = m.pauta.filter((p) => !(p.decisaoId === id && p.status === 'pendente')); });
    log('decisao', id, 'devolveu', 'Devolvida para complementação: ' + texto.trim());
  });
  A.iniciarExecucao = (id) => Store.commit(() => {
    const d = getDec(id), u = me();
    if (d.status !== 'aprovada') fail('Só decisões aprovadas podem entrar em execução.');
    if (!(D.isAdmin(u) || u.id === d.proponenteId || u.id === d.rapid.executaId)) fail('Apenas o proponente, o executor ou a Governança.');
    d.status = 'execucao'; d.execucaoInicioEm = U.today(); touch(d);
    log('decisao', id, 'status', 'Aprovada → Em execução');
  });
  A.concluir = (id, revisaoEm) => Store.commit((S) => {
    const d = getDec(id), u = me();
    if (d.status !== 'execucao') fail('Só decisões em execução podem ser concluídas.');
    if (!(D.isAdmin(u) || u.id === d.proponenteId || u.id === d.rapid.executaId)) fail('Apenas o proponente, o executor ou a Governança.');
    const abertas = S.acoes.filter((a) => a.decisaoId === id && a.status !== 'concluida');
    if (abertas.length) fail('Ainda há ' + U.plural(abertas.length, 'ação em aberto', 'ações em aberto') + '. Conclua-as antes de encerrar a execução.');
    d.status = 'concluida'; d.concluidaEm = U.today(); d.revisaoEm = revisaoEm || U.addDays(U.today(), 90); touch(d);
    log('decisao', id, 'status', 'Em execução → Concluída · revisão pós-decisão em ' + U.fmtDate(d.revisaoEm));
  });
  A.registrarRevisao = (id, rev) => Store.commit(() => {
    const d = getDec(id), u = me();
    if (d.status !== 'concluida') fail('A revisão só pode ser feita em decisões concluídas.');
    if (!(D.isAdmin(u) || u.id === d.proponenteId)) fail('Apenas o proponente ou a Governança.');
    if (!(rev.licoes || '').trim()) fail('Registre ao menos uma lição aprendida.');
    d.revisao = { resultado: rev.resultado, decisaoBoa: rev.decisaoBoa, kpiReal: rev.kpiReal || '', licoes: rev.licoes.trim(), porId: u.id, em: U.today() };
    d.status = 'revisada'; touch(d);
    log('decisao', id, 'revisou', 'Revisão pós-decisão: ' + D.RESULTADO_REV[rev.resultado] + ' · qualidade da decisão: ' + (rev.decisaoBoa === 'sim' ? 'boa' : rev.decisaoBoa === 'parcial' ? 'parcial' : 'falha de processo'));
  });
  A.cancelar = (id, motivo) => Store.commit((S) => {
    const d = getDec(id), u = me();
    if (!D.ABERTAS.includes(d.status)) fail('Só decisões ainda em aberto podem ser canceladas.');
    if (!(D.isAdmin(u) || u.id === d.proponenteId)) fail('Apenas o proponente ou a Governança.');
    if (!(motivo || '').trim()) fail('Informe o motivo do cancelamento.');
    d.status = 'cancelada'; d.cancelamento = { motivo: motivo.trim(), em: U.today(), porId: u.id }; touch(d);
    S.reunioes.filter((m) => m.status === 'agendada').forEach((m) => { m.pauta = m.pauta.filter((p) => !(p.decisaoId === id && p.status === 'pendente')); });
    log('decisao', id, 'status', 'Cancelada: ' + motivo.trim());
  });
  A.comentar = (id, texto) => Store.commit(() => {
    const d = getDec(id);
    if (!(texto || '').trim()) return;
    d.comentarios.push({ id: U.uid('c'), autorId: me().id, em: U.nowTs(), texto: texto.trim() });
    log('decisao', id, 'comentou', texto.trim().slice(0, 120));
  });

  /* concordância (RAPID) e parecer prévio */
  A.responderConcordancia = (id, resposta, nota) => Store.commit(() => {
    const d = getDec(id), u = me();
    if (!D.ABERTAS.includes(d.status)) fail('A decisão já foi encerrada nesta fase.');
    const c = d.rapid.concordam.find((x) => x.pessoaId === u.id);
    if (!c) fail('Você não está na lista de "Concorda" desta decisão.');
    if (resposta !== 'de_acordo' && !(nota || '').trim()) fail('Explique a ressalva ou o veto.');
    c.resposta = resposta; c.nota = (nota || '').trim(); c.em = U.today();
    log('decisao', id, 'concordância', u.nome + ': ' + { de_acordo: 'de acordo', ressalva: 'de acordo com ressalva', veto: 'VETO' }[resposta] + (c.nota ? ' — ' + c.nota : ''));
  });
  A.registrarParecer = (id, resultado, texto) => Store.commit(() => {
    const d = getDec(id), u = me();
    const pe = D.parecerExigido(d);
    if (!pe) fail('Esta decisão não exige parecer prévio.');
    const f = D.forum(pe.forumId);
    if (!f.membros.includes(u.id)) fail('Apenas membros do ' + f.nome + ' podem emitir o parecer.');
    if (!D.ABERTAS.includes(d.status)) fail('O parecer deve ser emitido antes da decisão.');
    if (!(texto || '').trim()) fail('Fundamente o parecer.');
    d.parecer = { forumId: f.id, resultado, texto: texto.trim(), porId: u.id, em: U.today() };
    log('decisao', id, 'parecer', f.sigla + ': ' + { favoravel: 'favorável', ressalvas: 'favorável com ressalvas', desfavoravel: 'DESFAVORÁVEL' }[resultado] + ' (' + u.nome + ')');
  });

  /* ---------- reuniões ---------- */
  A.criarReuniao = (x) => Store.commit(() => {
    const f = D.forum(x.forumId);
    if (!D.secretariaReuniao({ forumId: x.forumId }, me())) fail('Apenas a Governança, o presidente ou o secretário do fórum podem agendar reuniões.');
    if (!x.data) fail('Informe a data.');
    const id = Store.nextId('reu');
    Store.state.reunioes.push({ id, forumId: f.id, data: x.data, hora: x.hora || '10:00', local: x.local || '', status: 'agendada', presentes: [...f.membros], pauta: [], observacoes: '', ata: null });
    log('reuniao', id, 'agendou', f.sigla + ' em ' + U.fmtDate(x.data));
    return id;
  });
  A.pautaAdd = (rid, did) => Store.commit((S) => {
    const m = getReu(rid), d = getDec(did);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão para montar a pauta.');
    if (m.status !== 'agendada') fail('A reunião não está aberta para pauta.');
    if (d.status !== 'deliberacao' || !d.roteamento || d.roteamento.forumId !== m.forumId) fail('Esta decisão não está em deliberação neste fórum.');
    if (S.reunioes.some((r) => r.status === 'agendada' && r.pauta.some((p) => p.decisaoId === did && p.status === 'pendente'))) fail('Esta decisão já está na pauta de uma reunião agendada.');
    m.pauta.push({ decisaoId: did, status: 'pendente', votos: {}, resultado: null, nota: '' });
    log('reuniao', rid, 'pauta', 'Incluída na pauta: ' + did + ' — ' + d.titulo);
  });
  A.pautaRemove = (rid, did) => Store.commit(() => {
    const m = getReu(rid);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão para alterar a pauta.');
    m.pauta = m.pauta.filter((p) => !(p.decisaoId === did && p.status === 'pendente'));
    log('reuniao', rid, 'pauta', 'Removida da pauta: ' + did);
  });
  A.presenca = (rid, pid, presente) => Store.commit(() => {
    const m = getReu(rid);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão para registrar presença.');
    if (m.status !== 'agendada') fail('Reunião já encerrada.');
    m.presentes = m.presentes.filter((x) => x !== pid);
    if (presente) m.presentes.push(pid);
    else m.pauta.forEach((p) => { if (p.status === 'pendente') delete p.votos[pid]; });
  });
  A.votar = (rid, did, pid, voto) => Store.commit(() => {
    const m = getReu(rid);
    if (!(D.secretariaReuniao(m, me()) || me().id === pid)) fail('Cada membro registra o próprio voto; só a secretaria (ou o presidente) registra o voto de outra pessoa.');
    const it = m.pauta.find((p) => p.decisaoId === did && p.status === 'pendente');
    if (!it) fail('Item não está aberto para votação.');
    if (!m.presentes.includes(pid)) fail('Só membros presentes votam.');
    if (voto) it.votos[pid] = voto; else delete it.votos[pid];
  });
  A.votarTodos = (rid, did, voto) => Store.commit(() => {
    const m = getReu(rid);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão.');
    const it = m.pauta.find((p) => p.decisaoId === did && p.status === 'pendente'); if (!it) return;
    m.presentes.forEach((pid) => { if (!it.votos[pid]) it.votos[pid] = voto; });
  });
  A.encerrarItem = (rid, did, nota) => Store.commit(() => {
    const m = getReu(rid), f = D.forum(m.forumId), d = getDec(did);
    if (!D.secretariaReuniao(m, me())) fail('Apenas o secretário, o presidente ou a Governança proclamam resultados.');
    const it = m.pauta.find((p) => p.decisaoId === did && p.status === 'pendente');
    if (!it) fail('Item não está pendente.');
    const q = D.quorum(f, m.presentes);
    if (!q.ok) fail('Quórum insuficiente: ' + q.presentes + ' presente(s), mínimo ' + q.minimo + '.');
    const semVoto = m.presentes.filter((p) => !it.votos[p]);
    if (semVoto.length) fail('Faltam votos de: ' + semVoto.map(D.nomePessoa).join(', ') + '. Registre o voto ou marque ausência/impedimento.');
    const r = D.resolverVotacao(f, it.votos);
    if (r.resultado === 'sem_votos') fail('Nenhum voto válido (a favor/contra) foi registrado.');
    if (r.resultado === 'empate') fail('Empate sem voto de minerva. Adie o item ou ajuste os votos.');
    it.status = 'decidido'; it.resultado = r.resultado; it.nota = (nota || '').trim(); it.contagem = r;
    d.decisao = { resultado: r.resultado, por: 'forum', forumId: f.id, reuniaoId: rid, votos: { ...it.votos }, contagem: r, texto: it.nota, em: m.data };
    d.status = r.resultado; d.atualizadaEm = U.nowTs();
    log('decisao', did, 'decidiu', (r.resultado === 'aprovada' ? 'APROVADA' : 'REJEITADA') + ' pelo ' + f.sigla + ' (' + r.aprova + ' a favor, ' + r.rejeita + ' contra, ' + r.abstem + ' abst., ' + r.impedido + ' impedido(s))' + (r.minerva ? ' — voto de minerva' : ''));
    log('reuniao', rid, 'item', did + ' ' + r.resultado);
  });
  A.adiarItem = (rid, did, nota) => Store.commit(() => {
    const m = getReu(rid);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão.');
    const it = m.pauta.find((p) => p.decisaoId === did && p.status === 'pendente'); if (!it) fail('Item não está pendente.');
    it.status = 'adiado'; it.nota = (nota || '').trim(); it.votos = {};
    log('reuniao', rid, 'item', did + ' adiado' + (it.nota ? ': ' + it.nota : ''));
  });
  A.encerrarReuniao = (rid, observacoes) => Store.commit(() => {
    const m = getReu(rid), f = D.forum(m.forumId);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão.');
    if (m.pauta.some((p) => p.status === 'pendente')) fail('Há itens pendentes na pauta: decida ou adie cada um antes de encerrar.');
    if (!D.quorum(f, m.presentes).ok) fail('Quórum insuficiente para encerrar a reunião.');
    m.observacoes = (observacoes || '').trim(); m.status = 'realizada'; m.ata = A.ataTexto(m);
    log('reuniao', rid, 'encerrou', 'Reunião encerrada e ata gerada (' + m.pauta.length + ' item(ns))');
  });
  A.cancelarReuniao = (rid) => Store.commit(() => {
    const m = getReu(rid);
    if (!D.secretariaReuniao(m, me())) fail('Sem permissão.');
    if (m.status !== 'agendada') fail('Só reuniões agendadas podem ser canceladas.');
    m.status = 'cancelada'; m.pauta = [];
    log('reuniao', rid, 'cancelou', 'Reunião cancelada');
  });
  A.ataTexto = (m) => {
    const f = D.forum(m.forumId), L = [];
    const nomes = (ids) => ids.map(D.nomePessoa).join(', ') || '—';
    L.push('ATA — ' + f.nome.toUpperCase() + ' (' + f.sigla + ')');
    L.push('Reunião ' + m.id + ' · ' + U.fmtDate(m.data) + ' às ' + m.hora + (m.local ? ' · ' + m.local : ''));
    L.push('');
    L.push('Presidente: ' + D.nomePessoa(f.presidenteId) + ' · Secretário(a): ' + D.nomePessoa(f.secretarioId));
    L.push('Presentes (' + m.presentes.length + '/' + f.membros.length + '): ' + nomes(m.presentes));
    const aus = f.membros.filter((x) => !m.presentes.includes(x));
    L.push('Ausentes: ' + nomes(aus));
    L.push('Quórum: ' + (D.quorum(f, m.presentes).ok ? 'instalado' : 'NÃO instalado') + ' (mínimo ' + f.quorum + ') · Regra de votação: ' + D.REGRAS[f.regra]);
    L.push('');
    m.pauta.forEach((p, i) => {
      const d = D.decisao(p.decisaoId) || { titulo: p.decisaoId };
      L.push('ITEM ' + (i + 1) + ' — ' + p.decisaoId + ' · ' + d.titulo);
      if (d.valor) L.push('  Valor envolvido: ' + U.money(d.valor));
      const rec = d.alternativas && d.alternativas.find((a) => a.id === d.recomendacaoId);
      if (rec) L.push('  Recomendação da proposta: ' + rec.nome);
      if (p.status === 'adiado') L.push('  Resultado: ADIADO' + (p.nota ? ' — ' + p.nota : ''));
      else if (p.status === 'decidido') {
        const c = p.contagem || D.contaVotos(p.votos);
        L.push('  Votação: ' + c.aprova + ' a favor · ' + c.rejeita + ' contra · ' + c.abstem + ' abstenção(ões) · ' + c.impedido + ' impedido(s)' + (c.minerva ? ' · desempate por voto de minerva' : ''));
        L.push('  Resultado: ' + p.resultado.toUpperCase());
        L.push('  Votos: ' + Object.keys(p.votos).map((pid) => D.nomePessoa(pid) + ' (' + D.VOTOS[p.votos[pid]].toLowerCase() + ')').join('; '));
        if (p.nota) L.push('  Registro: ' + p.nota);
      }
      L.push('');
    });
    if (m.observacoes) { L.push('OBSERVAÇÕES GERAIS'); L.push(m.observacoes); L.push(''); }
    L.push('Nada mais havendo a tratar, a reunião foi encerrada. Ata gerada pelo João em ' + U.fmtTs(U.nowTs()) + '.');
    return L.join('\n');
  };

  /* ---------- riscos, políticas, ações ---------- */
  A.salvarRisco = (x) => Store.commit((S) => {
    let r = x.id && D.risco(x.id);
    if (r) {
      Object.assign(r, x); log('risco', r.id, 'editou', r.titulo + ' · severidade ' + D.riscoScore(r));
    } else {
      r = { ...x, id: Store.nextId('risco'), revisadoEm: U.today() }; S.riscos.push(r);
      log('risco', r.id, 'criou', r.titulo + ' · severidade ' + D.riscoScore(r));
    }
    return r.id;
  });
  A.revisarRisco = (id) => Store.commit(() => {
    const r = D.risco(id); r.revisadoEm = U.today(); r.proximaRevisao = U.addDays(U.today(), 90);
    log('risco', id, 'revisou', 'Revisão periódica registrada; próxima em ' + U.fmtDate(r.proximaRevisao));
  });
  A.salvarPolitica = (x) => Store.commit((S) => {
    let p = x.id && D.politica(x.id);
    if (p) { Object.assign(p, x); log('politica', p.id, 'editou', p.titulo); }
    else { p = { ...x, id: Store.nextId('pol') }; S.politicas.push(p); log('politica', p.id, 'criou', p.titulo + ' v' + p.versao); }
    return p.id;
  });
  A.revisarPolitica = (id, versao, resumo) => Store.commit(() => {
    const p = D.politica(id), u = me();
    if (!(D.isAdmin(u) || u.id === p.donoId)) fail('Apenas o dono da política ou a Governança.');
    p.versao = versao || p.versao; if (resumo) p.resumo = resumo;
    p.vigenteDesde = U.today(); p.proximaRevisao = U.addDays(U.today(), 365); p.status = 'vigente';
    log('politica', id, 'revisou', 'Versão ' + p.versao + ' vigente; próxima revisão em ' + U.fmtDate(p.proximaRevisao));
  });
  A.salvarAcao = (x) => Store.commit((S) => {
    let a = x.id && D.acao(x.id);
    if (a) { Object.assign(a, x); log('acao', a.id, 'editou', a.titulo); }
    else { a = { ...x, id: Store.nextId('acao'), status: 'a_fazer', concluidaEm: null }; S.acoes.push(a); log('acao', a.id, 'criou', a.titulo + (a.decisaoId ? ' (' + a.decisaoId + ')' : '')); }
    return a.id;
  });
  A.statusAcao = (id, status) => Store.commit(() => {
    const a = D.acao(id), u = me();
    if (!(D.isAdmin(u) || u.id === a.responsavelId)) fail('Apenas o responsável pela ação (ou a Governança) altera o status.');
    a.status = status; a.concluidaEm = status === 'concluida' ? U.today() : null;
    log('acao', id, 'status', D.ACAO_STATUS[status]);
  });
  A.removerAcao = (id) => Store.commit((S) => {
    const a = D.acao(id), u = me();
    if (!(D.isAdmin(u) || u.id === a.responsavelId)) fail('Apenas o responsável pela ação (ou a Governança).');
    S.acoes = S.acoes.filter((x) => x.id !== id); log('acao', id, 'removeu', a.titulo);
  });

  /* ---------- estrutura (administração) ---------- */
  A.salvarPessoa = (x) => Store.commit((S) => {
    needAdmin();
    let p = x.id && D.pessoa(x.id);
    if (p) { Object.assign(p, x); log('pessoa', p.id, 'editou', p.nome); }
    else { p = { ...x, id: 'p-' + U.uid('n').slice(2) }; S.pessoas.push(p); log('pessoa', p.id, 'criou', p.nome + ' — ' + p.cargo); }
  });
  A.salvarArea = (x) => Store.commit((S) => {
    needAdmin();
    let a = x.id && D.area(x.id);
    if (a) { Object.assign(a, x); log('area', a.id, 'editou', a.nome + ' (gerente: ' + D.nomePessoa(a.gerenteId) + ', diretor: ' + D.nomePessoa(a.diretorId) + ')'); }
    else { a = { ...x, id: 'a-' + U.uid('n').slice(2) }; S.areas.push(a); log('area', a.id, 'criou', a.nome); }
  });
  A.salvarForum = (x) => Store.commit((S) => {
    needAdmin();
    const f = D.forum(x.id); if (!f) fail('Fórum não encontrado.');
    Object.assign(f, x);
    f.membros = [...new Set(f.membros)];
    if (!f.membros.includes(f.presidenteId)) f.membros.unshift(f.presidenteId);
    log('forum', f.id, 'editou', f.sigla + ' · ' + f.membros.length + ' membros · quórum ' + f.quorum + ' · ' + D.REGRAS[f.regra]);
  });
  A.salvarTipo = (x) => Store.commit(() => {
    needAdmin();
    const t = D.tipo(x.id); if (!t) fail('Tipo não encontrado.');
    t.faixas = x.faixas; t.parecer = x.parecer || null;
    log('alcada', t.id, 'editou', 'Alçada "' + t.nome + '": ' + D.faixasOrdenadas(t).map((f) => (f.ate == null ? 'acima' : U.moneyC(f.ate)) + ' → N' + f.nivel).join(' | ') + (t.parecer ? ' · parecer ' + D.forum(t.parecer.forumId).sigla + ' ≥ ' + U.moneyC(t.parecer.acima) : ''));
  });
  A.salvarConfig = (cfg) => Store.commit((S) => {
    needAdmin();
    Object.assign(S.config, cfg);
    log('alcada', 'config', 'editou', 'Regras de escalonamento: apetite ' + S.config.apetiteRisco + ' · irreversível ' + (S.config.bumpIrreversivel ? 'sim' : 'não') + ' · risco ' + (S.config.bumpRisco ? 'sim' : 'não') + ' · exceção ' + (S.config.bumpExcecao ? 'sim' : 'não') + ' · SoD ' + (S.config.sod ? 'sim' : 'não'));
  });
  A.salvarEmpresa = (nome) => Store.commit((S) => { needAdmin(); S.empresa.nome = nome; log('config', 'empresa', 'editou', 'Nome da organização: ' + nome); });

  G.Store = Store;
  G.A = A;
})(window);
