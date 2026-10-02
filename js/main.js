/* MNNJ Exterior Property Care — site behaviour (vanilla JS, no dependencies) */

(() => {
  "use strict";

  // The "js" class is also set inline in <head> to avoid a flash before reveals
  document.documentElement.classList.add("js");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Header: solid background once the page is scrolled -----------------------
     A 24px sentinel at the top of the document replaces a scroll listener. */
  const header = document.querySelector("[data-header]");
  if (header && "IntersectionObserver" in window) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none;";
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    }).observe(sentinel);
  }

  /* Mobile menu ----------------------------------------------------------------- */
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.getElementById("mobile-menu");

  if (toggle && menu) {
    const desktopQuery = window.matchMedia("(min-width: 64rem)");

    const setOpen = (open, { returnFocus = true } = {}) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      menu.inert = !open;
      document.body.style.overflow = open ? "hidden" : "";
      document.body.classList.toggle("menu-open", open);
      if (open) {
        menu.querySelector("a, button")?.focus({ preventScroll: true });
      } else if (returnFocus) {
        toggle.focus({ preventScroll: true });
      }
    };

    menu.inert = true;
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));

    // Close after choosing a link (focus should follow the link, not the toggle)
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false, { returnFocus: false });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setOpen(false);
    });

    // Reset if the viewport grows to desktop while open
    desktopQuery.addEventListener("change", (e) => {
      if (e.matches && toggle.getAttribute("aria-expanded") === "true") setOpen(false, { returnFocus: false });
    });
  }

  /* Scroll reveal ----------------------------------------------------------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  /* Active section highlighting in the desktop nav ---------------------------------- */
  const navLinks = [...document.querySelectorAll("[data-nav] a[href^='#']")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            if (link.getAttribute("href") === id) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* Hero: gentle scroll parallax on the background layer ------------------------------
     The scroll listener is attached only while the hero is on screen, and the
     ambient light drift is paused once it scrolls away. */
  const hero = document.getElementById("top");
  const parallax = document.querySelector("[data-parallax]");
  if (hero && parallax && !reducedMotion.matches && "IntersectionObserver" in window) {
    let ticking = false;
    const update = () => {
      parallax.style.transform = `translate3d(0, ${window.scrollY * 0.12}px, 0)`;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    new IntersectionObserver(([entry]) => {
      hero.classList.toggle("hero-offscreen", !entry.isIntersecting);
      if (entry.isIntersecting) window.addEventListener("scroll", onScroll, { passive: true });
      else window.removeEventListener("scroll", onScroll);
    }).observe(hero);
  }

  /* Sticky call button ------------------------------------------------------------------
     Stays hidden unless a confirmed number is present in data-tel. When enabled,
     it appears after the hero and tucks away over the contact section and footer
     so it never covers the form or footer links. */
  const callButton = document.querySelector("[data-call-button]");
  const tel = callButton?.dataset.tel?.trim() ?? "";
  if (callButton && /^\+?[0-9][0-9 ()-]{6,}$/.test(tel)) {
    callButton.href = `tel:${tel.replace(/[^0-9+]/g, "")}`;
    callButton.hidden = false;
    if ("IntersectionObserver" in window) {
      const covering = new Set();
      const zones = [hero, document.getElementById("contact"), document.querySelector("footer")].filter(Boolean);
      const zoneObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? covering.add(e.target) : covering.delete(e.target)));
        callButton.classList.toggle("is-tucked", covering.size > 0);
      });
      zones.forEach((zone) => zoneObserver.observe(zone));
    }
  }

  /* Before / after comparison: mirror the range value into --pos ------------------------ */
  document.querySelectorAll("[data-compare]").forEach((compare) => {
    const range = compare.querySelector("[data-compare-range]");
    if (!range) return;
    const sync = () => {
      compare.style.setProperty("--pos", `${range.value}%`);
      range.setAttribute("aria-valuetext", `${range.value}% before, ${100 - range.value}% after`);
    };
    range.addEventListener("input", sync);
    sync();
  });

  /* Service "Request a quote" links pre-select that service in the form ------------------ */
  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const box = document.querySelector(`input[name="services"][value="${link.dataset.service}"]`);
      if (box) box.checked = true;
    });
  });

  /* Quote form: no submission service is configured yet. --------------------------------
     Never pretend the enquiry was sent. Replace this handler when a real
     endpoint (e.g. a form service or server script) is chosen. */
  const form = document.querySelector("[data-quote-form]");
  const status = document.querySelector("[data-form-status]");
  if (form && status) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      status.innerHTML =
        '<p class="form-status"><strong>Not sent.</strong> Online enquiries are not connected yet, so this form has not been submitted. ' +
        "Please contact MNNJ directly once contact details are published.</p>";
      status.focus({ preventScroll: false });
    });
  }

  /* Footer year ------------------------------------------------------------------------ */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
