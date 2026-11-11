/**
 * Comportamento da página: tema, menu, troca de idioma, scrollspy, revelação ao
 * rolar, frase giratória, anos calculados e copiar e-mail. Sem dependências.
 * Textos que o JS monta vêm de strings.js (T).
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Toast ----------
  var toastEl = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  var toastTimer = null;
  window.UI = {
    toast: function (msg) {
      if (!toastEl) return;
      toastText.textContent = msg;
      toastEl.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2800);
    }
  };

  if (window.Zone) Zone.init();
  if (window.Polygons) Polygons.init(document.getElementById('mesh'));

  // ---------- Tema ----------
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function isDark() { return root.getAttribute('data-theme') !== 'light'; }
  function themeUI() {
    themeBtn.setAttribute('aria-label', T(isDark() ? 'theme.toLight' : 'theme.toDark'));
    if (themeMeta) themeMeta.setAttribute('content', isDark() ? '#090e1a' : '#f5f6fa');
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    themeUI();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  });

  // ---------- Idioma: leva junto a seção em que o visitante está ----------
  var langLink = document.getElementById('lang-link');
  if (langLink) {
    langLink.addEventListener('click', function (e) {
      if (!location.hash) return;
      e.preventDefault();
      location.href = langLink.getAttribute('href') + location.hash;
    });
  }

  // ---------- Menu do celular ----------
  var menuBtn = document.getElementById('menu-toggle');
  var nav = document.getElementById('nav');
  function menuUI() {
    var open = nav.classList.contains('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', T(open ? 'menu.close' : 'menu.open'));
  }
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    menuUI();
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1040 && nav.classList.contains('is-open')) setMenu(false);
  });

  // ---------- Cabeçalho e malha ao rolar ----------
  var header = document.getElementById('site-header');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    // A malha começa forte no herói e fica discreta atrás do texto.
    var f = Math.min(y / window.innerHeight, 1);
    root.style.setProperty('--mesh-opacity', (1 - f * 0.55).toFixed(3));
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // ---------- Scrollspy ----------
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        links.forEach(function (a) {
          if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) spy.observe(target);
    });
    var hero = document.getElementById('inicio');
    if (hero) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) links.forEach(function (a) { a.removeAttribute('aria-current'); });
      }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    }
  }

  // ---------- Revelação ao rolar ----------
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  reveals.forEach(function (el) {
    var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
    var i = siblings.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
  });
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---------- Frase giratória ----------
  var rotEl = document.querySelector('.txt-rotate');
  if (rotEl) {
    var words = [];
    try { words = JSON.parse(rotEl.getAttribute('data-rotate')); } catch (e) {}
    if (reduced) {
      rotEl.textContent = words.join(' · ');
    } else if (words.length) {
      var loop = 0, txt = '', deleting = false;
      (function rotTick() {
        var full = words[loop % words.length];
        txt = deleting ? full.substring(0, txt.length - 1) : full.substring(0, txt.length + 1);
        rotEl.textContent = txt;
        var delta = deleting ? 55 : 110 - Math.random() * 40;
        if (!deleting && txt === full) { delta = 1600; deleting = true; }
        else if (deleting && txt === '') { deleting = false; loop++; delta = 300; }
        setTimeout(rotTick, delta);
      })();
    }
  }

  // ---------- Anos calculados (o número escrito no HTML é a reserva sem JS) ----------
  document.querySelectorAll('[data-years-since]').forEach(function (el) {
    var parts = el.getAttribute('data-years-since').split('-').map(Number);
    var now = new Date();
    var months = (now.getFullYear() - parts[0]) * 12 + (now.getMonth() + 1 - (parts[1] || 1));
    if (months > 0) el.textContent = String(Math.floor(months / 12));
  });
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------- Nível das habilidades em texto, para leitores de tela ----------
  document.querySelectorAll('.bento .chip[data-nivel]').forEach(function (chip) {
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = ' ' + T('lvl.' + chip.getAttribute('data-nivel'));
    chip.appendChild(sr);
  });

  // ---------- Copiar e-mail ----------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn || !navigator.clipboard) return;
    navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () {
      UI.toast(T('toast.copied'));
    }, function () {});
  });

  themeUI();
  menuUI();
})();
