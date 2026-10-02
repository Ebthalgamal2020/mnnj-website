/* MNNJ V2 · homepage behaviour ("Noir & Light") */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* hero entrance once the photograph is ready */
  var heroImg = document.querySelector('.hero > img');
  function ready() { requestAnimationFrame(function () { doc.classList.add('ready'); }); }
  if (heroImg.complete) ready(); else { heroImg.addEventListener('load', ready); heroImg.addEventListener('error', ready); }

  /* ---------------------------------- services: expanding panels (tap) */
  var panelList = document.querySelector('[data-panels]');
  if (panelList) {
    var panelItems = panelList.querySelectorAll('.panel');
    panelItems.forEach(function (li) {
      li.querySelector('.panel-open').addEventListener('click', function () {
        panelItems.forEach(function (x) {
          var on = x === li;
          x.classList.toggle('on', on);
          x.querySelector('.panel-open').setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        // move focus to the opened panel's button so keyboard users land in it
        var cta = li.querySelector('.panel-body .btn');
        setTimeout(function () { cta.focus({ preventScroll: true }); }, reduced ? 0 : 350);
      });
    });
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
