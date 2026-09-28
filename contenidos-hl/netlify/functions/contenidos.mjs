// Servicio de guardado del conteo de contenidos HL (Netlify Functions + Netlify Blobs).
// GET  /api/contenidos            -> { items }
// POST /api/contenidos {key, action: "check" | "add" | "delete", item?, id?}
// Para escribir se necesita la clave del equipo, definida en Netlify como variable de entorno EDIT_KEY.
import { getStore } from "@netlify/blobs";

const MONTHLY_TOTAL = 18;
const CONTRACT_START = "2026-07-01";
const TYPES = ["Reel", "Carrusel", "Post", "Historia", "Video pauta"];
const BLOB_KEY = "items";

// Contenidos ya registrados antes de activar el guardado compartido.
const SEED = [
  {
    "id": "sep26-01",
    "title": "reel penthouse bella suiza",
    "type": "Reel",
    "date": "2026-09-04",
    "createdAt": "2026-09-04T12:00:01Z"
  },
  {
    "id": "sep26-02",
    "title": "reel amazonia recorrido",
    "type": "Reel",
    "date": "2026-09-09",
    "createdAt": "2026-09-09T12:00:02Z"
  },
  {
    "id": "sep26-03",
    "title": "Pieza Venta Amazonia",
    "type": "Historia",
    "date": "2026-09-09",
    "createdAt": "2026-09-09T12:00:03Z"
  },
  {
    "id": "sep26-04",
    "title": "reel amazonía interior vs exterior",
    "type": "Reel",
    "date": "2026-09-10",
    "createdAt": "2026-09-10T12:00:04Z"
  },
  {
    "id": "sep26-05",
    "title": "reel penthouse bella suiza fachado vs interior",
    "type": "Reel",
    "date": "2026-09-11",
    "createdAt": "2026-09-11T12:00:05Z"
  },
  {
    "id": "sep26-06",
    "title": "carrusel apto Amazonia",
    "type": "Carrusel",
    "date": "2026-09-12",
    "createdAt": "2026-09-12T12:00:06Z"
  },
  {
    "id": "sep26-07",
    "title": "reel pov estrenas apartamento amazonia",
    "type": "Reel",
    "date": "2026-09-14",
    "createdAt": "2026-09-14T12:00:07Z"
  },
  {
    "id": "sep26-08",
    "title": "Reel ads arriendo",
    "type": "Reel",
    "date": "2026-09-16",
    "createdAt": "2026-09-16T12:00:08Z"
  },
  {
    "id": "sep26-09",
    "title": "reel ad arriendo superpoder",
    "type": "Reel",
    "date": "2026-09-17",
    "createdAt": "2026-09-17T12:00:09Z"
  },
  {
    "id": "sep26-10",
    "title": "Video expectativa Casa Cajicá",
    "type": "Historia",
    "date": "2026-09-21",
    "createdAt": "2026-09-21T12:00:10Z"
  },
  {
    "id": "sep26-11",
    "title": "Pieza Casa Cajicá",
    "type": "Historia",
    "date": "2026-09-22",
    "createdAt": "2026-09-22T12:00:11Z"
  },
  {
    "id": "sep26-12",
    "title": "Carrusel apto La Carolina",
    "type": "Carrusel",
    "date": "2026-09-23",
    "createdAt": "2026-09-23T12:00:12Z"
  },
  {
    "id": "sep26-13",
    "title": "Pieza Apto La Carolina",
    "type": "Historia",
    "date": "2026-09-23",
    "createdAt": "2026-09-23T12:00:13Z"
  },
  {
    "id": "sep26-14",
    "title": "Pieza Captación Arriendos",
    "type": "Historia",
    "date": "2026-09-24",
    "createdAt": "2026-09-24T12:00:14Z"
  },
  {
    "id": "sep26-15",
    "title": "reel casa Cajicá",
    "type": "Reel",
    "date": "2026-09-25",
    "createdAt": "2026-09-25T12:00:15Z"
  },
  {
    "id": "sep26-16",
    "title": "reel casa Cajicá exterior vs interior",
    "type": "Reel",
    "date": "2026-09-28",
    "createdAt": "2026-09-28T12:00:16Z"
  },
  {
    "id": "sep26-17",
    "title": "reel casa Cajicá tranquilidad",
    "type": "Reel",
    "date": "2026-09-29",
    "createdAt": "2026-09-29T12:00:17Z"
  },
  {
    "id": "sep26-18",
    "title": "Carrusel Casa Cajicá",
    "type": "Carrusel",
    "date": "2026-09-30",
    "createdAt": "2026-09-30T12:00:18Z"
  }
];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const editKey = () => (globalThis.Netlify?.env?.get("EDIT_KEY") ?? process.env.EDIT_KEY ?? "").trim();

function validItem(it) {
  return it && typeof it === "object"
    && typeof it.id === "string" && /^[a-z0-9-]{4,40}$/i.test(it.id)
    && typeof it.title === "string" && it.title.trim().length > 0 && it.title.length <= 90
    && TYPES.includes(it.type)
    && typeof it.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it.date) && it.date >= CONTRACT_START;
}

export default async (req) => {
  const store = getStore({ name: "contenidos-hl", consistency: "strong" });

  if (req.method === "GET") {
    const items = await store.get(BLOB_KEY, { type: "json" });
    return json({ items: items ?? SEED });
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }

  const key = editKey();
  if (!key) return json({ error: "Falta configurar la clave del equipo (EDIT_KEY) en Netlify." }, 500);
  if (typeof body.key !== "string" || body.key.trim() !== key) return json({ error: "Clave incorrecta" }, 401);
  if (body.action === "check") return json({ ok: true });

  // leer, modificar y guardar; si otra persona guardó al mismo tiempo, se reintenta sobre lo más reciente
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(BLOB_KEY, { type: "json" });
    const items = Array.isArray(current?.data) ? [...current.data] : [...SEED];
    let next;

    if (body.action === "add") {
      const it = body.item;
      if (!validItem(it)) return json({ error: "Revisa el nombre, el formato y la fecha del contenido." }, 400);
      const clean = { id: it.id, title: it.title.trim(), type: it.type, date: it.date, createdAt: new Date().toISOString() };
      if (items.some((x) => x.id === clean.id)) return json({ items });
      if (items.filter((x) => x.date.slice(0, 7) === clean.date.slice(0, 7)).length >= MONTHLY_TOTAL)
        return json({ error: `Ese mes ya tiene sus ${MONTHLY_TOTAL} contenidos completos.` }, 409);
      next = [...items, clean];
    } else if (body.action === "delete") {
      next = items.filter((x) => x.id !== body.id);
    } else {
      return json({ error: "Acción desconocida" }, 400);
    }

    const opts = current ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
    const res = await store.setJSON(BLOB_KEY, next, opts);
    if (!res || res.modified !== false) return json({ items: next });
  }
  return json({ error: "Muchas personas guardando al mismo tiempo. Inténtalo de nuevo." }, 409);
};

export const config = { path: "/api/contenidos" };
