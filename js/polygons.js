/**
 * Malha de polígonos do fundo — porta, em JS puro, do PolygonBackground do
 * Admin Uaus (apps/admin/src/features/home/components/PolygonBackground.tsx).
 *
 * Mantém o que o Admin já resolveu: densidade pela área com teto (26 a 70
 * pontos), movimento pelo relógio com teto de 60 quadros/s, pausa com a aba
 * oculta, imagem parada com prefers-reduced-motion, DPR com teto 2, e sem
 * canvas 2D simplesmente não desenha.
 *
 * O que muda aqui:
 * - a paleta vem das variáveis CSS (--poly-a/b/c, --poly-line/fill/dot) e é
 *   relida no evento "themechange", com redesenho imediato;
 * - redimensionar só reespalha os pontos quando a LARGURA muda: no celular, a
 *   barra do navegador aparece e some ao rolar e mudaria a altura a todo
 *   instante, sorteando a malha de novo no meio da leitura;
 * - com ponteiro fino (mouse), linhas ligam o cursor aos pontos próximos.
 */
(function () {
  'use strict';

  var MAX_SPEED = 0.28;          // px por quadro de 60 Hz, por eixo
  var FRAME_MS = 1000 / 60;
  var POINTER_RADIUS = 150;

  function readPalette() {
    var s = getComputedStyle(document.documentElement);
    function rgb(name, fallback) {
      var parts = s.getPropertyValue(name).trim().split(/[\s,]+/).map(Number);
      return parts.length === 3 && parts.every(Number.isFinite) ? parts : fallback;
    }
    function num(name, fallback) {
      var v = parseFloat(s.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    }
    return {
      colors: [rgb('--poly-a', [255, 77, 109]), rgb('--poly-b', [167, 139, 250]), rgb('--poly-c', [56, 189, 248])],
      line: num('--poly-line', 0.34),
      fill: num('--poly-fill', 0.055),
      dot: num('--poly-dot', 0.8)
    };
  }

  /** Cor numa posição horizontal (0 = esquerda, 1 = direita). NaN vale a esquerda. */
  function colorAt(colors, fraction) {
    var valid = Number.isFinite(fraction) ? fraction : 0;
    var scaled = Math.min(Math.max(valid, 0), 0.999) * (colors.length - 1);
    var index = Math.floor(scaled);
    var t = scaled - index;
    var from = colors[index];
    var to = colors[index + 1] || from;
    return [
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t)
    ];
  }

  function init(canvas) {
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;

    var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var finePointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var palette = readPalette();
    var width = 0, height = 0, points = [];
    var visible = !document.hidden;
    var lastTime = null;
    var pointer = { x: 0, y: 0, active: false };

    function linkDistance() { return Math.min(190, Math.max(120, width * 0.16)); }

    function spawn(count) {
      var list = [];
      for (var i = 0; i < count; i++) {
        list.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * MAX_SPEED,
          vy: (Math.random() - 0.5) * MAX_SPEED,
          radius: 1 + Math.random() * 1.6
        });
      }
      return list;
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var box = canvas.getBoundingClientRect();
      var widthChanged = Math.abs(box.width - width) > 1;
      width = box.width;
      height = box.height;
      if (width === 0 || height === 0) { points = []; return; }

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (widthChanged || points.length === 0) {
        var count = Math.round(Math.min(70, Math.max(26, (width * height) / 22000)));
        points = spawn(count);
      }
    }

    function draw() {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);
      var limit = linkDistance();
      var colors = palette.colors;

      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        var neighbors = [];

        for (var j = i + 1; j < points.length; j++) {
          var q = points[j];
          var distance = Math.hypot(p.x - q.x, p.y - q.y);
          if (distance > limit) continue;
          neighbors.push(j);
          var strength = 1 - distance / limit;
          var c = colorAt(colors, (p.x + q.x) / 2 / width);
          ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (strength * palette.line) + ')';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }

        var pc = colorAt(colors, p.x / width);

        // O "polígono": o triângulo do ponto com os dois primeiros vizinhos ligados.
        if (neighbors.length >= 2) {
          var a = points[neighbors[0]];
          var b = points[neighbors[1]];
          ctx.fillStyle = 'rgba(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ',' + palette.fill + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.closePath();
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ',' + palette.dot + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (pointer.active) {
          var d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          if (d < POINTER_RADIUS) {
            ctx.strokeStyle = 'rgba(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ',' + ((1 - d / POINTER_RADIUS) * palette.line * 1.4) + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }
    }

    function move(steps) {
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        p.x += p.vx * steps;
        p.y += p.vy * steps;
        // Quem sai por uma borda volta pela oposta, 20 px fora da vista.
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }
    }

    function step(now) {
      if (!visible) {
        lastTime = null;
      } else if (lastTime === null) {
        lastTime = now;
      } else if (now - lastTime >= FRAME_MS - 1) {
        move(Math.min((now - lastTime) / FRAME_MS, 3));
        lastTime = now;
        draw();
      }
      window.requestAnimationFrame(step);
    }

    function redraw() { resize(); draw(); }

    redraw();

    var animate = !reducedMotion && typeof window.requestAnimationFrame === 'function';
    if (animate) {
      window.requestAnimationFrame(step);
      document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
      if (finePointer) {
        window.addEventListener('pointermove', function (e) {
          pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
        }, { passive: true });
        document.addEventListener('pointerleave', function () { pointer.active = false; });
        window.addEventListener('blur', function () { pointer.active = false; });
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(redraw).observe(canvas);
    } else {
      window.addEventListener('resize', redraw);
    }

    document.addEventListener('themechange', function () {
      palette = readPalette();
      draw();
    });
  }

  window.Polygons = { init: init };
})();
