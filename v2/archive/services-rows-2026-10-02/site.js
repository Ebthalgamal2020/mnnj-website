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

  /* -------------------------------------------- the difference: rinse */
  var track = document.querySelector('[data-rinse]');
  if (track) {
    var rinse = track.querySelector('.rinse'), steps = track.querySelectorAll('[data-step]'), rq = 0;
    function rinseUpdate() {
      rq = 0;
      var r = track.getBoundingClientRect(), total = r.height - innerHeight;
      // fully clean at 85% of the pinned scroll, then hold
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / (total * .85))) : 1;
      rinse.style.setProperty('--p', p.toFixed(4));
      rinse.classList.toggle('near-top', p < .1);
      rinse.classList.toggle('near-end', p > .9);
      rinse.classList.toggle('at-end', p > .995);
      steps.forEach(function (li, i) { li.classList.toggle('on', p > i / steps.length + .03); });
    }
    function rinseReq() { if (!rq) rq = requestAnimationFrame(rinseUpdate); }
    addEventListener('scroll', rinseReq, { passive: true });
    addEventListener('resize', rinseReq);
    rinseUpdate();
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
