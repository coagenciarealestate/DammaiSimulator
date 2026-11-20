/* Medición de la landing Valora Energy × Rappi.
   Pegar aquí los IDs de las herramientas. Con todos vacíos la página funciona igual, pero no envía datos a ninguna parte.
   Cada evento se envía al contador propio en cPanel (registro.php, el conteo exacto), a Google Analytics 4 (gtag),
   a la capa de datos de Google Tag Manager (dataLayer), a PostHog, a Microsoft Clarity y, los de contacto, al píxel de Meta.
   Con ?debug=1 en la URL se ven en la consola. Con ?interno=1 el navegador queda marcado como interno (agencia, Valora)
   y sus visitas no cuentan en el panel ni en GA4; ?externo=1 lo desmarca. */
(() => {
  const ANALYTICS = {
    ga4: "G-6YST406QZW", // Google Analytics 4 de la landing Valora × Rappi
    gtm: "GTM-WM5CQFB7", // Google Tag Manager. GA4 ya se carga arriba: en GTM no crear otra etiqueta de GA4 con G-6YST406QZW (duplicaría las visitas)
    clarity: "",      // Microsoft Clarity: mapas de calor y grabaciones de sesión, p. ej. "abcd1234ef"
    metaPixel: "",    // Píxel de Meta, p. ej. "123456789012345"
    posthog: "",      // PostHog: Project API key, p. ej. "phc_XXXXXXXXXXXXXXXXXXXXXXXX"
    posthogHost: "https://us.i.posthog.com", // región de la cuenta de PostHog: EE. UU. "https://us.i.posthog.com" o Europa "https://eu.i.posthog.com"
    variante: "rappi_v1",   // versión de la landing, para comparar cambios en el tiempo
    refEnMensaje: true,     // agrega el código de referencia al mensaje de WhatsApp para cruzar leads con la analítica
    registro: "https://valoraenergy.com/rappi/registro.php", // contador propio en cPanel (no lo bloquean los bloqueadores de anuncios)
  };

  const qs = new URLSearchParams(location.search);
  const debug = qs.has("debug");
  const store = (kind, key, value) => {
    try {
      const s = kind === "local" ? localStorage : sessionStorage;
      if (value === undefined) return s.getItem(key);
      if (value === null) s.removeItem(key); else s.setItem(key, value);
    } catch (_) { /* almacenamiento bloqueado: se sigue sin persistir */ }
    return value === undefined ? null : value;
  };

  // Navegadores del equipo (agencia, Valora): se excluyen de los conteos
  if (qs.has("interno")) store("local", "valora_interno", "1");
  if (qs.has("externo")) store("local", "valora_interno", null);
  const interno = debug || store("local", "valora_interno") === "1";

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
    const cfg = { page_variant: ANALYTICS.variante };
    if (debug) cfg.debug_mode = true;
    if (interno) cfg.traffic_type = "internal"; // lo excluye el filtro "Internal Traffic" de GA4
    gtag("config", ANALYTICS.ga4, cfg);
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

  if (ANALYTICS.posthog) {
    // Fragmento oficial de PostHog: deja una cola mientras carga la librería
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } } (p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e }, u.people.toString = function () { return u.toString(1) + ".people (stub)" }, o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags on onFeatureFlags onSessionId identify setPersonProperties group resetGroups reset get_distinct_id get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording captureException get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing debug".split(" "), n = 0; n < o.length; n++)g(u, o[n]); e._i.push([i, s, a]) }, e.__SV = 1) }(document, window.posthog || []);
    posthog.init(ANALYTICS.posthog, { api_host: ANALYTICS.posthogHost, person_profiles: "identified_only", capture_pageview: true, capture_pageleave: true });
    // Propiedades en todos los eventos de PostHog: código, versión, UTM y si es del equipo (para el filtro de usuarios internos)
    posthog.register({ ...common, is_internal: interno });
  }

  // ---- Contador propio: cada evento va al servidor de Valora con sendBeacon, que se entrega aunque la persona cambie de app ----
  function registrar(name, data) {
    if (!ANALYTICS.registro) return;
    const body = JSON.stringify({ e: name, d: data, p: location.pathname, h: location.hostname, i: interno ? 1 : 0 });
    try {
      const ok = navigator.sendBeacon && navigator.sendBeacon(ANALYTICS.registro, new Blob([body], { type: "text/plain" }));
      if (!ok) fetch(ANALYTICS.registro, { method: "POST", body, keepalive: true, mode: "no-cors", headers: { "Content-Type": "text/plain" } });
    } catch (_) { /* sin red: se pierde solo este evento */ }
  }
  registrar("page_view", common); // GA4 cuenta su page_view solo; al contador se le envía aquí

  // ---- Envío de eventos ----
  const META = { whatsapp_click: "Contact", calc_submit: "Lead" };
  function track(name, params = {}, onSent) {
    const data = { ...common, ...params };
    registrar(name, data);
    if (ANALYTICS.gtm) window.dataLayer.push({ event: name, ...data });
    if (ANALYTICS.ga4) gtag("event", name, onSent ? { ...data, event_callback: onSent, event_timeout: 800 } : data);
    // Los de contacto salen de inmediato en PostHog (sin esperar el lote), porque después se abre WhatsApp
    if (ANALYTICS.posthog) posthog.capture(name, params, META[name] ? { send_instantly: true } : undefined);
    if (ANALYTICS.clarity) window.clarity("event", name);
    if (ANALYTICS.metaPixel && META[name]) fbq("track", META[name], params);
    if (debug) console.log("[medición]", name, data);
  }
  window.vtrack = track;

  // Envía los eventos y solo entonces sigue (p. ej. abrir WhatsApp). En celular, al cambiar de app la página se congela
  // y los eventos que no alcanzaron a salir se pierden; se espera la confirmación de GA4, como máximo 900 ms.
  window.vsend = (events, next) => {
    let done = false;
    const go = () => { if (!done) { done = true; next(); } };
    events.forEach(([name, params], i) => track(name, params, ANALYTICS.ga4 && i === events.length - 1 ? go : undefined));
    if (!ANALYTICS.ga4) go(); else setTimeout(go, 900);
  };
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

    // Video: inicio, pausa, reanudación, avance y final.
    // El navegador pausa solo el video sin sonido cuando sale de la pantalla o se cambia de pestaña; esas pausas
    // (y la reanudación que les sigue) no las hizo la persona y no se cuentan.
    const vid = { started: false, quartiles: new Set(), autoPausa: false };
    const enPantalla = v => { const r = v.getBoundingClientRect(); return document.visibilityState === "visible" && r.bottom > 0 && r.top < innerHeight; };
    document.addEventListener("play", e => {
      const v = e.target; if (!v.closest || !v.closest("#video")) return;
      if (!vid.started) { vid.started = true; track("video_start", { muted: v.muted, autoplay: v.currentTime < 1 }); }
      else if (vid.autoPausa) vid.autoPausa = false;
      else if (v.currentTime > 0.5) track("video_resume", { video_seconds: Math.round(v.currentTime), muted: v.muted });
    }, true);
    document.addEventListener("pause", e => {
      const v = e.target; if (!v.closest || !v.closest("#video") || v.ended) return;
      if (!enPantalla(v)) { vid.autoPausa = true; return; }
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
