const VERSION = "V7-NOTION"; // trigger Cloudflare build
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const NOTION_VERSION = "2025-09-03";
const NOTION_DATA_SOURCE_ID = "43dd83a7-a18a-461c-9bb8-9cd9e79376df";
const MAX_HISTORY = 12;
const MAX_QUESTION = 1800;
const MAX_BODY = 90000;
const MAX_RESULTS = 3;

const CATEGORY_MAP = {
  "Party": "Party",
  "Activité": "Activity",
  "Cocktail Bar / Restaurant": "Restaurant",
  "Restaurants": "Restaurant",
  "Service": "Services"
};

const CATEGORY_TERMS = {
  Restaurant: ["restaurant","restaurants","resto","restos","manger","mange","repas","food","diner","dîner","déjeuner","dejeuner","eat","cuisine","paella","sushi","tapas","pizza","burger","noodles","menu","carte"],
  Party: ["club","clubs","boite","boîtes","boites","discothèque","discotheque","soirée","soiree","sortir","sortie","party","fête","fete","night","after","vip","bouteille","table"],
  Activity: ["activité","activités","activite","activites","buggy","quad","parasailing","bateau","boat","yacht","surf","jetski","jet ski","jet-ski","nautique","nautiques","sport","mer"],
  Services: ["service","location","voiture","car","rental"]
};

const STOP_WORDS = new Set("le la les de du des un une avec pour dans sur est sont je tu il elle on nous vous qui que quoi quel quelle quels quelles cherche chercher veux voudrais donne donne-moi voir montre moi mon ma mes ton ta tes et ou où à au aux en ce cette ces".split(/\s+/));

