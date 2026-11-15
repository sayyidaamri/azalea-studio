/* azalea® — all interactions (vanilla JS, no dependencies) */
(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isPhone = () => innerWidth < 810;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- smooth wheel scrolling (desktop pointers only) ---------- */
  let target = scrollY, current = scrollY, smoothing = false;
  const fine = matchMedia("(pointer: fine)").matches;
  if (fine && !reduce) {
    doc.classList.add("has-smooth");
    const maxY = () => doc.scrollHeight - innerHeight;
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented || document.body.classList.contains("menu-lock")) return;
      // let horizontal / nested scrollers work normally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!smoothing) { target = current = scrollY; }
      const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      target = clamp(target + d, 0, maxY());
      if (!smoothing) { smoothing = true; requestAnimationFrame(step); }
    }, { passive: false });
    const step = () => {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.5) { current = target; smoothing = false; }
      scrollTo(0, current);
      if (smoothing) requestAnimationFrame(step);
    };
    addEventListener("scroll", () => { if (!smoothing) target = current = scrollY; }, { passive: true });
  }

  /* ---------- load appear + scroll reveal ---------- */
  requestAnimationFrame(() => setTimeout(() => $$("[data-appear]").forEach((el) => el.classList.add("in")), 400));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  $$("[data-reveal]").forEach((el) => io.observe(el));

  /* ---------- header: hide on scroll down, show on scroll up ---------- */
  const hdr = document.querySelector(".hdr");
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    if (!hdr || hdr.classList.contains("menu-open")) { lastY = y; return; }
    if (y > 120 && y > lastY + 2) hdr.classList.add("is-hidden");
    else if (y < lastY - 2 || y <= 120) hdr.classList.remove("is-hidden");
    lastY = y;
  }, { passive: true });

  /* ---------- phone menu ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    const setMenu = (open) => {
      hdr.classList.toggle("menu-open", open);
      document.body.classList.toggle("menu-lock", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      document.querySelector(".mmenu")?.setAttribute("aria-hidden", String(!open));
    };
    menuBtn.addEventListener("click", () => setMenu(!hdr.classList.contains("menu-open")));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    addEventListener("resize", () => { if (!isPhone()) setMenu(false); });
  }

  /* ---------- scroll-linked effects (intro scale, floating object, footer parallax) ---------- */
  const introImg = document.querySelector(".intro__img");
  const floaty = document.querySelector(".bquote__visual");
  const ftrImg = document.querySelector(".ftr__img img");
  const progress = (el) => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1); };
  const onScrollFx = () => {
    if (reduce) return;
    if (introImg) {
      const r = introImg.parentElement.getBoundingClientRect();
      const p = clamp((innerHeight - r.top) / (innerHeight * 0.95), 0, 1);
      introImg.style.transform = `scale(${0.905 + 0.095 * p})`;
    }
    if (floaty && !isPhone()) {
      const p = progress(floaty.parentElement);
      floaty.style.transform = `translate3d(0, ${(0.5 - p) * 160}px, 0) rotate(${(p - 0.5) * 10}deg)`;
    }
    if (ftrImg) {
      const p = progress(ftrImg.parentElement);
      ftrImg.style.transform = `translate3d(0, ${-p * 16}%, 0)`;
    }
  };
  addEventListener("scroll", onScrollFx, { passive: true });
  addEventListener("resize", onScrollFx);
  onScrollFx();

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      const el = en.target, end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "";
      if (reduce) { el.textContent = end + suffix; return; }
      const t0 = performance.now(), dur = 1600;
      const tick = (t) => {
        const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * e) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  $$("[data-count]").forEach((el) => { el.textContent = "0" + (el.dataset.suffix || ""); cio.observe(el); });

  /* ---------- videos: play only while visible ---------- */
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (v.closest(".player") && !v.closest(".player").classList.contains("is-playing")) return;
      if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
    });
  }, { threshold: 0.05 });
  $$("video[data-auto]").forEach((v) => { v.muted = true; vio.observe(v); });

  /* ---------- hero carousel: infinite loop, arrows, drag, card toggles ---------- */
  $$(".hcar").forEach((car) => {
    const track = car.querySelector(".hcar__track");
    const originals = $$(".hcard", track);
    const n = originals.length;
    // clone two extra sets for a seamless loop
    const before = originals.map((c) => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); k.querySelectorAll("button").forEach((b) => (b.tabIndex = -1)); return k; });
    const after = originals.map((c) => { const k = c.cloneNode(true); k.setAttribute("aria-hidden", "true"); k.querySelectorAll("button").forEach((b) => (b.tabIndex = -1)); return k; });
    before.forEach((k) => track.insertBefore(k, track.firstChild && originals[0]));
    after.forEach((k) => track.appendChild(k));
    $$("video", track).forEach((v) => { v.muted = true; vio.observe(v); });
    let index = n; // first original card
    const stepW = () => { const c = track.children[0]; return c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 10); };
    const offset = () => (isPhone() ? 0 : 0);
    const place = (anim) => {
      track.style.transition = anim ? "transform .75s cubic-bezier(.35,0,0,1)" : "none";
      track.style.transform = `translate3d(${offset() - index * stepW() + dragDX}px,0,0)`;
    };
    let dragDX = 0;
    const normalize = () => { if (index < n) { index += n; place(false); } else if (index >= 2 * n) { index -= n; place(false); } };
    track.addEventListener("transitionend", normalize);
    const go = (d) => { normalize(); index += d; place(true); };
    car.querySelector(".carr.prev")?.addEventListener("click", () => go(-1));
    car.querySelector(".carr.next")?.addEventListener("click", () => go(1));
    car.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });

    // drag / swipe
    let sx = 0, sy = 0, down = false, moved = false, horiz = null;
    track.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; down = true; moved = false; horiz = null; sx = e.clientX; sy = e.clientY; normalize(); });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (horiz === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) horiz = Math.abs(dx) > Math.abs(dy);
      if (!horiz) return;
      moved = true; dragDX = dx; track.classList.add("dragging"); place(false);
    });
    addEventListener("pointerup", () => {
      if (!down) return; down = false; track.classList.remove("dragging");
      if (moved) { const w = stepW(); const steps = Math.round(-dragDX / w) || (Math.abs(dragDX) > 40 ? -Math.sign(dragDX) : 0); dragDX = 0; index += steps; place(true); }
    });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    // + / × toggle per card
    track.addEventListener("click", (e) => {
      const b = e.target.closest(".hcard__plus"); if (!b) return;
      const card = b.closest(".hcard"); const open = !card.classList.contains("open");
      card.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open));
      b.setAttribute("aria-label", open ? "Hide details" : "Show details");
    });
    addEventListener("resize", () => place(false));
    place(false);
  });

  /* ---------- testimonials slider ---------- */
  $$(".tcar").forEach((car) => {
    const track = car.querySelector(".tcar__track"), view = car.querySelector(".tcar__view");
    const prev = car.querySelector(".carr.prev"), next = car.querySelector(".carr.next");
    let i = 0;
    const cards = $$(".tcard", track);
    const maxShift = () => Math.max(0, track.scrollWidth - view.clientWidth);
    const update = () => {
      const w = cards[0].getBoundingClientRect().width + 10;
      const shift = Math.min(i * w, maxShift());
      track.style.transform = `translate3d(${-shift}px,0,0)`;
      prev.disabled = i <= 0; next.disabled = shift >= maxShift() - 1;
    };
    prev.addEventListener("click", () => { i = Math.max(0, i - 1); update(); });
    next.addEventListener("click", () => { if (!next.disabled) { i += 1; update(); } });
    let sx = null;
    view.addEventListener("pointerdown", (e) => (sx = e.clientX));
    view.addEventListener("pointerup", (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) (dx < 0 ? next : prev).click(); });
    addEventListener("resize", update);
    update();
  });

  /* ---------- accordion ---------- */
  $$(".acc__q").forEach((q) => q.addEventListener("click", () => {
    const item = q.closest(".acc__item"); const open = !item.classList.contains("open");
    item.classList.toggle("open", open); q.setAttribute("aria-expanded", String(open));
  }));

  /* ---------- video player (about) ---------- */
  $$(".player").forEach((pl) => {
    const v = pl.querySelector("video");
    const set = (play) => { pl.classList.toggle("is-playing", play); if (play) v.play().catch(() => {}); else v.pause(); };
    pl.querySelector(".player__play").addEventListener("click", () => set(true));
    pl.querySelector(".player__pause").addEventListener("click", () => set(false));
    // autoplay muted once visible, like the reference
    const pio = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !pl.dataset.started) { pl.dataset.started = "1"; set(!reduce); }
      else if (!en.isIntersecting && pl.classList.contains("is-playing")) v.pause();
      else if (en.isIntersecting && pl.classList.contains("is-playing")) v.play().catch(() => {});
    }, { threshold: 0.2 });
    pio.observe(pl);
  });

  /* ---------- toast ---------- */
  let toastT;
  const toast = (msg) => {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
  };

  /* ---------- share buttons ---------- */
  $$("[data-share]").forEach((b) => b.addEventListener("click", async () => {
    const url = location.href, title = document.title, kind = b.dataset.share;
    if (kind === "x") open(`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank", "noopener");
    else if (kind === "in") open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener");
    else {
      try { await navigator.clipboard.writeText(url); toast("Link copied to clipboard"); }
      catch { toast("Copy this page’s address from the browser bar"); }
    }
  }));

  /* ---------- forms (demo only — nothing is sent) ---------- */
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  $$("form[data-subscribe]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = f.querySelector("input"), msg = f.querySelector(".subs__msg");
    if (!emailOk(input.value)) { input.classList.add("invalid"); msg.textContent = "Please enter a valid email address."; input.focus(); return; }
    input.classList.remove("invalid"); msg.textContent = "Thanks! You’re on the list."; f.querySelector("button").textContent = "Subscribed"; input.value = "";
  }));
  $$("form[data-contact]").forEach((f) => {
    f.querySelectorAll(".field").forEach((i) => i.addEventListener("input", () => i.classList.remove("invalid")));
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      let bad = null;
      f.querySelectorAll("[required]").forEach((i) => {
        const ok = i.type === "email" ? emailOk(i.value) : i.value.trim().length > 1;
        i.classList.toggle("invalid", !ok); if (!ok && !bad) bad = i;
      });
      const err = f.querySelector(".form__err");
      if (bad) { err.textContent = "Please fill in the highlighted fields."; bad.focus(); return; }
      err.textContent = "";
      const ok = f.parentElement.querySelector(".form__ok");
      f.hidden = true; ok.hidden = false; ok.querySelector("strong").textContent = f.querySelector("[name=name]").value.trim().split(" ")[0];
      ok.focus();
    });
  });
  $$("[data-form-reset]").forEach((b) => b.addEventListener("click", () => {
    const wrap = b.closest(".form-wrap"); const f = wrap.querySelector("form"); f.reset(); f.hidden = false; wrap.querySelector(".form__ok").hidden = true;
  }));
})();
