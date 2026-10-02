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

  /* ------------------------------ the difference: detail ↔ pin highlight */
  document.querySelectorAll('[data-detail]').forEach(function (li) {
    var pin = document.querySelector('[data-pin="' + li.getAttribute('data-detail') + '"]');
    if (!pin) return;
    li.addEventListener('pointerenter', function () { pin.classList.add('on'); });
    li.addEventListener('pointerleave', function () { pin.classList.remove('on'); });
  });

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