function clean(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function sanitize(v, max = MAX_QUESTION) {
  return clean(v).replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}
function normalize(v = "") {
  return String(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g,"oe").replace(/æ/g,"ae").replace(/[^a-z0-9€%]+/g," ").replace(/\s+/g," ").trim();
}
function tokens(v = "") {
  return normalize(v).split(/\s+/).filter(Boolean).filter(x => x.length > 2 && !STOP_WORDS.has(x));
}
function hasAny(text, terms) {
  const q = " " + normalize(text) + " ";
  return terms.some(t => q.includes(" " + normalize(t) + " "));
}
function notionText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(x => x?.plain_text || x?.text?.content || x?.name || "").join("").trim();
  if (v?.title) return notionText(v.title);
  if (v?.rich_text) return notionText(v.rich_text);
  if (v?.select) return v.select?.name || "";
  if (v?.number !== undefined && v?.number !== null) return String(v.number);
  return "";
}
function isPromotion(v) {
  const x = normalize(v);
  return Boolean(x && x !== "non" && x !== "-");
}
function notionLinks(text, category) {
  const out = [];
  const raw = String(text || "").match(/https?:\/\/[^\s)]+/g) || [];
  const low = String(text || "").toLowerCase();
  for (const rawUrl of raw) {
    const url = rawUrl.replace(/[.,;]+$/,"");
    if (out.some(x => x.url === url)) continue;
    let label = "Réserver";
    if (category === "Party" && low.includes("whatsapp") && url.includes("wa.me")) label = "Réserver VIP";
    else if (category === "Party" && (low.includes("fourvenues") || low.includes("ticket"))) label = "Ticket";
    else if (url.includes("wa.me")) label = "WhatsApp";
    out.push({label, url});
  }
  return out;
}
function notionFileUrl(value) {
  const files = Array.isArray(value) ? value : [];
  for (const f of files) {
    const url = f?.file?.url || f?.external?.url || f?.url || "";
    if (url) return url;
  }
  return "";
}
function mapNotionRow(row) {
  const p = row?.properties || {};
  const name = notionText(p["Élément à intégrer au guide"]);
  if (!name) return null;
  const category = CATEGORY_MAP[notionText(p["Catégorie"])] || notionText(p["Catégorie"]);
  const promo = notionText(p["Offre Promo"]);
  const booking = notionText(p["Comment Reserver"]);
  const menu = notionText(p["Carte / Formules"]);
  const lat = Number(p["Latitude"]?.number);
  const lon = Number(p["Longitude"]?.number);
  const photo = notionFileUrl(p["Photo"]?.files || []);
  return {
    name,
    category,
    description: notionText(p["Description généraliste"]),
    promo,
    hasPromotion: isPromotion(promo),
    price: notionText(p["Prix (moyen. sans reduc)"]),
    menu,
    bookingLinks: notionLinks(booking, category),
    bookingText: booking,
    address: notionText(p["Adresse"]),
    when: notionText(p["Quand ?"]),
    audience: notionText(p["Pour Qui ?"]),
    notes: notionText(p["Notes"]),
    tags: notionText(p["Tags"]),
    photo: photo ? `/api/photo/${encodeURIComponent(name)}` : "",
    photoSource: photo,
    coordinates: Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
  };
}
async function notionRequest(token, method, path, body) {
  const response = await fetch("https://api.notion.com/v1" + path, {
    method,
    headers: {
      "Authorization": "Bearer " + token,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) {
    const message = clean(data?.message || data?.code || raw || "unknown error").slice(0,240);
    throw new Error("Notion API " + response.status + ": " + message);
  }
  return data;
}
async function fetchNotionPartners(env) {
  const token = env?.NOTION_TOKEN;
  if (!token) throw new Error("Missing NOTION_TOKEN secret");
  const ds = env?.NOTION_DATA_SOURCE_ID || NOTION_DATA_SOURCE_ID;
  const cacheKey = new Request("https://malago.internal/notion-partners/" + ds);
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    try { return await cached.json(); } catch {}
  }
  const all = [];
  let cursor = null;
  for (let i = 0; i < 20; i++) {
    const body = {page_size: 100};
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest(token, "POST", "/data_sources/" + ds + "/query", body);
    all.push(...(data.results || []).map(mapNotionRow).filter(Boolean));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  const response = new Response(JSON.stringify(all), {headers: {"Content-Type":"application/json","Cache-Control":"public,max-age=30"}});
  await caches.default.put(cacheKey, response.clone());
  return all;
}

function categoryFromQuestion(q) {
  const n = normalize(q);
  if (hasAny(n, CATEGORY_TERMS.Restaurant)) return "Restaurant";
  if (hasAny(n, CATEGORY_TERMS.Party)) return "Party";
  if (hasAny(n, CATEGORY_TERMS.Activity)) return "Activity";
  if (hasAny(n, CATEGORY_TERMS.Services)) return "Services";
  return "";
}
function hasAnother(q) {
  return hasAny(q, ["autre","autres","encore","different","différente","deuxieme","deuxième","another","otro","otra"]);
}
function wantsPromo(q) {
  return hasAny(q, ["réduction","reduction","promo","promotion","promotions","discount","remise","offre","offres"]);
}
function wantsVIP(q) {
  return hasAny(q, ["vip","bouteille","bouteilles","table","premium"]);
}
function wantsMenu(q) {
  return hasAny(q, ["menu","carte","carta","formules","plats","tapas","paella","sushi","pizza","burger","noodles"]);
}
function wantsBooking(q) {
  return hasAny(q, ["réserver","reserver","réservation","reservation","booking","ticket","billet","acheter"]);
}
function priceLimit(q) {
  const n = normalize(q);
  const patterns = [
    /(?:moins de|sous|max(?:imum)?|budget de|jusqu.?a)\s*(\d{1,4})(?:\s*€|\s*euros)?/,
    /(?:under|less than|below)\s*(\d{1,4})/
  ];
  for (const re of patterns) {
    const m = n.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}
function numericPrices(text) {
  return [...String(text || "").matchAll(/(?:à partir de|a partir de|environ|prix|entrée|entree|vip|€|euros?)?\s*(\d{1,4})(?:[.,]\d+)?\s*€?/gi)].map(m => Number(m[1])).filter(n => Number.isFinite(n) && n > 0 && n < 5000);
}
function lowestKnownPrice(p) {
  const values = [...numericPrices(p.menu), ...numericPrices(p.price)];
  return values.length ? Math.min(...values) : null;
}
function partnerMatchesText(p, q) {
  const hay = normalize([p.name,p.category,p.description,p.address,p.tags,p.promo,p.menu,p.when,p.audience,p.notes].join(" "));
  return tokens(q).some(t => hay.includes(t));
}
function explicitPartner(q, partners) {
  const n = normalize(q);
  return partners.find(p => {
    const name = normalize(p.name);
    return name && (" " + n + " ").includes(" " + name + " ");
  });
}
function scorePartner(p, q, category) {
  const n = normalize(q);
  const words = tokens(n);
  const hay = normalize([p.name,p.category,p.description,p.address,p.tags,p.promo,p.menu,p.when,p.audience,p.notes].join(" "));
  let score = 0;
  if (category && p.category === category) score += 30;
  for (const w of words) if (hay.includes(w)) score += 2;
  if (normalize(p.name).split(" ").some(w => w.length > 2 && words.includes(w))) score += 20;
  if (wantsPromo(q) && p.hasPromotion) score += 25;
  if (wantsVIP(q) && p.category === "Party") score += 12;
  if (wantsMenu(q) && p.menu) score += 10;
  if (wantsBooking(q) && p.bookingLinks.length) score += 8;
  return score;
}
function historyText(history) {
  return history.filter(x => x?.role === "user").map(x => clean(x.content)).slice(-MAX_HISTORY).join(" ");
}
function extractActiveNames(activeResults, history, partners) {
  const names = [];
  for (const item of Array.isArray(activeResults) ? activeResults : []) if (item?.name) names.push(item.name);
  const text = historyText(history);
  for (const p of partners) if ((" " + normalize(text) + " ").includes(" " + normalize(p.name) + " ")) names.push(p.name);
  return [...new Set(names)];
}
function activeCategory(history, q) {
  const messages = [...history.filter(x => x?.role === "user").map(x => clean(x.content)), q];
  for (let i = messages.length - 1; i >= 0; i--) {
    const c = categoryFromQuestion(messages[i]);
    if (c) return c;
  }
  return "";
}
function selectPartners(partners, question, history, activeResults) {
  const category = categoryFromQuestion(question) || activeCategory(history, question);
  const another = hasAnother(question);
  const excluded = another ? new Set(extractActiveNames(activeResults, history, partners).map(normalize)) : new Set();
  const direct = explicitPartner(question, partners);
  if (direct && !excluded.has(normalize(direct.name))) return {partners:[direct],category,another};
  let candidates = partners.filter(p => !excluded.has(normalize(p.name)));
  if (category) candidates = candidates.filter(p => p.category === category);
  if (wantsPromo(question)) candidates = candidates.filter(p => p.hasPromotion);
  const limit = priceLimit(question);
  if (limit !== null) candidates = candidates.filter(p => {
    const price = lowestKnownPrice(p);
    return price !== null && price <= limit;
  });
  candidates = candidates
    .map(p => ({p,score:scorePartner(p,question,category)}))
    .sort((a,b) => b.score - a.score)
    .filter(x => x.score > 0 || Boolean(category))
    .slice(0, MAX_RESULTS)
    .map(x => x.p);
  if (!candidates.length && category) candidates = partners.filter(p => p.category === category && !excluded.has(normalize(p.name))).slice(0, MAX_RESULTS);
  return {partners:candidates,category,another};
}
function resultPayload(p) {
  return {
    name:p.name,
    category:p.category,
    description:p.description,
    promo:p.hasPromotion ? p.promo : "",
    hasPromotion:p.hasPromotion,
    price:p.price,
    menu:p.menu,
    address:p.address,
    when:p.when,
    audience:p.audience,
    notes:p.notes,
    bookingLinks:p.bookingLinks,
    menuLinks:[],
    coordinates:p.coordinates,
    photo:p.photo || ""
  };
}
function languageOf(q) {
  const n = normalize(q);
  if (/\b(the|i|looking|want|where|how|another|with|for)\b/.test(n)) return "en";
  if (/\b(el|la|los|las|busco|quiero|otro|otra|con|para|precio)\b/.test(n)) return "es";
  return "fr";
}
function fallbackAnswer(selected, q, category, another) {
  const lang = languageOf(q);
  if (!selected.length) {
    if (lang === "en") return "I couldn't find a confirmed Malago partner matching all your criteria. I prefer not to invent an option.";
    if (lang === "es") return "No he encontrado un socio confirmado en Malago que cumpla todos tus criterios. Prefiero no inventar una opción.";
    return "Je n’ai pas trouvé de partenaire Malago confirmé qui corresponde à tous tes critères. Je préfère ne pas t’inventer une adresse.";
  }
  const p = selected[0];
  const bits = [p.name];
  if (p.description) bits.push(p.description);
  if (p.hasPromotion) bits.push("Offre : " + p.promo);
  if (p.price) bits.push("Prix indicatif enregistré : " + p.price);
  if (p.menu) bits.push("Formules / carte : " + p.menu);
  if (p.bookingLinks.length) bits.push("Réservation disponible via les boutons sous la réponse.");
  if (another) bits.push("Je garde tes critères et j’exclus les établissements déjà proposés.");
  return bits.join(" ");
}
function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter(x => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .slice(-MAX_HISTORY)
    .map(x => ({role:x.role,content:sanitize(x.content,1800)}));
}
function stripLeakage(text) {
  return clean(text).replace(/(?:CONTEXTE|DONNÉES|DATA|JSON)\s*:/gi,"").trim();
}
async function answerWithAI(question, history, selected, allPartners, env) {
  if (!env?.AI || !selected.length) return "";
  const context = selected.map(p => ({
    name:p.name, category:p.category, description:p.description, promo:p.hasPromotion ? p.promo : "",
    price:p.price, menu:p.menu, address:p.address, when:p.when, audience:p.audience, notes:p.notes, photo:p.photo || "", bookingLinks:p.bookingLinks
  }));
  const system = `Tu es MALAGO, guide local de Málaga.
Réponds dans la langue de l'utilisateur, brièvement et naturellement.
RÈGLES ABSOLUES :
- Utilise uniquement le contexte fourni.
- N'invente jamais d'établissement, prix, adresse, horaire, offre, menu, disponibilité ou réservation.
- N'affiche pas les champs techniques.
- Si un prix est marqué indicatif/moyen, présente-le comme indicatif/moyen.
- Les prix précis présents dans "menu" peuvent être cités comme tels.
- Une réservation n'est jamais considérée comme confirmée.
- Si la demande dit "un autre", conserve les critères déjà exprimés et ne propose pas un établissement déjà proposé.
CONTEXTE PARTENAIRES :
${JSON.stringify(context,null,2)}
QUESTION :
${question}`;
  try {
    const messages = [{role:"system",content:system},...history.map(x => ({role:x.role,content:x.content})),{role:"user",content:question}];
    const result = await env.AI.run(MODEL,{messages,max_tokens:420,temperature:0.1});
    return stripLeakage(result?.response || result?.result?.response || result?.output_text || "");
  } catch (e) {
    console.error("Malago AI error",e);
    return "";
  }
}
function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"strict-origin-when-cross-origin",
      "Permissions-Policy":"camera=(), microphone=(), geolocation=()"
    };
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers});

    if (request.method === "GET" && url.pathname === "/api/config") {
      return json({version:VERSION,googleMapsConfigured:Boolean(env?.GOOGLE_MAPS_API_KEY),googleMapsKey:env?.GOOGLE_MAPS_API_KEY || null},200,headers);
    }
    if (request.method === "GET" && url.pathname === "/health") {
      let notionCount = null;
      let notionError = null;
      try { notionCount = (await fetchNotionPartners(env)).length; }
      catch (e) { notionError = String(e?.message || e).slice(0,300); }
      return json({ok:true,version:VERSION,aiConfigured:Boolean(env?.AI),notionConfigured:Boolean(env?.NOTION_TOKEN),model:MODEL,notionRecords:notionCount,notionError},200,headers);
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/photo/")) {
      const name = decodeURIComponent(url.pathname.slice("/api/photo/".length));
      if (!name) return new Response("Photo introuvable",{status:404,headers});
      const cacheKey = new Request(url.origin + "/api/photo/" + encodeURIComponent(name));
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;
      try {
        const partners = await fetchNotionPartners(env);
        const partner = partners.find(p => p.name === name);
        if (!partner?.photoSource) return new Response("Photo introuvable",{status:404,headers});
        const upstream = await fetch(partner.photoSource, {cf:{cacheEverything:true,cacheTtl:86400,image:{width:600,height:440,fit:"cover",format:"webp",quality:76}}});
        if (!upstream.ok) return new Response("Photo indisponible",{status:502,headers});
        const responseHeaders = new Headers(headers);
        responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "image/jpeg");
        responseHeaders.set("Cache-Control", "public, max-age=86400, immutable");
        responseHeaders.set("X-Malago-Photo-Cache", "edge");
        const response = new Response(upstream.body,{status:200,headers:responseHeaders});
        await caches.default.put(cacheKey,response.clone());
        return response;
      } catch (error) {
        console.error("Malago photo error",name,error);
        return new Response("Photo indisponible",{status:502,headers});
      }
    }
    if (request.method === "GET" && url.pathname === "/api/partners") {
      try {
        const partners = await fetchNotionPartners(env);
        return json({version:VERSION,source:"notion",partners:partners.map(({photoSource,...p}) => p)},200,headers);
      } catch (error) {
        const requestId = crypto.randomUUID();
        console.error("Malago Notion partners error",requestId,error);
        return json({error:"Impossible de charger les partenaires depuis Notion.",requestId},502,headers);
      }
    }
    if (request.method === "GET") {
      if (env?.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Malago assets unavailable",{status:503,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
    }
    if (request.method === "POST" && url.pathname === "/api/chat") {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength && contentLength > MAX_BODY) return json({error:"Requête trop volumineuse."},413,headers);
      try {
        const body = await request.json();
        const question = sanitize(body?.question);
        if (!question) return json({error:"Question vide."},400,headers);
        const history = cleanHistory(body?.history);
        const activeResults = Array.isArray(body?.activeResults) ? body.activeResults.slice(0,6) : [];
        const partners = await fetchNotionPartners(env);
        const selection = selectPartners(partners,question,history,activeResults);
        const answer = await answerWithAI(question,history,selection.partners,partners,env) || fallbackAnswer(selection.partners,question,selection.category,selection.another);
        return json({
          answer,
          results:selection.partners.map(resultPayload),
          activeResults:selection.partners.map(p => ({name:p.name,category:p.category,promo:p.hasPromotion?p.promo:"",bookingLinks:p.bookingLinks,menuLinks:[]})),
          meta:{source:"notion",count:partners.length,category:selection.category,another:selection.another}
        },200,headers);
      } catch (error) {
        const requestId = crypto.randomUUID();
        console.error("Malago API error",requestId,error);
        return json({error:"Malago rencontre un problème technique.",requestId},500,headers);
      }
    }
    return new Response("Malago",{status:404,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
  }
};