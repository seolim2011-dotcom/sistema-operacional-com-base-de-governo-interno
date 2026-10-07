/* João — casca da aplicação: roteador, navegação, componentes e formulários */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, A = G.A, Store = G.Store;
  const { html, raw, icon } = U;
  const UI = { on: {}, change: {}, input: {}, routes: [], after: null, V: {} };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  UI.$ = $; UI.$$ = $$;

  /* ---------- armazenamento local de preferências (falha silenciosa) ---------- */
  UI.pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('governa-' + k); if (v === null) localStorage.removeItem('governa-' + k); else localStorage.setItem('governa-' + k, v); } catch (e) { /* sem storage */ } return null; };

  /* =================== componentes =================== */
  UI.badge = (txt, tone, ic) => html`<span class="pill pill--${tone || 'neutral'}">${ic ? icon(ic, 13) : ''}${txt}</span>`;
  UI.pill = (status) => { const s = D.STATUS[status] || D.STATUS.rascunho; return UI.badge(s.label, s.tone, s.icon); };
  UI.avatar = (p, cls) => html`<span class="avatar ${cls || ''}" title="${p ? p.nome : ''}" aria-hidden="true">${p ? U.initials(p.nome) : '?'}</span>`;
  UI.who = (id, o) => {
    const p = D.pessoa(id);
    if (!p) return html`<span class="muted">—</span>`;
    return html`<span class="who">${UI.avatar(p)}<span class="who-t"><span class="who-n">${p.nome}</span>${o && o.cargo ? html`<span class="who-c">${p.cargo}</span>` : ''}</span></span>`;
  };
  UI.stack = (ids, max) => {
    max = max || 5;
    const shown = ids.slice(0, max);
    return html`<span class="astack">${shown.map((id) => UI.avatar(D.pessoa(id)))}${ids.length > max ? html`<span class="avatar avatar--more">+${ids.length - max}</span>` : ''}</span>`;
  };
  UI.card = (title, body, o) => {
    o = o || {};
    return html`<section class="card ${o.cls || ''}" ${o.id ? raw('id="' + U.esc(o.id) + '"') : ''}>
      ${title || o.actions ? html`<header class="card-h"><div class="card-t"><h2>${title}</h2>${o.sub ? html`<p class="sub">${o.sub}</p>` : ''}</div>${o.actions ? html`<div class="card-a">${o.actions}</div>` : ''}</header>` : ''}
      <div class="card-b ${o.flush ? 'flush' : ''}">${body}</div></section>`;
  };
  UI.empty = (ic, title, text, cta) => html`<div class="empty">${icon(ic || 'info', 28)}<strong>${title}</strong>${text ? html`<p>${text}</p>` : ''}${cta || ''}</div>`;
  UI.meter = (pct, tone) => html`<span class="meter meter--${tone || 'accent'}" role="img" aria-label="${Math.round(pct)}%"><i style="width:${U.clamp(pct, 0, 100)}%"></i></span>`;
  UI.kpi = (label, value, sub, tone, href) => html`<${raw(href ? 'a href="' + U.esc(href) + '"' : 'div')} class="kpi ${tone ? 'kpi--' + tone : ''}"><span class="kpi-l">${label}</span><span class="kpi-v">${value}</span>${sub ? html`<span class="kpi-s">${sub}</span>` : ''}</${raw(href ? 'a' : 'div')}>`;
  UI.due = (date, done) => {
    if (!date) return html`<span class="muted">—</span>`;
    const n = U.diffDays(U.today(), date);
    const tone = done ? 'neutral' : n < 0 ? 'critical' : n <= 3 ? 'warning' : 'neutral';
    return html`<span class="due due--${tone}" title="${U.fmtDate(date)}">${tone === 'critical' ? icon('alert', 13) : ''}${U.fmtDay(date)} <small>${U.rel(date)}</small></span>`;
  };
  UI.riskChip = (score) => { const n = D.riscoNivel(score); return html`<span class="rchip rchip--${n}" title="Severidade ${score} — ${D.RISCO_NIVEL[n]}"><b>${score}</b> ${D.RISCO_NIVEL[n]}</span>`; };
  UI.header = (o) => html`<div class="phead">
    ${o.crumbs ? html`<nav class="crumbs" aria-label="Você está em">${o.crumbs.map((c, i) => (c.href ? html`<a href="${c.href}">${c.label}</a>` : html`<span>${c.label}</span>`))}</nav>` : ''}
    <div class="phead-row"><div class="phead-t">${o.kicker ? html`<span class="kicker">${o.kicker}</span>` : ''}<h1>${o.title}</h1>${o.sub ? html`<p class="lead">${o.sub}</p>` : ''}${o.meta ? html`<div class="meta">${o.meta}</div>` : ''}</div>${o.actions ? html`<div class="phead-a">${o.actions}</div>` : ''}</div></div>`;
  UI.btn = (label, act, o) => {
    o = o || {};
    return html`<button type="button" class="btn ${o.kind ? 'btn--' + o.kind : ''} ${o.cls || ''}" data-act="${act}" ${o.data ? raw(Object.keys(o.data).map((k) => 'data-' + k + '="' + U.esc(o.data[k]) + '"').join(' ')) : ''} ${o.disabled ? raw('disabled') : ''} ${o.title ? raw('title="' + U.esc(o.title) + '"') : ''}>${o.icon ? icon(o.icon, 16) : ''}${label}</button>`;
  };
  UI.link = (label, href, o) => html`<a class="btn ${o && o.kind ? 'btn--' + o.kind : ''}" href="${href}">${o && o.icon ? icon(o.icon, 16) : ''}${label}</a>`;
  UI.notice = (tone, ic, body) => html`<div class="notice notice--${tone}">${icon(ic, 18)}<div>${body}</div></div>`;
  UI.tabs = (items, cur, act) => html`<div class="seg" role="tablist">${items.map(([v, l, n]) => html`<button type="button" role="tab" aria-selected="${cur === v}" class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}${n != null ? html` <em>${n}</em>` : ''}</button>`)}</div>`;

  /* =================== formulários =================== */
  const F = {};
  F.field = (label, control, o) => { o = o || {}; return html`<label class="field ${o.cls || ''}"><span class="field-l">${label}${o.req ? html`<b class="req" title="obrigatório">*</b>` : ''}</span>${control}${o.hint ? html`<small class="hint">${o.hint}</small>` : ''}</label>`; };
  F.text = (name, value, o) => { o = o || {}; return F.field(o.label, html`<input class="input" name="${name}" type="${o.type || 'text'}" value="${value == null ? '' : value}" ${o.ph ? raw('placeholder="' + U.esc(o.ph) + '"') : ''} ${o.req ? raw('required') : ''} ${o.min != null ? raw('min="' + o.min + '"') : ''} ${o.max != null ? raw('max="' + o.max + '"') : ''} ${o.inputmode ? raw('inputmode="' + o.inputmode + '"') : ''} autocomplete="off">`, o); };
  F.area = (name, value, o) => { o = o || {}; return F.field(o.label, html`<textarea class="input" name="${name}" rows="${o.rows || 4}" ${o.ph ? raw('placeholder="' + U.esc(o.ph) + '"') : ''} ${o.req ? raw('required') : ''}>${value || ''}</textarea>`, o); };
  F.select = (name, options, value, o) => {
    o = o || {};
    return F.field(o.label, html`<select class="input" name="${name}" ${o.req ? raw('required') : ''}>${o.empty ? html`<option value="">${o.empty}</option>` : ''}${options.map((x) => { const v = Array.isArray(x) ? x[0] : x.v, l = Array.isArray(x) ? x[1] : x.l; return html`<option value="${v}" ${String(v) === String(value) ? raw('selected') : ''}>${l}</option>`; })}</select>`, o);
  };
  F.person = (name, value, o) => { o = o || {}; const list = D.S().pessoas.filter(o.filter || (() => true)); return F.select(name, list.map((p) => [p.id, p.nome + ' — ' + p.cargo]), value, o); };
  F.persons = (name, ids, o) => {
    o = o || {}; ids = ids || [];
    const list = D.S().pessoas.filter(o.filter || (() => true));
    return html`<div class="field ${o.cls || ''}"><span class="field-l">${o.label}</span><div class="checklist">${list.map((p) => html`<label class="chk"><input type="checkbox" name="${name}" value="${p.id}" ${ids.includes(p.id) ? raw('checked') : ''}> ${UI.avatar(p)}<span>${p.nome}<small>${p.cargo}</small></span></label>`)}</div>${o.hint ? html`<small class="hint">${o.hint}</small>` : ''}</div>`;
  };
  F.check = (name, checked, label, hint) => html`<label class="chk chk--row"><input type="checkbox" name="${name}" ${checked ? raw('checked') : ''}><span>${label}${hint ? html`<small>${hint}</small>` : ''}</span></label>`;
  F.money = (name, value, o) => F.text(name, value == null || value === '' ? '' : U.num(value), Object.assign({ inputmode: 'decimal', ph: 'Ex.: 1.500.000 ou 1,5 mi' }, o));
  UI.F = F;
  UI.formData = (form) => {
    const o = {};
    for (const [k, v] of new FormData(form).entries()) { if (k in o) { if (!Array.isArray(o[k])) o[k] = [o[k]]; o[k].push(v); } else o[k] = v; }
    return o;
  };
  UI.arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

  /* =================== modal / toast =================== */
  UI.toast = (msg, kind) => {
    const box = $('#toasts'), t = document.createElement('div');
    t.className = 'toast toast--' + (kind || 'ok');
    t.setAttribute('role', kind === 'warn' || kind === 'err' ? 'alert' : 'status');
    t.innerHTML = String(icon(kind === 'warn' || kind === 'err' ? 'alert' : 'check', 18)) + '<span>' + U.esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'warn' || kind === 'err' ? 6500 : 3500);
  };
  UI.modal = (o) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal' + (o.wide ? ' modal--wide' : '');
    dlg.innerHTML = String(html`<form class="modal-f" novalidate>
      <header class="modal-h"><h2>${o.title}</h2><button type="button" class="icon-btn" data-close aria-label="Fechar">${icon('x', 18)}</button></header>
      <div class="modal-b">${o.body}<div class="form-error" role="alert" hidden></div></div>
      <footer class="modal-ft">${o.noCancel ? '' : html`<button type="button" class="btn btn--ghost" data-close>${o.cancel || 'Cancelar'}</button>`}${o.submit === false ? '' : html`<button type="submit" class="btn ${o.danger ? 'btn--danger' : 'btn--primary'}">${o.submit || 'Salvar'}</button>`}</footer></form>`);
    document.body.appendChild(dlg);
    const form = $('form', dlg), err = $('.form-error', dlg);
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      err.hidden = true;
      try {
        const r = o.onSubmit ? o.onSubmit(UI.formData(form), form, close) : undefined;
        if (r !== false) close();
      } catch (ex) {
        if (ex instanceof A.RuleError) { err.textContent = ex.message; err.hidden = false; err.scrollIntoView({ block: 'nearest' }); } else { console.error(ex); err.textContent = 'Erro inesperado: ' + ex.message; err.hidden = false; }
      }
    });
    dlg.showModal();
    const first = $('input:not([type=hidden]):not([type=checkbox]), textarea, select', dlg);
    if (first && !o.noFocus) first.focus();
    if (o.onOpen) o.onOpen(dlg, form);
    return dlg;
  };
  UI.confirm = (title, text, onYes, o) => UI.modal({ title, body: html`<p class="modal-p">${text}</p>`, submit: (o && o.label) || 'Confirmar', danger: o && o.danger, onSubmit: () => { onYes(); } });

  /* =================== execução segura de ações =================== */
  UI.run = (fn) => {
    try { return fn(); } catch (err) {
      if (err instanceof A.RuleError) UI.toast(err.message, 'warn');
      else { console.error(err); UI.toast('Algo deu errado: ' + err.message, 'err'); }
    }
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const fn = UI.on[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
    UI.run(() => fn(el, e));
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && UI.change[el.dataset.change]) UI.run(() => UI.change[el.dataset.change](el, e));
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && UI.input[el.dataset.input]) UI.run(() => UI.input[el.dataset.input](el, e));
  });

  /* =================== roteamento =================== */
  UI.add = (nav, re, fn, title) => UI.routes.push({ nav, re, fn, title });
  UI.parseHash = () => (location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '') || 'painel';
  UI.go = (path) => { if (UI.parseHash() === path.replace(/^#\/?/, '')) UI.render(); else location.hash = '#/' + path.replace(/^#\/?/, ''); };
  UI.curRoute = { key: null };
  UI.render = () => {
    const path = UI.parseHash();
    let hit = null, m = null;
    for (const r of UI.routes) { m = path.match(r.re); if (m) { hit = r; break; } }
    const main = $('#main');
    const changed = UI.curRoute.key !== path;
    const sy = window.scrollY;
    UI.after = null;
    let out;
    try {
      out = hit ? hit.fn(m) : UI.notFound();
    } catch (err) {
      console.error(err);
      out = html`<div class="page-in">${UI.empty('alert', 'Não foi possível exibir esta tela', err.message)}</div>`;
    }
    main.innerHTML = String(out);
    UI.curRoute = { key: path, nav: hit && hit.nav };
    document.title = ((hit && hit.title) || 'João') + ' · João';
    UI.renderChrome();
    if (changed) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); } else window.scrollTo(0, sy);
    if (UI.after) UI.after();
    document.body.classList.remove('menu-open');
  };
  UI.notFound = () => html`<div class="page-in">${UI.empty('search', 'Página não encontrada', 'O endereço não existe neste sistema.', UI.link('Voltar ao painel', '#/painel', { kind: 'primary' }))}</div>`;
  window.addEventListener('hashchange', UI.render);

  /* =================== chrome: menu lateral e topo =================== */
  const NAV = [
    { g: 'Minha mesa', items: [['painel', 'Painel', 'home']] },
    { g: 'Decidir', items: [['decisoes', 'Decisões', 'scale'], ['foruns', 'Fóruns e reuniões', 'users'], ['acoes', 'Ações', 'checks']] },
    { g: 'Governar', items: [['alcadas', 'Matriz de alçadas', 'route'], ['riscos', 'Riscos', 'alert'], ['politicas', 'Políticas', 'book']] },
    { g: 'Controle', items: [['auditoria', 'Trilha de auditoria', 'shieldCheck'], ['pessoas', 'Pessoas e papéis', 'user'], ['dados', 'Dados e ajustes', 'sliders']] },
  ];
  UI.counts = () => {
    const S = D.S(), u = S.usuarioId, hoje = U.today();
    return {
      painel: D.inbox(u).filter((i) => i.urg <= 2).length,
      decisoes: S.decisoes.filter((x) => x.status === 'deliberacao').length,
      acoes: S.acoes.filter((a) => a.responsavelId === u && a.status !== 'concluida').length,
      riscos: S.riscos.filter(D.acimaApetite).length,
      politicas: S.politicas.filter((p) => D.politicaSituacao(p) === 'vencida').length,
    };
  };
  UI.renderChrome = () => {
    const S = D.S(), u = D.user(), n = UI.counts(), cur = UI.curRoute.nav;
    $('#side').innerHTML = String(html`
      <div class="brand"><span class="brand-mark">${icon('scale', 20)}</span><span class="brand-t"><strong>João</strong><small>${S.empresa.nome}</small></span></div>
      <nav class="nav" aria-label="Seções">${NAV.map((g) => html`<div class="nav-g"><span class="nav-gl">${g.g}</span>${g.items.map(([id, l, ic]) => html`<a class="nav-i ${cur === id ? 'on' : ''}" href="#/${id}" ${cur === id ? raw('aria-current="page"') : ''}>${icon(ic, 18)}<span>${l}</span>${n[id] ? html`<em class="nav-n ${id === 'riscos' || id === 'politicas' ? 'nav-n--alert' : ''}">${n[id]}</em>` : ''}</a>`)}</div>`)}</nav>
      <div class="side-f"><button type="button" class="nav-i nav-i--btn" data-act="palette">${icon('search', 18)}<span>Buscar</span><kbd>Ctrl K</kbd></button>
      <div class="side-me">${UI.avatar(u)}<span><strong>${u.nome}</strong><small>${D.isAdmin(u) ? 'Governança · administrador' : u.cargo}</small></span></div></div>`);
    $('#top').innerHTML = String(html`
      <button type="button" class="icon-btn menu-btn" data-act="menu" aria-label="Abrir menu">${icon('menu', 20)}</button>
      <button type="button" class="top-search" data-act="palette">${icon('search', 16)}<span>Buscar decisões, riscos, políticas…</span><kbd>Ctrl K</kbd></button>
      <div class="top-r">
        <label class="asuser" title="Visualizar o sistema como outra pessoa (demonstra permissões e caixa de entrada)"><span>Ver como</span>
          <select data-change="setUser" aria-label="Ver como">${S.pessoas.map((p) => html`<option value="${p.id}" ${p.id === S.usuarioId ? raw('selected') : ''}>${p.nome}</option>`)}</select></label>
        <button type="button" class="icon-btn" data-act="theme" aria-label="Alternar tema claro/escuro" title="Alternar tema">${icon('moon', 18)}</button>
      </div>`);
  };
  UI.on.menu = () => document.body.classList.toggle('menu-open');
  UI.change.setUser = (el) => { A.setUsuario(el.value); const p = D.pessoa(el.value); UI.toast('Agora você vê o sistema como ' + p.nome + '.'); };
  document.addEventListener('click', (e) => { if (e.target.closest('.nav-i[href]') || e.target.classList.contains('scrim')) document.body.classList.remove('menu-open'); });

  /* tema */
  UI.applyTheme = () => {
    const t = UI.pref('theme');
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  };
  UI.on.theme = () => {
    const el = document.documentElement;
    const dark = el.dataset.theme ? el.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    UI.pref('theme', dark ? 'light' : 'dark'); UI.applyTheme();
  };

  /* =================== paleta de comandos (Ctrl+K) =================== */
  UI.on.palette = () => UI.palette();
  UI.palette = () => {
    if ($('dialog.palette')) return;
    const S = D.S();
    const items = [
      ...NAV.flatMap((g) => g.items.map(([id, l, ic]) => ({ t: l, s: 'Ir para', ic, href: '#/' + id }))),
      ...S.decisoes.map((x) => ({ t: x.titulo, s: x.id + ' · ' + D.STATUS[x.status].label, ic: 'scale', href: '#/decisoes/' + x.id })),
      ...S.reunioes.map((m) => ({ t: D.forum(m.forumId).sigla + ' — ' + U.fmtDate(m.data), s: m.id + ' · reunião ' + m.status, ic: 'calendar', href: '#/reunioes/' + m.id })),
      ...S.riscos.map((r) => ({ t: r.titulo, s: r.id + ' · risco', ic: 'alert', href: '#/riscos' })),
      ...S.politicas.map((p) => ({ t: p.titulo, s: p.id + ' · política', ic: 'book', href: '#/politicas' })),
      ...S.foruns.map((f) => ({ t: f.nome, s: 'Fórum · ' + f.sigla, ic: 'users', href: '#/foruns/' + f.id })),
    ];
    const dlg = document.createElement('dialog');
    dlg.className = 'palette';
    dlg.innerHTML = '<div class="pal-in">' + String(icon('search', 18)) + '<input type="text" placeholder="Buscar decisões, reuniões, riscos, políticas…" aria-label="Buscar" autocomplete="off"><kbd>Esc</kbd></div><ul class="pal-l" role="listbox"></ul>';
    document.body.appendChild(dlg);
    const inp = $('input', dlg), ul = $('ul', dlg);
    let sel = 0, shown = [];
    const draw = () => {
      const q = U.norm(inp.value).split(/\s+/).filter(Boolean);
      shown = items.filter((x) => { const h = U.norm(x.t + ' ' + x.s); return q.every((w) => h.includes(w)); }).slice(0, 9);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      ul.innerHTML = shown.length ? shown.map((x, i) => '<li role="option" data-i="' + i + '" class="' + (i === sel ? 'on' : '') + '">' + icon(x.ic, 16) + '<span><strong>' + U.esc(x.t) + '</strong><small>' + U.esc(x.s) + '</small></span></li>').join('') : '<li class="none">Nada encontrado para essa busca.</li>';
    };
    const open = (i) => { const x = shown[i]; if (!x) return; dlg.close(); dlg.remove(); if (location.hash === x.href) UI.render(); else location.hash = x.href; };
    inp.addEventListener('input', () => { sel = 0; draw(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } else if (e.key === 'Enter') { open(sel); e.preventDefault(); }
    });
    ul.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) open(+li.dataset.i); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) { dlg.close(); dlg.remove(); } });
    dlg.addEventListener('close', () => dlg.remove());
    draw(); dlg.showModal(); inp.focus();
  };
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); UI.palette(); }
  });

  /* navegação genérica por data-href (linhas clicáveis) */
  UI.on.go = (el) => { location.hash = el.dataset.href; };
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-row-href]');
    if (!row || e.target.closest('a,button,select,input,label,textarea')) return;
    location.hash = row.dataset.rowHref;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const row = e.target.closest && e.target.closest('[data-row-href]');
    if (row && e.target === row) location.hash = row.dataset.rowHref;
  });

  G.UI = UI;
})(window);
