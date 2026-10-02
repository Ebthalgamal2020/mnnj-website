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

  /* ------------------------------------------ the difference: louvres */
  var lv = document.querySelector('[data-louvre]'), lvBtn = document.querySelector('[data-louvre-toggle]');
  if (lv) {
    var bef = lv.getAttribute('data-before'), aft = lv.getAttribute('data-after'), IW = 2400, IH = 1600, slats = [], built = 0, moveT = 0;
    function build() {
      var n = parseInt(getComputedStyle(lv).getPropertyValue('--n'), 10) || 14;
      if (n !== built) {
        lv.querySelectorAll('.slat').forEach(function (s) { s.remove(); });
        slats = [];
        for (var i = 0; i < n; i++) {
          var s = document.createElement('span');
          s.className = 'slat'; s.setAttribute('aria-hidden', 'true');
          s.innerHTML = '<i style="background-image:url(' + bef + ')"></i><i style="background-image:url(' + aft + ')"></i>';
          lv.insertBefore(s, lv.querySelector('.tag')); slats.push(s);
        }
        built = n; lv.classList.add('built');
      }
      // size the photo to "cover" the whole frame, then offset it per slat
      var W = lv.clientWidth, H = lv.clientHeight, k = Math.max(W / IW, H / IH), bw = IW * k, bh = IH * k, sw = W / built;
      slats.forEach(function (s, i) {
        s.style.setProperty('--bw', bw + 'px'); s.style.setProperty('--bh', bh + 'px');
        s.style.setProperty('--bx', ((W - bw) / 2 - i * sw) + 'px'); s.style.setProperty('--by', ((H - bh) / 2) + 'px');
      });
    }
    function turn(on) {
      slats.forEach(function (s, i) { s.style.setProperty('--d', (reduced ? 0 : (on ? i : slats.length - 1 - i) * 75) + 'ms'); });
      lv.classList.add('moving'); clearTimeout(moveT);
      moveT = setTimeout(function () { lv.classList.remove('moving'); }, reduced ? 0 : 1200 + slats.length * 75);
      lv.classList.toggle('on', on);
      lvBtn.textContent = on ? 'Show before' : 'Show after';
    }
    build();
    var rz = 0; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(build, 120); });
    new IntersectionObserver(function (en, ob) {
      if (en[0].isIntersecting) { ob.disconnect(); setTimeout(function () { turn(true); }, reduced ? 0 : 450); }
    }, { threshold: .5 }).observe(lv);
    lvBtn.addEventListener('click', function () { turn(!lv.classList.contains('on')); });
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
