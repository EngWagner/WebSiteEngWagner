/**
 * Zona segura — o lado do navegador.
 *
 * O site é público (GitHub Pages, repositório aberto), então NADA restrito mora
 * aqui: telefone, e-mail, história e currículo chegam do Worker da Cloudflare
 * depois que ele valida, no servidor, o token do Turnstile. Ver a seção 12 do
 * PLANO-REDESIGN.md.
 *
 * Contrato com o Worker:
 *   POST {endpoint}/unlock   corpo { token, consent: true, terms: "v1", lang }
 *     200 → { session, expiresAt, record: { at, ip, country, ua, terms }, content }
 *     400/403 → verificação recusada · 403 { error: "blocked" } → acesso recusado
 *     429 → muitas tentativas
 *   GET  {endpoint}/cv?lang=pt|en   cabeçalho Authorization: Bearer {session}
 *     200 → o PDF · 401 → sessão vencida
 *   GET  {endpoint}/status   → { available } — consultado antes de mostrar o termo
 *
 * Acesso recusado (por exemplo, fora dos países permitidos no Worker): o
 * visitante vê só um aviso genérico de "sinais de risco", sem o motivo.
 *
 *   content = {
 *     phone: "+55 ...", whatsapp: "55...", email: "...",
 *     location: { pt, en }, instagram: "https://...", facebook: "https://...",
 *     story: { pt: ["parágrafo com **negrito**", ...], en: [...] },
 *     cv: true
 *   }
 *
 * O que vem do servidor é montado com textContent — nunca innerHTML —, para que
 * um conteúdo adulterado não vire script na página.
 *
 * Configuração no <head> de cada página:
 *   <meta name="zone-endpoint" content="https://...workers.dev">
 *   <meta name="zone-sitekey"  content="chave pública do Turnstile">
 * Rodando em localhost sem essas metas, usa o `wrangler dev` (porta 8787) e a
 * chave de teste do Turnstile, que sempre passa.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'secureZone';
  var NUDGE_KEY = 'zoneNudgeSeen';
  var TERMS = 'v1';
  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  var root = document.documentElement;
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function meta(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? (m.getAttribute('content') || '').trim() : '';
  }
  var ENDPOINT = (meta('zone-endpoint') || (isLocal ? 'http://127.0.0.1:8787' : '')).replace(/\/+$/, '');
  var SITEKEY = meta('zone-sitekey') || (isLocal ? '1x00000000000000000000AA' : '');

  // ---------- Montagem segura de DOM ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function icon(id, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'i ' + (cls || 'i-sm'));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#i-' + id);
    svg.appendChild(use);
    return svg;
  }

  /** "texto com **negrito**" → nós de texto e <strong>, sem interpretar HTML. */
  function richText(parent, text) {
    String(text).split(/(\*\*[^*]+\*\*)/).forEach(function (part) {
      if (/^\*\*[^*]+\*\*$/.test(part)) parent.appendChild(el('strong', { text: part.slice(2, -2) }));
      else if (part) parent.appendChild(document.createTextNode(part));
    });
    return parent;
  }

  function httpsUrl(value) {
    try { var u = new URL(value); return u.protocol === 'https:' ? u.href : null; } catch (e) { return null; }
  }

  function pick(obj) { return obj && typeof obj === 'object' ? (obj[T.lang] || obj.pt || '') : (obj || ''); }

  function unlockedHead(title) {
    return el('div', { class: 'restricted-head' }, [
      el('h3', { text: title }),
      el('span', { class: 'class-tag is-restricted' }, [icon('shield-check'), el('span', { text: T('zone.unlocked') })])
    ]);
  }

  function external(href, iconId, label, cls) {
    var url = httpsUrl(href);
    if (!url) return null;
    return el('a', { class: cls, href: url, target: '_blank', rel: 'noopener noreferrer' }, [icon(iconId), el('span', { text: label })]);
  }

  function contactRow(iconId, label, value, actions) {
    return el('div', { class: 'contact-row' }, [
      icon(iconId),
      el('div', { style: 'min-width:0' }, [el('div', { class: 'label', text: label }), el('div', { class: 'value', text: value })]),
      actions && actions.length ? el('div', { class: 'row-actions' }, actions) : null
    ]);
  }

  // ---------- O que cada slot mostra com a zona aberta ----------
  var RENDER = {
    'hero-cta': function (c) {
      if (!c.cv) return [];
      return [el('button', { class: 'btn btn-ghost', type: 'button', 'data-cv': '' }, [icon('download'), el('span', { text: T('zone.cv') })])];
    },
    'story': function (c) {
      var story = el('div', { class: 'story' });
      var paragraphs = (c.story && (c.story[T.lang] || c.story.pt)) || [];
      paragraphs.forEach(function (p) { story.appendChild(richText(el('p'), p)); });
      return [el('span', { class: 'card-glow', 'aria-hidden': 'true' }), unlockedHead(T('zone.story')), story];
    },
    'contact': function (c) {
      var rows = [];
      if (c.phone) {
        rows.push(contactRow('phone', T('zone.phone'), c.phone,
          [el('a', { href: 'tel:' + String(c.phone).replace(/[^\d+]/g, ''), text: T('zone.call') })]));
      }
      if (c.whatsapp) {
        rows.push(contactRow('chat', 'WhatsApp', c.phone || c.whatsapp,
          [el('a', { href: 'https://wa.me/' + String(c.whatsapp).replace(/\D/g, ''), target: '_blank', rel: 'noopener noreferrer', text: T('zone.open') })]));
      }
      if (c.email) {
        rows.push(contactRow('mail', T('zone.email'), c.email, [
          el('button', { type: 'button', 'data-copy': c.email, 'aria-label': T('zone.copy') }, [icon('copy')]),
          el('a', { href: 'mailto:' + c.email, text: T('zone.write') })
        ]));
      }
      if (c.location) rows.push(contactRow('pin', T('zone.location'), pick(c.location)));

      var extra = el('div', { class: 'contact-extra' }, [
        c.cv ? el('button', { class: 'btn btn-zone btn-sm', type: 'button', 'data-cv': '' }, [icon('download'), el('span', { text: T('zone.cvPdf') })]) : null,
        external(c.instagram, 'instagram', 'Instagram', 'btn btn-ghost btn-sm'),
        external(c.facebook, 'facebook', 'Facebook', 'btn btn-ghost btn-sm')
      ]);
      return [el('span', { class: 'card-glow', 'aria-hidden': 'true' }), unlockedHead(T('zone.contact')), el('div', { class: 'contact-rows' }, rows), extra];
    }
  };

  // ---------- Sessão ----------
  function readSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return s && s.token && s.exp > Date.now() ? s : null;
    } catch (e) { return null; }
  }
  function writeSession(s) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {} }
  function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }

  // ---------- Slots ----------
  var slots = {};
  var dialog, paneConsent, paneSession, paneBlocked, consentBox, enterBtn, errorEl, timerEl, zoneBtn, classLine;
  var timerId = null;

  function capture() {
    document.querySelectorAll('[data-zone-slot]').forEach(function (node) {
      slots[node.getAttribute('data-zone-slot')] = { el: node, html: node.innerHTML };
    });
  }

  function render() {
    var session = readSession();
    root.classList.toggle('zone-on', !!session);

    Object.keys(slots).forEach(function (name) {
      var slot = slots[name];
      if (session && RENDER[name]) {
        slot.el.replaceChildren.apply(slot.el, RENDER[name](session.content || {}));
      } else {
        slot.el.innerHTML = slot.html; // o HTML original, da própria página
      }
    });

    if (classLine) classLine.textContent = T(session ? 'footer.full' : 'footer.public');
    if (zoneBtn) {
      if (session) zoneBtn.setAttribute('aria-label', T('zone.btn.active'));
      else zoneBtn.removeAttribute('aria-label');
    }
    renderRecord(session);
    tick();
  }

  function renderRecord(session) {
    var dl = document.getElementById('zone-record');
    if (!dl || !session) return;
    var locale = T.lang === 'en' ? 'en-US' : 'pt-BR';
    var r = session.record || {};
    var rows = [
      ['record.when', r.at ? new Date(r.at).toLocaleString(locale) : '—'],
      ['record.ip', r.ip || '—'],
      ['record.country', r.country || '—'],
      ['record.browser', r.ua || '—'],
      ['record.terms', r.terms || TERMS],
      ['record.expires', new Date(session.exp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })]
    ];
    dl.replaceChildren.apply(dl, rows.map(function (row) {
      return el('div', {}, [el('dt', { text: T(row[0]) }), el('dd', { text: String(row[1]) })]);
    }));
  }

  function tick() {
    var session = readSession();
    if (!session) {
      if (root.classList.contains('zone-on')) {
        render();
        if (window.UI) UI.toast(T('toast.expired'));
      }
      if (timerEl) timerEl.textContent = '';
      clearInterval(timerId); timerId = null;
      return;
    }
    var left = Math.max(0, session.exp - Date.now());
    var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    if (timerEl) timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    if (!timerId) timerId = setInterval(tick, 1000);
  }

  // ---------- Turnstile (carregado só quando o modal abre) ----------
  var turnstileLoading = null, widgetId = null, turnstileToken = null;

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!turnstileLoading) {
      turnstileLoading = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = TURNSTILE_SRC;
        s.async = true;
        s.onload = function () { window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')); };
        s.onerror = function () { turnstileLoading = null; reject(new Error('turnstile')); };
        document.head.appendChild(s);
      });
    }
    return turnstileLoading;
  }

  function prepareWidget() {
    turnstileToken = null;
    updateEnter();
    if (!SITEKEY || !ENDPOINT) { showError(T('zone.err.offline')); return; }
    loadTurnstile().then(function (ts) {
      if (widgetId !== null) { ts.reset(widgetId); return; }
      widgetId = ts.render('#turnstile-box', {
        sitekey: SITEKEY,
        action: 'unlock',
        theme: root.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
        language: T.lang === 'en' ? 'en' : 'pt-br',
        callback: function (token) { turnstileToken = token; hideError(); updateEnter(); },
        'expired-callback': function () { turnstileToken = null; updateEnter(); },
        'error-callback': function () { turnstileToken = null; updateEnter(); showError(T('zone.err.widget')); }
      });
    }, function () { showError(T('zone.err.widget')); });
  }

  function resetWidget() {
    turnstileToken = null;
    updateEnter();
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
  }

  // ---------- Modal ----------
  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
  function hideError() { errorEl.hidden = true; errorEl.textContent = ''; }
  function updateEnter() { if (enterBtn) enterBtn.disabled = !(consentBox.checked && turnstileToken); }

  var TITLES = { consent: 'zone-title', session: 'zone-session-title', blocked: 'zone-blocked-title' };

  function showPane(name) {
    paneConsent.hidden = name !== 'consent';
    paneSession.hidden = name !== 'session';
    if (paneBlocked) paneBlocked.hidden = name !== 'blocked';
    dialog.setAttribute('aria-labelledby', TITLES[name] || 'zone-title');
  }

  /**
   * Este acesso pode abrir a zona? Pergunta ao Worker uma vez por página.
   * true/false, ou null se não deu para saber — aí segue o fluxo normal e o
   * /unlock decide.
   */
  var availability = null;
  function checkAvailability() {
    if (!ENDPOINT) return Promise.resolve(null);
    if (!availability) {
      availability = fetch(ENDPOINT + '/status', { credentials: 'omit' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) { return data && typeof data.available === 'boolean' ? data.available : null; })
        .catch(function () { availability = null; return null; });
    }
    return availability;
  }

  function open() {
    hideNudge();
    var session = readSession();
    if (session) {
      renderRecord(session);
      showPane('session');
    } else {
      consentBox.checked = false;
      hideError();
      showPane('consent');
    }
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
    if (!session) {
      checkAvailability().then(function (ok) {
        if (ok === false) showPane('blocked');
        else prepareWidget();
      });
    }
  }

  function close() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function enter() {
    if (enterBtn.disabled) return;
    if (!ENDPOINT) { showError(T('zone.err.offline')); return; }
    enterBtn.disabled = true;
    enterBtn.classList.add('is-loading');
    hideError();

    fetch(ENDPOINT + '/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ token: turnstileToken, consent: true, terms: TERMS, lang: T.lang })
    }).then(function (res) {
      if (res.ok) return res.json();
      return res.json().catch(function () { return {}; }).then(function (body) {
        var err = new Error('http');
        err.status = res.status;
        err.code = body && body.error;
        throw err;
      });
    }).then(function (data) {
      if (!data || !data.session || !data.content) throw new Error('payload');
      writeSession({
        token: data.session,
        exp: Number(data.expiresAt) || Date.now() + 30 * 60 * 1000,
        record: data.record || {},
        content: data.content
      });
      close();
      render();
      if (window.UI) UI.toast(T('toast.unlocked'));
    }).catch(function (err) {
      if (err.code === 'blocked') { showPane('blocked'); return; }
      showError(err.status === 429 ? T('zone.err.rate')
        : (err.status === 400 || err.status === 403) ? T('zone.err.verify')
        : T('zone.err.network'));
      resetWidget();
    }).then(function () {
      enterBtn.classList.remove('is-loading');
      updateEnter();
    });
  }

  function exit() {
    clearSession();
    close();
    render();
    if (window.UI) UI.toast(T('toast.locked'));
  }

  // ---------- Currículo: baixado com a sessão no cabeçalho, nunca na URL ----------
  function downloadCv(button) {
    var session = readSession();
    if (!session) { render(); return; }
    button.classList.add('is-loading');
    fetch(ENDPOINT + '/cv?lang=' + T.lang, {
      headers: { Authorization: 'Bearer ' + session.token },
      credentials: 'omit'
    }).then(function (res) {
      if (res.status === 401) { clearSession(); render(); throw new Error('expired'); }
      if (!res.ok) throw new Error('http');
      return res.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = el('a', { href: url, download: 'CV_WagnerBarbosa.pdf' });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }).catch(function (err) {
      if (window.UI) UI.toast(err.message === 'expired' ? T('toast.expired') : T('zone.err.cv'));
    }).then(function () { button.classList.remove('is-loading'); });
  }

  // ---------- Sugestão de entrar (uma vez por sessão) ----------
  // Aparece aos 5 s na página ou quando o visitante já rolou um terço dela.
  // Some em 14 s (pausa com o mouse em cima), com "Agora não", com Esc ou ao
  // abrir o modal; não aparece com a zona já ativa — nem enquanto a zona não
  // estiver configurada (sem Worker ou sem chave do Turnstile), para não
  // convidar o visitante a algo que ainda não funciona.
  var nudgeEl, nudgeWrap, nudgeHideTimer = null;

  function hideNudge() {
    if (!nudgeEl || nudgeEl.hidden) return;
    nudgeEl.hidden = true;
    nudgeWrap.classList.remove('has-nudge');
    zoneBtn.classList.remove('is-nudging');
    clearTimeout(nudgeHideTimer);
  }

  function showNudge(force) {
    if (!nudgeEl || !nudgeEl.hidden) return;
    var seen = false;
    try { seen = sessionStorage.getItem(NUDGE_KEY) === '1'; } catch (e) {}
    if (force !== true && (seen || readSession() || dialog.open)) return;
    try { sessionStorage.setItem(NUDGE_KEY, '1'); } catch (e) {}
    nudgeEl.hidden = false;
    nudgeWrap.classList.add('has-nudge');
    zoneBtn.classList.add('is-nudging');
    clearTimeout(nudgeHideTimer);
    nudgeHideTimer = setTimeout(hideNudge, 14000);
  }

  function setupNudge() {
    nudgeEl = document.getElementById('zone-nudge');
    nudgeWrap = document.getElementById('zone-wrap');
    if (!nudgeEl || !nudgeWrap || !ENDPOINT || !SITEKEY) return;
    // Só convida quem pode entrar: um acesso que seria recusado não vê a sugestão.
    function maybeNudge() {
      checkAvailability().then(function (ok) { if (ok !== false) showNudge(); });
    }
    var timer = setTimeout(maybeNudge, 5000);
    function onScroll() {
      var max = root.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.33) {
        window.removeEventListener('scroll', onScroll);
        clearTimeout(timer);
        maybeNudge();
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    nudgeEl.addEventListener('click', function (e) { if (e.target.closest('[data-nudge-close]')) hideNudge(); });
    nudgeEl.addEventListener('mouseenter', function () { clearTimeout(nudgeHideTimer); });
    nudgeEl.addEventListener('mouseleave', function () { nudgeHideTimer = setTimeout(hideNudge, 6000); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideNudge(); });
  }

  // ---------- Início ----------
  function init() {
    dialog = document.getElementById('zone-dialog');
    if (!dialog) return;
    paneConsent = dialog.querySelector('[data-pane="consent"]');
    paneSession = dialog.querySelector('[data-pane="session"]');
    paneBlocked = dialog.querySelector('[data-pane="blocked"]');
    consentBox = document.getElementById('zone-consent');
    enterBtn = document.getElementById('zone-enter');
    errorEl = document.getElementById('zone-error');
    timerEl = document.getElementById('zone-timer');
    zoneBtn = document.querySelector('.zone-btn');
    classLine = document.getElementById('class-line');

    capture();

    document.addEventListener('click', function (e) {
      var cv = e.target.closest('[data-cv]');
      if (cv) { e.preventDefault(); downloadCv(cv); return; }
      if (e.target.closest('[data-zone-open]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-zone-close]')) { close(); }
    });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); }); // clique fora
    consentBox.addEventListener('change', updateEnter);
    enterBtn.addEventListener('click', enter);
    document.getElementById('zone-exit').addEventListener('click', exit);

    setupNudge();
    render();
  }

  window.Zone = { init: init, open: open, nudge: function () { showNudge(true); } };
})();
