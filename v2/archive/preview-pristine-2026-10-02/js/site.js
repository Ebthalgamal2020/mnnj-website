/* MNNJ V2 · homepage behaviour ("Pristine") */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = innerWidth < 768;

  /* ------------------------------------------------------------- glass */
  var hero = document.querySelector('[data-glass]');
  var toggle = document.querySelector('[data-clear]'), tlabel = toggle.querySelector('span');
  var ring = document.querySelector('.ring');
  var glass = null, introRunning = true, introCover = 0, finished = false;

  function setPressed(on) { toggle.setAttribute('aria-pressed', on); tlabel.textContent = on ? 'Mist the glass' : 'Clear the glass'; }

  function smooth(pts, n) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (j) { return .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3); }));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // overlapping horizontal passes across the house, the way glass is wiped
  function lanes(w, h) {
    var L = small
      ? [[.24, .04, .96], [.33, .06, .95], [.42, .03, .97]]
      : [[.24, .2, .82], [.37, .17, .85], [.5, .19, .83], [.615, .23, .79]];
    return L.map(function (l, i) {
      var y = l[0] * h, x0 = l[1] * w, x1 = l[2] * w;
      return smooth([[x0, y + 8], [x0 + (x1 - x0) * .5, y - 6], [x1, y + 4 + i * 2]], 16);
    });
  }
  function play(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) { if (done) done(); return; }
      glass.auto(list[i++], reduced ? 0 : 640, function () { setTimeout(next, reduced ? 0 : 60); });
    })();
  }

  if (hero && window.MNNJGlass) {
    glass = new MNNJGlass(hero, {
      focusX: small ? .44 : .5, focusY: .5, maxDpr: small ? 1.25 : 1.5,
      look: { haze: .26, desat: .38, beads: .5, color: [.86, .89, .92] },
      onWipe: function (c) {
        if (introRunning) return;
        if (c > introCover + .05) doc.classList.add('wiped');
        if (!finished && c > .64) { finished = true; glass.setClear(true); setPressed(true); }
      }
    });
    var src = (innerWidth * (devicePixelRatio || 1) > 1700) ? 'assets/lux/villa.webp' : 'assets/lux/villa-1600.webp';
    glass.init(src).then(function () {
      doc.classList.add('gl-on');
      requestAnimationFrame(function () { doc.classList.add('ready'); });
      setTimeout(function () { play(lanes(glass.w, glass.h), function () { introCover = glass.coverage(); introRunning = false; }); }, reduced ? 0 : 900);
      addEventListener('scroll', function () {
        var y = Math.min(scrollY, glass.h);
        glass.par = [0, -y / glass.h * .07 * glass.cover[1]];
        glass.request();
      }, { passive: true });
      ring.style.setProperty('--r', glass.radius + 'px');
    }).catch(function (e) {
      console.warn('[mnnj] glass unavailable:', e.message);
      doc.classList.add('no-gl', 'ready'); toggle.hidden = true;
    });
  } else doc.classList.add('ready');

  toggle.addEventListener('click', function () {
    if (!glass || !glass.gl) return;
    var on = toggle.getAttribute('aria-pressed') !== 'true';
    if (!on) {
      glass.mctx.fillStyle = '#000'; glass.mctx.fillRect(0, 0, glass.mask.width, glass.mask.height);
      glass.grid.fill(0); glass.hits = 0; glass.maskDirty = true;
      finished = false; introCover = 0; introRunning = false; doc.classList.remove('wiped');
    }
    glass.setClear(on); setPressed(on);
  });

  /* a quiet cursor ring that shows the size of the wipe */
  if (fine && ring) {
    var rx = 0, ry = 0, tx = 0, ty = 0, raf = 0, over = false;
    function loop() {
      rx += (tx - rx) * .22; ry += (ty - ry) * .22;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      raf = Math.abs(tx - rx) + Math.abs(ty - ry) > .3 ? requestAnimationFrame(loop) : 0;
    }
    hero.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var onUi = e.target.closest && e.target.closest('a,button');
      ring.classList.toggle('on', !onUi);
      if (!over) { rx = tx; ry = ty; over = true; }
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener('pointerleave', function () { ring.classList.remove('on'); over = false; });
  }

  /* --------------------------------------------- page state for the CTA */
  var enq = document.getElementById('enquire');
  addEventListener('scroll', function () {
    doc.classList.toggle('past-hero', scrollY > innerHeight * .85);
    var r = enq.getBoundingClientRect();
    doc.classList.toggle('at-enquire', r.top < innerHeight * .9);
  }, { passive: true });

  /* ------------------------------------------------ cinematic reveals */
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal, .fade').forEach(function (el) { io.observe(el); });

  /* ---------------------------------------------- service → enquiry */
  document.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('.svc input[value="' + a.getAttribute('data-service') + '"]');
      if (box) box.checked = true;
    });
  });

  /* ---------------------------------------------------------------- form */
  var form = document.querySelector('[data-form]'), status = document.querySelector('[data-status]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = form.elements.name, m = form.elements.email;
    if (!n.value.trim() || !m.value.trim() || !m.checkValidity()) { status.textContent = 'Please add your name and a valid email address.'; (!n.value.trim() ? n : m).focus(); return; }
    status.textContent = 'Thank you. This is a preview, so nothing has been sent yet.';
  });

  var yr = document.querySelector('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();
})();
