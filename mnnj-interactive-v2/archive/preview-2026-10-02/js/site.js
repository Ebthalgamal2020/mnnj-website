/* MNNJ V2 · homepage behaviour */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- glass */
  var hero = document.querySelector('[data-glass]');
  var toggle = document.querySelector('[data-clear]');
  var label = toggle.querySelector('span');
  var glass = null, introCover = 0, finished = false, introRunning = true;

  function setPressed(on) { toggle.setAttribute('aria-pressed', on); label.textContent = on ? 'Mist it again' : 'Clear the glass'; }

  // a smooth hand-wipe path (Catmull-Rom through the key points)
  function smooth(pts, n) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (j) {
          return .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        }));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // overlapping horizontal passes, the way glass is actually wiped
  function introLanes(w, h) {
    var lanes = w < 768
      ? [[.47, .05, .95], [.565, .04, .96], [.655, .1, .93]]
      : [[.20, .53, .965], [.355, .515, .975], [.51, .54, .97], [.665, .52, .95]];
    return lanes.map(function (l, i) {
      var y = l[0] * h, x0 = l[1] * w, x1 = l[2] * w, dir = 1;
      return smooth([[x0, y + 10], [x0 + (x1 - x0) * .45, y - 6], [x1, y + 6 + i * 2]], 16);
    });
  }
  function playLanes(lanes, done) {
    var i = 0;
    (function next() {
      if (i >= lanes.length) { if (done) done(); return; }
      glass.auto(lanes[i++], reduced ? 0 : 620, function () { setTimeout(next, reduced ? 0 : 70); });
    })();
  }

  if (hero && window.MNNJGlass) {
    glass = new MNNJGlass(hero, {
      focusX: innerWidth < 768 ? .58 : .62, focusY: .55, maxDpr: innerWidth < 768 ? 1.25 : 1.5,
      onWipe: function (c) {
        if (introRunning) return;
        if (c > introCover + .06) doc.classList.add('wiped');
        if (!finished && c > .62) { finished = true; glass.setClear(true); setPressed(true); }
      }
    });
    var src = (innerWidth * (devicePixelRatio || 1) > 1800) ? 'assets/photo/hero-3200.webp' : 'assets/photo/hero-1600.webp';
    glass.init(src).then(function () {
      doc.classList.add('gl-on');
      setTimeout(function () {
        playLanes(introLanes(glass.w, glass.h), function () { introCover = glass.coverage(); introRunning = false; });
      }, reduced ? 0 : 450);
      // a gentle parallax while the hero scrolls away
      addEventListener('scroll', function () {
        var y = Math.min(scrollY, glass.h);
        glass.par = [0, -y / glass.h * .06 * glass.cover[1]];
        glass.request();
      }, { passive: true });
    }).catch(function (e) { console.warn('[mnnj] glass unavailable:', e.message); doc.classList.add('no-gl'); toggle.hidden = true; });
  }

  toggle.addEventListener('click', function () {
    if (!glass || !glass.gl) return;
    var on = toggle.getAttribute('aria-pressed') !== 'true';
    if (!on) {                                     // mist it again from scratch
      glass.mctx.fillStyle = '#000'; glass.mctx.fillRect(0, 0, glass.mask.width, glass.mask.height);
      glass.grid.fill(0); glass.hits = 0; glass.maskDirty = true; finished = false; introCover = 0; introRunning = false;
      doc.classList.remove('wiped');
    }
    glass.setClear(on); setPressed(on);
  });

  /* ------------------------------------------------- service → enquiry */
  document.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('.chips input[value="' + a.getAttribute('data-service') + '"]');
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

  /* ------------------------------------------------- one quiet reveal */
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rise').forEach(function (el, i) { el.style.transitionDelay = (i % 2) * 90 + 'ms'; io.observe(el); });

  var yr = document.querySelector('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();
})();
