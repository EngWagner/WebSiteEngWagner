/**
 * Foto ampliada com zoom.
 *
 * Marque cada foto com um link para a versão grande:
 *   <a href="images/.../foto-full.webp" data-lightbox="grupo"><img src="...-800.webp" alt="..."></a>
 * Links com o mesmo data-lightbox viram uma sequência (setas trocam a foto).
 * A legenda vem do <figcaption> da figura; sem ele, do alt da imagem.
 * Sem JavaScript (ou num navegador sem <dialog>), o link abre a foto grande direto.
 *
 * Zoom: roda do mouse, clique, toque duplo, pinça com dois dedos, botões e as teclas + - 0.
 * Com zoom, arraste para mover. Sem zoom, deslize para o lado para trocar de foto.
 */
(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (!links.length || typeof HTMLDialogElement !== 'function') return;

  var MIN = 1, MAX = 4, STEP = 1.6, TAP_ZOOM = 2.5;
  var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // ---------- Montagem ----------
  function icon(id) { return '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  var dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML =
    '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>' +
    '<div class="lb-bar"><p class="lb-caption"></p><p class="lb-hint"></p></div>' +
    '<button type="button" class="lb-btn lb-close">' + icon('i-x') + '</button>' +
    '<button type="button" class="lb-btn lb-prev">' + icon('i-chevron-left') + '</button>' +
    '<button type="button" class="lb-btn lb-next">' + icon('i-chevron-right') + '</button>' +
    '<div class="lb-zoom">' +
      '<button type="button" class="lb-btn lb-out">' + icon('i-zoom-out') + '</button>' +
      '<button type="button" class="lb-btn lb-in">' + icon('i-zoom-in') + '</button>' +
    '</div>';
  document.body.appendChild(dlg);

  function $(sel) { return dlg.querySelector(sel); }
  var stage = $('.lb-stage'), img = $('.lb-img'), cap = $('.lb-caption'), hint = $('.lb-hint');
  var btnClose = $('.lb-close'), btnPrev = $('.lb-prev'), btnNext = $('.lb-next'), btnIn = $('.lb-in'), btnOut = $('.lb-out');
  dlg.setAttribute('aria-label', T('lb.label'));
  [[btnClose, 'lb.close'], [btnPrev, 'lb.prev'], [btnNext, 'lb.next'], [btnIn, 'lb.zoomIn'], [btnOut, 'lb.zoomOut']].forEach(function (b) {
    b[0].setAttribute('aria-label', T(b[1]));
    b[0].title = T(b[1]);
  });

  // ---------- Estado: escala e deslocamento do centro da foto ----------
  var group = [], index = 0, opener = null;
  var s = 1, tx = 0, ty = 0;

  function apply(animate) {
    img.classList.toggle('is-animating', !!animate);
    img.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s + ')';
    dlg.classList.toggle('is-zoomed', s > MIN + 0.01);
    btnOut.disabled = s <= MIN + 0.01;
    btnIn.disabled = s >= MAX - 0.01;
  }

  // A foto não pode se afastar da borda quando está maior que o palco.
  function clamp() {
    var mx = Math.max(0, (img.offsetWidth * s - stage.clientWidth) / 2);
    var my = Math.max(0, (img.offsetHeight * s - stage.clientHeight) / 2);
    tx = Math.min(mx, Math.max(-mx, tx));
    ty = Math.min(my, Math.max(-my, ty));
  }

  // Zoom mantendo parado o ponto (px, py), medido a partir do centro do palco.
  function zoomTo(next, px, py, animate) {
    next = Math.min(MAX, Math.max(MIN, next));
    tx = px - (px - tx) * (next / s);
    ty = py - (py - ty) * (next / s);
    s = next;
    if (s <= MIN) { s = MIN; tx = 0; ty = 0; }
    clamp();
    apply(animate);
  }

  function fromCenter(x, y) {
    var r = stage.getBoundingClientRect();
    return { x: x - (r.left + r.width / 2), y: y - (r.top + r.height / 2) };
  }

  // Ajusta a foto ao palco, com folga para os botões.
  function fit() {
    var nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;
    var wide = stage.clientWidth >= 700;
    var mx = wide ? 72 : 12, my = wide ? 64 : 12; // em tela larga, setas e botões ficam fora da foto
    var k = Math.min((stage.clientWidth - 2 * mx) / nw, (stage.clientHeight - 2 * my) / nh);
    img.style.width = Math.max(1, Math.round(nw * k)) + 'px';
    img.style.height = Math.max(1, Math.round(nh * k)) + 'px';
  }

  img.addEventListener('load', function () { fit(); clamp(); apply(false); });
  window.addEventListener('resize', function () { if (dlg.open) { fit(); clamp(); apply(false); } });

  // ---------- Abrir, trocar e fechar ----------
  function captionOf(a) {
    var fig = a.closest('figure'), fc = fig && fig.querySelector('figcaption');
    var thumb = a.querySelector('img');
    return fc ? fc.textContent : (thumb ? thumb.alt : '');
  }

  function show(i) {
    index = (i + group.length) % group.length;
    var a = group[index], thumb = a.querySelector('img');
    s = 1; tx = 0; ty = 0; apply(false);
    img.alt = thumb ? thumb.alt : '';
    // A miniatura já está em cache: aparece na hora e dá lugar à grande quando ela chegar.
    if (thumb && thumb.currentSrc) img.src = thumb.currentSrc;
    var big = new Image();
    big.onload = function () { if (group[index] === a) img.src = big.src; };
    big.src = a.href;
    cap.textContent = captionOf(a);
    btnPrev.hidden = btnNext.hidden = group.length < 2;
  }

  function close() { if (dlg.open) dlg.close(); }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button > 0) return; // nova aba continua valendo
      e.preventDefault();
      var name = a.getAttribute('data-lightbox');
      group = links.filter(function (l) { return l.getAttribute('data-lightbox') === name; });
      opener = a;
      hint.textContent = T(coarse ? 'lb.hintTouch' : 'lb.hintMouse');
      document.documentElement.classList.add('lb-open');
      dlg.showModal();
      show(group.indexOf(a));
    });
  });

  dlg.addEventListener('close', function () {
    document.documentElement.classList.remove('lb-open');
    img.removeAttribute('src');
    var back = group[index] || opener; // o foco volta para a foto que estava aberta
    if (back) back.focus();
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { show(index - 1); });
  btnNext.addEventListener('click', function () { show(index + 1); });
  btnIn.addEventListener('click', function () { zoomTo(s * STEP, 0, 0, true); });
  btnOut.addEventListener('click', function () { zoomTo(s / STEP, 0, 0, true); });

  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' && group.length > 1) { e.preventDefault(); show(index + 1); }
    else if (e.key === 'ArrowLeft' && group.length > 1) { e.preventDefault(); show(index - 1); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(s * STEP, 0, 0, true); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomTo(s / STEP, 0, 0, true); }
    else if (e.key === '0') { e.preventDefault(); zoomTo(MIN, 0, 0, true); }
  });

  // ---------- Roda do mouse (e pinça do touchpad, que chega como roda com Ctrl) ----------
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var c = fromCenter(e.clientX, e.clientY);
    zoomTo(s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), c.x, c.y, false);
  }, { passive: false });

  // ---------- Toque e mouse: arrastar, pinça, toque duplo, deslizar ----------
  var pts = new Map(), start = null, pinch = null, moved = false, lastTap = 0, tapTimer = 0;

  function pair() { var it = pts.values(); return [it.next().value, it.next().value]; }

  function pinchStart() {
    var p = pair();
    pinch = {
      dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1,
      mid: fromCenter((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2),
      s: s, tx: tx, ty: ty
    };
  }

  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      moved = false;
      start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, onImg: e.target === img };
    } else if (pts.size === 2) {
      moved = true;
      pinchStart();
    }
  });

  stage.addEventListener('pointermove', function (e) {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2 && pinch) {
      var p = pair();
      var dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var mid = fromCenter((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
      var next = Math.min(MAX, Math.max(MIN, pinch.s * dist / pinch.dist));
      // o ponto da foto que estava sob o meio da pinça continua sob o meio dela
      tx = mid.x - (pinch.mid.x - pinch.tx) * (next / pinch.s);
      ty = mid.y - (pinch.mid.y - pinch.ty) * (next / pinch.s);
      s = next;
      clamp();
      apply(false);
    } else if (pts.size === 1 && start) {
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (!moved) return;
      if (s > MIN + 0.01) { tx = start.tx + dx; ty = start.ty + dy; clamp(); apply(false); }
      else if (group.length > 1) { img.classList.remove('is-animating'); img.style.transform = 'translateX(' + dx + 'px)'; }
    }
  });

  function release(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size === 1) {
      // terminou a pinça: o dedo que ficou continua arrastando
      var p = pts.values().next().value;
      start = { x: p.x, y: p.y, tx: tx, ty: ty, onImg: true };
      pinch = null;
      return;
    }
    if (pts.size > 0 || !start) return;
    pinch = null;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    var onImg = start.onImg;
    start = null;

    if (moved) {
      if (s <= MIN + 0.01) {
        if (group.length > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
        else apply(true); // arrasto curto: a foto volta para o lugar
      }
      return;
    }

    var c = fromCenter(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') {
      if (onImg) zoomTo(s > MIN + 0.01 ? MIN : TAP_ZOOM, c.x, c.y, true);
      else close(); // clique fora da foto fecha
      return;
    }
    var now = Date.now();
    if (now - lastTap < 320) {
      clearTimeout(tapTimer);
      lastTap = 0;
      zoomTo(s > MIN + 0.01 ? MIN : TAP_ZOOM, c.x, c.y, true);
    } else {
      lastTap = now;
      if (!onImg && s <= MIN + 0.01) tapTimer = setTimeout(close, 320); // toque único fora da foto fecha
    }
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
})();
