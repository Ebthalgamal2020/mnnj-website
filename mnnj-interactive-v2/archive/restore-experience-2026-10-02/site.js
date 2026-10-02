/* MNNJ V2 · homepage behaviour ("Noir & Light") */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* hero entrance once the photograph is ready */
  var heroImg = document.querySelector('.hero > img');
  function ready() { requestAnimationFrame(function () { doc.classList.add('ready'); }); }
  if (heroImg.complete) ready(); else { heroImg.addEventListener('load', ready); heroImg.addEventListener('error', ready); }

  /* -------------------------------------------- services: image preview */
  var peek = document.querySelector('.peek'), rows = document.querySelector('[data-rows]');
  if (fine && peek && rows && !reduced) {
    var imgs = peek.querySelectorAll('img'), px = 0, py = 0, tx = 0, ty = 0, raf = 0;
    function loop() { px += (tx - px) * .16; py += (ty - py) * .16; peek.style.left = px + 'px'; peek.style.top = py + 'px'; raf = (Math.abs(tx - px) + Math.abs(ty - py) > .5) ? requestAnimationFrame(loop) : 0; }
    rows.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('pointerenter', function (e) {
        var k = +a.getAttribute('data-img');
        imgs.forEach(function (im, i) { im.classList.toggle('on', i === k); });
        if (!peek.classList.contains('on')) { px = tx = e.clientX; py = ty = e.clientY; }
        peek.classList.add('on');
      });
      a.addEventListener('pointermove', function (e) { tx = e.clientX + 40; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
    });
    rows.addEventListener('pointerleave', function () { peek.classList.remove('on'); });
  }

  /* ---------------------------------------------- the restore experience */
  var stage = document.querySelector('[data-restore]'), ring = document.querySelector('.ring'), R = null, demoed = false;
  function demo() {
    if (demoed || !R) return; demoed = true;
    var w = R.w, h = R.h, small = w < 600;
    var pts = small
      ? [[w * .05, h * .72], [w * .95, h * .76], [w * .08, h * .86], [w * .92, h * .9]]
      : [[w * .06, h * .9], [w * .3, h * .8], [w * .52, h * .72], [w * .7, h * .66], [w * .86, h * .6]];
    R.auto(pts, 1700);
  }
  if (stage && window.MNNJRestore) {
    var started = false;
    new IntersectionObserver(function (en, ob) {
      en.forEach(function (e) {
        if (e.isIntersecting && !started) {
          started = true;
          R = new MNNJRestore(stage, { focusX: .5, focusY: innerWidth < 768 ? .7 : .78, maxDpr: innerWidth < 768 ? 1.25 : 1.5 });
          R.init('assets/exp/villa-clean.webp', 'assets/exp/villa-dirty.webp').then(function () {
            doc.classList.add('gl-on');
            ring.style.setProperty('--r', R.radius + 'px');
          }).catch(function (err) { console.warn('[mnnj] restore unavailable:', err.message); });
        }
      });
    }, { rootMargin: '400px 0px' }).observe(stage);
    // one demonstration pass when the section is properly in view
    new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { var t = setInterval(function () { if (R && R.w) { clearInterval(t); setTimeout(demo, reduced ? 0 : 300); } }, 100); } });
    }, { threshold: .55 }).observe(stage);

    document.querySelector('[data-restore-all]').addEventListener('click', function () { if (R) R.setClear(true); });
    document.querySelector('[data-reset]').addEventListener('click', function () { if (R) R.reset(); });

    if (fine && ring) {
      var rx = 0, ry = 0, rtx = 0, rty = 0, rr = 0, over = false;
      function rloop() { rx += (rtx - rx) * .25; ry += (rty - ry) * .25; ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'; rr = Math.abs(rtx - rx) + Math.abs(rty - ry) > .3 ? requestAnimationFrame(rloop) : 0; }
      stage.addEventListener('pointermove', function (e) { rtx = e.clientX; rty = e.clientY; if (!over) { rx = rtx; ry = rty; over = true; } ring.classList.add('on'); if (!rr) rr = requestAnimationFrame(rloop); });
      stage.addEventListener('pointerleave', function () { ring.classList.remove('on'); over = false; });
    }
  }

  /* --------------------------------------------------- quiet reveals */
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rise').forEach(function (el) { io.observe(el); });

  /* ------------------------------------------- service → enquiry form */
  document.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('.chips input[value="' + a.getAttribute('data-service') + '"]');
      if (box) box.checked = true;
    });
  });

  var form = document.querySelector('[data-form]'), status = document.querySelector('[data-status]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = form.elements.name, m = form.elements.email;
    if (!n.value.trim() || !m.value.trim() || !m.checkValidity()) { status.textContent = 'Please add your name and a valid email address.'; (!n.value.trim() ? n : m).focus(); return; }
    status.textContent = 'Thank you. This is a preview, so nothing has been sent yet.';
  });

  var yr = document.querySelector('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();
})();
