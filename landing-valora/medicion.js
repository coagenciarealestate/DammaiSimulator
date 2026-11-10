/* Medición de la landing Valora Energy × Rappi.
   Pegar aquí los IDs de las herramientas. Con todos vacíos la página funciona igual, pero no envía datos a ninguna parte.
   Cada evento se envía a Google Analytics 4 (gtag), a la capa de datos de Google Tag Manager (dataLayer),
   a Microsoft Clarity y, los de contacto, al píxel de Meta. Con ?debug=1 en la URL se ven en la consola. */
(() => {
  const ANALYTICS = {
    ga4: "",          // Google Analytics 4, p. ej. "G-XXXXXXXXXX"
    gtm: "",          // Google Tag Manager, p. ej. "GTM-XXXXXXX" (usar GA4 directo o desde GTM, no ambos)
    clarity: "",      // Microsoft Clarity: mapas de calor y grabaciones de sesión, p. ej. "abcd1234ef"
    metaPixel: "",    // Píxel de Meta, p. ej. "123456789012345"
    variante: "rappi_v1",   // versión de la landing, para comparar cambios en el tiempo
    refEnMensaje: true,     // agrega el código de referencia al mensaje de WhatsApp para cruzar leads con la analítica
  };

  const qs = new URLSearchParams(location.search);
  const debug = qs.has("debug");
  const store = (kind, key, value) => {
    try {
      const s = kind === "local" ? localStorage : sessionStorage;
      if (value === undefined) return s.getItem(key);
      s.setItem(key, value);
    } catch (_) { /* almacenamiento bloqueado: se sigue sin persistir */ }
    return value === undefined ? null : value;
  };

  // UTM de la visita: se guardan en la sesión para no perderlas al pasar por la política de datos
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  let utm = {};
  UTM_KEYS.forEach(k => { const v = qs.get(k); if (v) utm[k] = v; });
  if (Object.keys(utm).length) store("session", "valora_utm", JSON.stringify(utm));
  else { try { utm = JSON.parse(store("session", "valora_utm") || "{}"); } catch (_) { utm = {}; } }

  // Código de referencia por visitante: llega en el mensaje de WhatsApp y en cada evento, para unir el lead con su visita
  let ref = store("local", "valora_ref");
  if (!ref) {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    ref = "R-" + Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
    store("local", "valora_ref", ref);
  }

  const common = { page_variant: ANALYTICS.variante, ref_code: ref, ...utm };
  window.dataLayer = window.dataLayer || [];

  // ---- Cargadores de las herramientas (solo si tienen ID) ----
  const load = src => { const s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); };
  if (ANALYTICS.ga4) {
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("set", "user_properties", { ref_code: ref });
    gtag("config", ANALYTICS.ga4, { page_variant: ANALYTICS.variante, debug_mode: debug || undefined });
    load("https://www.googletagmanager.com/gtag/js?id=" + ANALYTICS.ga4);
  }
  if (ANALYTICS.gtm) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js", ...common });
    load("https://www.googletagmanager.com/gtm.js?id=" + ANALYTICS.gtm);
  }
  if (ANALYTICS.clarity) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    load("https://www.clarity.ms/tag/" + ANALYTICS.clarity);
    window.clarity("set", "ref_code", ref);
    if (utm.utm_source) window.clarity("set", "utm_source", utm.utm_source);
    if (utm.utm_campaign) window.clarity("set", "utm_campaign", utm.utm_campaign);
  }
  if (ANALYTICS.metaPixel) {
    const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
    if (!window._fbq) window._fbq = f;
    f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
    load("https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", ANALYTICS.metaPixel);
    fbq("track", "PageView");
  }

  // ---- Envío de eventos ----
  const META = { whatsapp_click: "Contact", calc_submit: "Lead" };
  function track(name, params = {}) {
    const data = { ...common, ...params };
    if (ANALYTICS.gtm) window.dataLayer.push({ event: name, ...data });
    if (ANALYTICS.ga4) gtag("event", name, data);
    if (ANALYTICS.clarity) window.clarity("event", name);
    if (ANALYTICS.metaPixel && META[name]) fbq("track", META[name], params);
    if (debug) console.log("[medición]", name, data);
  }
  window.vtrack = track;
  window.VALORA_REF = ANALYTICS.refEnMensaje ? ref : "";

  // ---- Comportamiento en la página (delegado en document: escucha desde el inicio, incluso el arranque automático del video) ----
  {
    // Clics a WhatsApp con su ubicación en la página
    document.addEventListener("click", e => {
      const c = e.target.closest("[data-calc]");
      if (c) track("cta_click", { cta_location: c.dataset.loc || "otro", cta_text: c.textContent.replace(/\s+/g, " ").trim(), destination: "calculadora" });
      const a = e.target.closest("[data-wa]");
      if (a) track("whatsapp_click", { cta_location: a.dataset.loc || "otro", cta_text: a.textContent.replace(/\s+/g, " ").trim() });
      if (e.target.closest(".sound")) track("video_unmute", { video_seconds: Math.round(document.querySelector("#video video")?.currentTime || 0) });
      if (e.target.closest("#politica")) track("policy_click");
    }, true);

    // Profundidad de scroll
    const marks = [25, 50, 75, 90, 100], hit = new Set();
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const pct = h > 0 ? (scrollY / h) * 100 : 100;
      marks.forEach(m => { if (pct >= m - 0.5 && !hit.has(m)) { hit.add(m); track("scroll_depth", { percent: m }); } });
    };
    addEventListener("scroll", onScroll, { passive: true });

    // Preguntas frecuentes abiertas
    document.addEventListener("toggle", e => {
      const d = e.target;
      if (d.matches && d.matches(".faq details") && d.open) track("faq_open", { question: d.querySelector("summary").textContent.trim() });
    }, true);

    // Video: inicio, pausa, reanudación, avance y final
    const vid = { started: false, quartiles: new Set() };
    document.addEventListener("play", e => {
      const v = e.target; if (!v.closest || !v.closest("#video")) return;
      if (!vid.started) { vid.started = true; track("video_start", { muted: v.muted, autoplay: v.currentTime < 1 }); }
      else if (v.currentTime > 0.5) track("video_resume", { video_seconds: Math.round(v.currentTime), muted: v.muted });
    }, true);
    document.addEventListener("pause", e => {
      const v = e.target; if (!v.closest || !v.closest("#video") || v.ended) return;
      track("video_pause", { video_seconds: Math.round(v.currentTime), muted: v.muted });
    }, true);
    document.addEventListener("timeupdate", e => {
      const v = e.target; if (!v.closest || !v.closest("#video") || !v.duration) return;
      [25, 50, 75].forEach(q => { if (v.currentTime / v.duration * 100 >= q && !vid.quartiles.has(q)) { vid.quartiles.add(q); track("video_progress", { percent: q, muted: v.muted }); } });
    }, true);
    document.addEventListener("ended", e => {
      const v = e.target; if (v.closest && v.closest("#video")) track("video_complete", { muted: v.muted });
    }, true);
  }
  const onReady = fn => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn();
  onReady(() => {
    // Secciones vistas (cuando pasan por el centro de la pantalla; sirve también para secciones más altas que la pantalla)
    const seen = new Set();
    const io = "IntersectionObserver" in window && new IntersectionObserver(entries => entries.forEach(en => {
      const s = en.target.dataset.section;
      if (en.isIntersecting && !seen.has(s)) { seen.add(s); track("section_view", { section: s }); }
    }), { rootMargin: "-45% 0px -45% 0px" });
    if (io) document.querySelectorAll("[data-section]").forEach(el => io.observe(el));

    // Calculadora: inicio, marca, referencia y precio
    const form = document.getElementById("calcForm");
    if (form) {
      let started = false;
      const start = () => { if (!started) { started = true; track("calc_start"); } };
      form.addEventListener("focusin", start);
      form.addEventListener("change", e => {
        const id = e.target.id;
        const marca = document.getElementById("marca").value;
        if (id === "marca" && marca) track("calc_brand", { brand: marca });
        if (id === "referencia" && e.target.value) track("calc_model", { brand: marca, model: e.target.value });
        if (id === "precio") {
          const m = parseFloat(String(e.target.value).replace(",", ".")) || 0;
          if (m >= 10) {
            const b = m < 80 ? "<80M" : m < 120 ? "80-120M" : m < 180 ? "120-180M" : m < 250 ? "180-250M" : m < 400 ? "250-400M" : "400M+";
            track("calc_price", { price_millones: m, price_bucket: b });
          }
        }
      });
    }
  });
})();
