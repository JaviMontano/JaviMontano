(() => {
  "use strict";
  const root = document.documentElement;
  const toast = document.getElementById("toast");
  const motionReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastTrigger = null;
  let toastTimer = 0;
  const focusableSelector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  function announce(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  function updateProgress() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    const value = distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0;
    document.getElementById("scroll-progress")?.style.setProperty("transform", `scaleX(${value})`);
  }
  addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const revealItems = [...document.querySelectorAll(".reveal")];
  if (motionReduced || !("IntersectionObserver" in window)) revealItems.forEach((item) => item.classList.add("is-visible"));
  else {
    const revealObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }), { threshold: .12, rootMargin: "0px 0px -4%" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  if (!motionReduced) document.querySelectorAll(".spotlight").forEach((card) => card.addEventListener("pointermove", (event) => {
    const box = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - box.left}px`);
    card.style.setProperty("--my", `${event.clientY - box.top}px`);
  }));

  function openDialog(id, trigger = null, pushHash = true) {
    const dialog = document.getElementById(id);
    if (!(dialog instanceof HTMLDialogElement)) return;
    lastTrigger = trigger ?? document.activeElement;
    if (!dialog.open) dialog.showModal();
    if (pushHash && location.hash !== `#${id}`) history.pushState({ dialog: id }, "", `#${id}`);
    const close = dialog.querySelector('button[value="close"]');
    requestAnimationFrame(() => close?.focus());
  }

  function closeDialog(dialog, restoreHash = true) {
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return;
    dialog.close();
    if (restoreHash && location.hash === `#${dialog.id}`) history.replaceState(null, "", `${location.pathname}${location.search}`);
    if (lastTrigger instanceof HTMLElement && document.contains(lastTrigger)) requestAnimationFrame(() => lastTrigger.focus());
  }

  document.querySelectorAll("[data-open-dialog]").forEach((trigger) => trigger.addEventListener("click", () => openDialog(trigger.dataset.openDialog, trigger)));
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (outside) closeDialog(dialog);
    });
    dialog.addEventListener("close", () => {
      if (location.hash === `#${dialog.id}`) history.replaceState(null, "", `${location.pathname}${location.search}`);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const dialog = document.querySelector("dialog[open]");
    if (!(dialog instanceof HTMLDialogElement)) return;
    const focusable = [...dialog.querySelectorAll(focusableSelector)].filter((element) => {
      const style = getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none" && element.getClientRects().length > 0;
    });
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  addEventListener("popstate", () => {
    document.querySelectorAll("dialog[open]").forEach((dialog) => closeDialog(dialog, false));
    const id = decodeURIComponent(location.hash.slice(1));
    if (document.getElementById(id) instanceof HTMLDialogElement) openDialog(id, null, false);
  });
  const initialDialog = decodeURIComponent(location.hash.slice(1));
  if (document.getElementById(initialDialog) instanceof HTMLDialogElement) openDialog(initialDialog, null, false);

  document.querySelectorAll("[data-filter]").forEach((filter) => filter.addEventListener("click", () => {
    const selected = filter.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((button) => button.setAttribute("aria-pressed", String(button === filter)));
    let visible = 0;
    document.querySelectorAll("[data-competency-card]").forEach((card) => {
      const show = selected === "Todos" || card.dataset.category === selected;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const noResults = document.getElementById("no-results");
    if (noResults) noResults.hidden = visible !== 0;
  }));

  const trackedSections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      document.querySelectorAll("[data-spy]").forEach((link) => link.setAttribute("aria-current", String(link.dataset.spy === active.target.id)));
    }, { rootMargin: "-20% 0px -64%", threshold: [0, .2, .5] });
    trackedSections.forEach((section) => spy.observe(section));
  }


  function applyLanguage(language) {
    const lang = language === "en" ? "en" : "es";
    root.lang = lang;
    document.querySelectorAll("[data-es][data-en]").forEach((element) => { element.textContent = element.dataset[lang]; });
    document.querySelectorAll("[data-aria-es][data-aria-en]").forEach((element) => { element.setAttribute("aria-label", element.dataset[`aria${lang === "en" ? "En" : "Es"}`]); });
    document.querySelectorAll("[data-href-es][data-href-en]").forEach((element) => { element.setAttribute("href", element.dataset[`href${lang === "en" ? "En" : "Es"}`]); });
    const switcher = document.getElementById("lang-switch");
    switcher?.setAttribute("aria-pressed", String(lang === "en"));
    document.title = document.body.dataset[`title${lang === "en" ? "En" : "Es"}`] || document.title;
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute("content", meta.dataset[`description${lang === "en" ? "En" : "Es"}`] || meta.content);
    try { localStorage.setItem("portfolio-language", lang); } catch { /* file:// privacy mode */ }
  }
  document.getElementById("lang-switch")?.addEventListener("click", () => applyLanguage(root.lang === "es" ? "en" : "es"));
  let storedLanguage = "es";
  try { storedLanguage = localStorage.getItem("portfolio-language") || "es"; } catch { /* file:// privacy mode */ }
  if (storedLanguage === "en") applyLanguage("en");
})();

(() => {
  const root = document.documentElement;
  const button = document.getElementById("theme-switch");
  if (!button) return;
  let theme = "navy";
  try { theme = localStorage.getItem("cv-theme") === "light" ? "light" : "navy"; } catch {}
  const apply = (next) => {
    theme = next === "light" ? "light" : "navy";
    root.dataset.theme = theme;
    button.setAttribute("aria-pressed", String(theme === "light"));
    const lang = root.lang === "en" ? "En" : "Es";
    button.setAttribute("aria-label", button.dataset["aria" + (theme === "light" ? "Light" : "Navy") + lang]);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f2ec" : "#07356b");
    try { localStorage.setItem("cv-theme", theme); } catch {}
  };
  button.addEventListener("click", () => apply(theme === "navy" ? "light" : "navy"));
  apply(theme);
})();
(() => {
  const root = document.documentElement;
  if (root.dataset.composition !== "neo-swiss-editorial" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let queued = false;
  const update = () => {
    const y = Math.min(scrollY, innerHeight * 1.35);
    root.style.setProperty("--neo-copy-y", (y * -.08).toFixed(2) + "px");
    root.style.setProperty("--neo-visual-y", (y * .11).toFixed(2) + "px");
    root.style.setProperty("--neo-kinetic-y", (y * .18).toFixed(2) + "px");
    queued = false;
  };
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  document.querySelector(".neo-hero")?.addEventListener("pointermove", (event) => {
    const ratio = (event.clientX / Math.max(innerWidth, 1)) - .5;
    root.style.setProperty("--neo-pointer-rotate", (ratio * 3).toFixed(2) + "deg");
  }, { passive: true });
  update();
})();
