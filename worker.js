const VERSION = "V7-NOTION"; // trigger Cloudflare build — refresh test deployment for chef private UI
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const NOTION_VERSION = "2025-09-03";
const NOTION_DATA_SOURCE_ID = "43dd83a7-a18a-461c-9bb8-9cd9e79376df";
const MAX_HISTORY = 12;
const MAX_QUESTION = 1800;
const MAX_BODY = 90000;
const MAX_RESULTS = 3;

// Menu galleries for the first partner rollout. The files live under /public/img/menus.
const MENU_GALLERIES = {
  "Silencio Beach Club": ["/img/menus/silencio-1.webp", "/img/menus/silencio-2.webp"],
  "Sala Gold": ["/img/menus/sala-gold-1.webp", "/img/menus/sala-gold-2.webp"],
  "Santa Rita": ["/img/menus/santa-rita-1.webp", "/img/menus/santa-rita-2.webp"],
  "Bro": ["/img/menus/bro-1.webp", "/img/menus/bro-2.webp"],
  "Jet Ski, Boat & Water Activities": [
    "/img/menus/jet-ski-boat-1.webp",
    "/img/menus/jet-ski-boat-2.webp",
    "/img/menus/jet-ski-boat-3.webp",
    "/img/menus/jet-ski-boat-4.webp"
  ],
  "Quad / Buggy": ["/img/menus/quad-buggy-1.webp"]
};

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
    menuPhotos: MENU_GALLERIES[name] || [],
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
    menuPhotos:MENU_GALLERIES[p.name] || [],
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
async function sendMalagoEmail(env,{to,subject,text}) {
  const apiKey=clean(env?.RESEND_API_KEY);
  const from=clean(env?.MALAGO_EMAIL_FROM);
  if(!apiKey||!from||!to)return {sent:false,reason:"email_not_configured"};
  try {
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({from,to:[to],subject,text})
    });
    if(!response.ok) {
      const detail=(await response.text()).slice(0,300);
      console.error("Malago email provider error",response.status,detail);
      return {sent:false,reason:"provider_error"};
    }
    return {sent:true};
  } catch(error) {
    console.error("Malago email delivery error",error);
    return {sent:false,reason:"delivery_error"};
  }
}
async function notifyNewClientRequest(env,{requestId,category,description,stayId}) {
  const to=clean(env?.MALAGO_REQUESTS_EMAIL)||"Malagoagency@gmail.com";
  return sendMalagoEmail(env,{
    to,
    subject:"Nouvelle demande client Malago",
    text:[
      "Une nouvelle demande vient d’être enregistrée dans Malago.",
      "",
      "Référence : "+requestId,
      "Catégorie : "+category,
      "Séjour : "+stayId,
      "",
      "Demande :",
      description,
      "",
      "Ouvrez l’espace équipe Malago pour la traiter. Cette demande n’est pas une réservation confirmée."
    ].join("\n")
  });
}

function json(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}

const REQUEST_STATUSES = new Set(["received","in_review","awaiting_customer","quoted","accepted_by_customer","confirmed","declined","cancelled"]);
// Explicit state machine: a customer acceptance is not a provider confirmation.
// Terminal states cannot be silently reopened; create a new request if needed.
const REQUEST_STATUS_TRANSITIONS = {
  received: new Set(["in_review","awaiting_customer","quoted","declined","cancelled"]),
  in_review: new Set(["awaiting_customer","quoted","declined","cancelled"]),
  awaiting_customer: new Set(["in_review","quoted","declined","cancelled"]),
  quoted: new Set(["in_review","awaiting_customer","accepted_by_customer","declined","cancelled"]),
  accepted_by_customer: new Set(["in_review","confirmed","declined","cancelled"]),
  confirmed: new Set(["cancelled"]),
  declined: new Set(),
  cancelled: new Set()
};
const REQUEST_CATEGORIES = new Set(["car_rental","airport_transfer","chauffeur","restaurant","activity","chef","groceries","beach_club","wellness","family","decoration","bartender","dj","event","villa_services","other"]);
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function bearer(request) {
  const value = request.headers.get("Authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
async function readJson(request, maxBytes = 16000) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) return {error:"Requête trop volumineuse.",status:413};
  try { return {body:JSON.parse(raw)}; } catch { return {error:"JSON invalide.",status:400}; }
}
async function resolveStayToken(request, env) {
  if (!env?.DB) return {error:"Base de données non configurée.",status:503};
  const token = bearer(request);
  if (token.length < 32 || token.length > 512) return {error:"Accès invalide ou expiré.",status:401};
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT t.id AS token_id, t.stay_id, t.expires_at, t.revoked_at FROM stay_access_tokens t JOIN stays s ON s.id=t.stay_id WHERE t.token_hash=? AND s.status='active' LIMIT 1"
  ).bind(tokenHash).first();
  if (!row || row.revoked_at || !row.expires_at || Date.parse(row.expires_at) <= Date.now()) return {error:"Accès invalide ou expiré.",status:401};
  return {stayId:row.stay_id,tokenId:row.token_id};
}
function adminAuthorized(request, env) {
  const expected = clean(env?.MALAGO_ADMIN_TOKEN);
  const supplied = bearer(request);
  return Boolean(expected && supplied && supplied === expected);
}
async function adminJson(request, env) {
  if (!env?.DB) return json({error:"Base de données non configurée."},503);
  if (!clean(env?.MALAGO_ADMIN_TOKEN)) return json({error:"Secret MALAGO_ADMIN_TOKEN non configuré."},503);
  if (!adminAuthorized(request,env)) return json({error:"Authentification administrateur requise."},401);
  return null;
}

function isIsoCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(String(value) + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
function isCalendarTime(value) {
  return !value || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}
function parseStructuredDetails(value) {
  if (!value) return null;
  try { const data=JSON.parse(value); return data && typeof data==="object" && !Array.isArray(data) ? data : null; } catch (_) { return null; }
}
async function ensureStayEventsTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS stay_events (id TEXT PRIMARY KEY, stay_id TEXT NOT NULL, title TEXT NOT NULL, event_date TEXT NOT NULL, start_time TEXT, end_time TEXT, location TEXT, notes TEXT, event_type TEXT NOT NULL DEFAULT 'personal' CHECK(event_type IN ('personal','idea','service')), status TEXT NOT NULL DEFAULT 'personal' CHECK(status IN ('personal','idea','requested','pending','confirmed','cancelled')), linked_request_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
  // CREATE TABLE IF NOT EXISTS does not migrate databases created by earlier versions.
  // Add the link column explicitly so existing calendars can attach confirmed services to requests.
  const columns = await db.prepare("PRAGMA table_info(stay_events)").all();
  if (!(columns.results || []).some(column => column.name === "linked_request_id")) {
    await db.prepare("ALTER TABLE stay_events ADD COLUMN linked_request_id TEXT").run();
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stay_events_linked_request ON stay_events(linked_request_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stay_events_stay_date ON stay_events(stay_id,event_date,start_time)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stay_events_date ON stay_events(event_date,start_time)").run();
}

async function ensureStayNotificationTables(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS stay_preferences (stay_id TEXT PRIMARY KEY, reminders_enabled INTEGER NOT NULL DEFAULT 1, remind_day_before INTEGER NOT NULL DEFAULT 1, remind_hours_before INTEGER NOT NULL DEFAULT 1, reminder_portal INTEGER NOT NULL DEFAULT 1, reminder_email INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS stay_notifications (id TEXT PRIMARY KEY, stay_id TEXT NOT NULL, event_id TEXT NOT NULL, reminder_type TEXT NOT NULL CHECK(reminder_type IN ('day_before','hours_before')), message TEXT NOT NULL, email_sent INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), read_at TEXT, UNIQUE(event_id,reminder_type))").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_stay_notifications_stay ON stay_notifications(stay_id,created_at)").run();
}
function localDateTimeParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
  return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
}
function localDateTimeToUtc(dateValue,timeValue) {
  const [year,month,day]=String(dateValue).split("-").map(Number),[hour,minute]=String(timeValue||"09:00").split(":").map(Number);
  const target=Date.UTC(year,month-1,day,hour,minute);let guess=target;
  for(let i=0;i<4;i++){
    const parts=localDateTimeParts(new Date(guess),"Europe/Madrid");
    const actual=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));
    const diff=target-actual;if(!diff)break;guess+=diff;
  }
  return guess;
}
function boolPref(value, fallback=true) {
  if(value===undefined||value===null)return fallback?1:0;
  return value===true||value===1||value==="1"?1:0;
}
async function processStayReminders(env) {
  if(!env?.DB)return {processed:0,reason:"db_unavailable"};
  await ensureStayEventsTable(env.DB);await ensureStayNotificationTables(env.DB);
  const now=new Date(),local=localDateTimeParts(now,"Europe/Madrid"),today=local.year+"-"+local.month+"-"+local.day;
  const tomorrowDate=new Date(Number(local.year),Number(local.month)-1,Number(local.day)+1,12);
  const tomorrow=tomorrowDate.getFullYear()+"-"+String(tomorrowDate.getMonth()+1).padStart(2,"0")+"-"+String(tomorrowDate.getDate()).padStart(2,"0");
  const result=await env.DB.prepare("SELECT e.id,e.stay_id,e.title,e.event_date,e.start_time,e.location,e.status,e.event_type,s.guest_name,s.guest_email,s.property_name FROM stay_events e JOIN stays s ON s.id=e.stay_id WHERE e.status='confirmed' AND e.event_date>=? AND e.event_date<=? ORDER BY e.event_date,e.start_time LIMIT 500").bind(today,tomorrow).all();
  let processed=0;
  for(const event of result.results||[]){
    let prefs=await env.DB.prepare("SELECT reminders_enabled,remind_day_before,remind_hours_before,reminder_portal,reminder_email FROM stay_preferences WHERE stay_id=? LIMIT 1").bind(event.stay_id).first();
    if(!prefs)prefs={reminders_enabled:1,remind_day_before:1,remind_hours_before:1,reminder_portal:1,reminder_email:1};
    if(!prefs.reminders_enabled)continue;
    let untilStart=null;
    if(event.start_time)untilStart=localDateTimeToUtc(event.event_date,event.start_time)-now.getTime();
    const due=[];
    if(prefs.remind_day_before&&event.event_date===tomorrow&&Number(local.hour)>=8&&Number(local.hour)<=10)due.push("day_before");
    if(prefs.remind_hours_before&&untilStart!==null&&untilStart>=2*60*60*1000&&untilStart<4*60*60*1000)due.push("hours_before");
    for(const type of due){
      const message=type==="day_before"?"Rappel pour demain : "+event.title+(event.start_time?" à "+event.start_time:"")+".":"Votre événement approche : "+event.title+(event.start_time?" à "+event.start_time:"")+".";
      await env.DB.prepare("INSERT OR IGNORE INTO stay_notifications (id,stay_id,event_id,reminder_type,message) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),event.stay_id,event.id,type,message).run();
      processed++;
    }
    const notifications=await env.DB.prepare("SELECT id,reminder_type,message,email_sent FROM stay_notifications WHERE event_id=?").bind(event.id).all();
    for(const item of notifications.results||[]){
      if(!prefs.reminder_email||!event.guest_email||item.email_sent)continue;
      const validWindow=item.reminder_type==="day_before"
        ? event.event_date===tomorrow&&Number(local.hour)>=9&&Number(local.hour)<=18
        : untilStart!==null&&untilStart>0&&untilStart<=4*60*60*1000;
      if(!validWindow)continue;
      const mail=await sendMalagoEmail(env,{to:event.guest_email,subject:item.reminder_type==="day_before"?"Villa Magos · Rappel pour demain":"Villa Magos · Votre événement approche",text:["Bonjour"+(event.guest_name?" "+event.guest_name:"")+",","",item.message,"","Séjour : "+(event.property_name||"Villa Magos"),"Date : "+event.event_date+(event.start_time?" · "+event.start_time:""),event.location?"Lieu : "+event.location:"","","Retrouvez votre programme dans votre espace privé Villa Magos.","","Malago · Votre concierge privé"].filter(Boolean).join("\n")});
      if(mail.sent)await env.DB.prepare("UPDATE stay_notifications SET email_sent=1 WHERE id=?").bind(item.id).run();
    }
  }
  return {processed};
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
      return json({ok:notionError===null,version:VERSION,aiConfigured:Boolean(env?.AI),notionConfigured:Boolean(env?.NOTION_TOKEN),model:MODEL,notionRecords:notionCount,notionError},200,headers);
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/photo/")) {
      let name = "";
      try { name = decodeURIComponent(url.pathname.slice("/api/photo/".length)); }
      catch { return new Response("Photo introuvable",{status:400,headers}); }
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
    if (url.pathname.startsWith("/api/client/")) {
      if (!["GET","POST","PATCH","DELETE"].includes(request.method)) return json({error:"Méthode non autorisée."},405,headers);
      const auth = await resolveStayToken(request,env);
      if (auth.error) return json({error:auth.error},auth.status,headers);
      try {
        if(request.method==="GET"&&url.pathname==="/api/client/preferences"){
          await ensureStayNotificationTables(env.DB);
          await env.DB.prepare("INSERT OR IGNORE INTO stay_preferences (stay_id) VALUES (?)").bind(auth.stayId).run();
          const prefs=await env.DB.prepare("SELECT reminders_enabled,remind_day_before,remind_hours_before,reminder_portal,reminder_email FROM stay_preferences WHERE stay_id=? LIMIT 1").bind(auth.stayId).first();
          const stay=await env.DB.prepare("SELECT guest_email FROM stays WHERE id=? AND status='active' LIMIT 1").bind(auth.stayId).first();
          return json({preferences:{reminders_enabled:Boolean(prefs?.reminders_enabled),remind_day_before:Boolean(prefs?.remind_day_before),remind_hours_before:Boolean(prefs?.remind_hours_before),reminder_portal:Boolean(prefs?.reminder_portal),reminder_email:Boolean(prefs?.reminder_email)},email_configured:Boolean(stay?.guest_email)},200,headers);
        }
        if(request.method==="PATCH"&&url.pathname==="/api/client/preferences"){
          await ensureStayNotificationTables(env.DB);
          const parsed=await readJson(request);if(parsed.error)return json({error:parsed.error},parsed.status,headers);
          const body=parsed.body||{},enabled=boolPref(body.reminders_enabled),dayBefore=boolPref(body.remind_day_before),hoursBefore=boolPref(body.remind_hours_before),portal=boolPref(body.reminder_portal),email=boolPref(body.reminder_email);
          await env.DB.prepare("INSERT INTO stay_preferences (stay_id,reminders_enabled,remind_day_before,remind_hours_before,reminder_portal,reminder_email,updated_at) VALUES (?,?,?,?,?,?,datetime('now')) ON CONFLICT(stay_id) DO UPDATE SET reminders_enabled=excluded.reminders_enabled,remind_day_before=excluded.remind_day_before,remind_hours_before=excluded.remind_hours_before,reminder_portal=excluded.reminder_portal,reminder_email=excluded.reminder_email,updated_at=datetime('now')").bind(auth.stayId,enabled,dayBefore,hoursBefore,portal,email).run();
          return json({ok:true,preferences:{reminders_enabled:Boolean(enabled),remind_day_before:Boolean(dayBefore),remind_hours_before:Boolean(hoursBefore),reminder_portal:Boolean(portal),reminder_email:Boolean(email)}},200,headers);
        }
        if(request.method==="GET"&&url.pathname==="/api/client/notifications"){
          await ensureStayNotificationTables(env.DB);
          const prefs=await env.DB.prepare("SELECT reminders_enabled,reminder_portal FROM stay_preferences WHERE stay_id=? LIMIT 1").bind(auth.stayId).first();
          if(prefs&&(!prefs.reminders_enabled||!prefs.reminder_portal))return json({notifications:[]},200,headers);
          const result=await env.DB.prepare("SELECT id,event_id,reminder_type,message,created_at,read_at FROM stay_notifications WHERE stay_id=? AND read_at IS NULL ORDER BY created_at DESC LIMIT 30").bind(auth.stayId).all();
          return json({notifications:result.results||[]},200,headers);
        }
        const notificationReadMatch=url.pathname.match(/^\/api\/client\/notifications\/([0-9a-f-]{36})\/read$/i);
        if(request.method==="POST"&&notificationReadMatch){
          await ensureStayNotificationTables(env.DB);
          const result=await env.DB.prepare("UPDATE stay_notifications SET read_at=datetime('now') WHERE id=? AND stay_id=?").bind(notificationReadMatch[1],auth.stayId).run();
          if(!result.meta?.changes)return json({error:"Rappel introuvable."},404,headers);
          return json({ok:true},200,headers);
        }
                const eventMatch = url.pathname.match(/^\/api\/client\/events(?:\/([0-9a-f-]{36}))?$/i);
        if (eventMatch) {
          await ensureStayEventsTable(env.DB);
          const eventId = eventMatch[1] || "";
          if (request.method === "GET" && !eventId) {
            const result = await env.DB.prepare("SELECT id,title,event_date,start_time,end_time,location,notes,event_type,status,created_at,updated_at FROM stay_events WHERE stay_id=? ORDER BY event_date ASC, COALESCE(start_time,'99:99') ASC, created_at ASC").bind(auth.stayId).all();
            return json({events:result.results || []},200,headers);
          }
          if (request.method === "POST" && !eventId) {
            const parsed=await readJson(request);if(parsed.error)return json({error:parsed.error},parsed.status,headers);
            const body=parsed.body||{},title=sanitize(body.title,120),eventDate=sanitize(body.event_date,10),startTime=sanitize(body.start_time,5),endTime=sanitize(body.end_time,5),location=sanitize(body.location,180),notes=sanitize(body.notes,2000);
            const eventType=body.event_type==="idea"?"idea":body.event_type==="personal"?"personal":"";
            if(!title)return json({error:"Donne un titre à cet événement."},400,headers);
            if(!isIsoCalendarDate(eventDate))return json({error:"Choisis une date valide."},400,headers);
            if(!isCalendarTime(startTime)||!isCalendarTime(endTime))return json({error:"L’horaire indiqué est invalide."},400,headers);
            if(startTime&&endTime&&endTime<=startTime)return json({error:"L’heure de fin doit être postérieure à l’heure de début."},400,headers);
            if(!eventType)return json({error:"Choisis un type d’événement valide."},400,headers);
            const stay=await env.DB.prepare("SELECT start_date,end_date FROM stays WHERE id=? AND status='active' LIMIT 1").bind(auth.stayId).first();
            if((stay?.start_date&&eventDate<stay.start_date)||(stay?.end_date&&eventDate>stay.end_date))return json({error:"La date doit être comprise dans les dates de votre séjour."},400,headers);
            const id=crypto.randomUUID(),status=eventType==="idea"?"idea":"personal";
            await env.DB.prepare("INSERT INTO stay_events (id,stay_id,title,event_date,start_time,end_time,location,notes,event_type,status) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,auth.stayId,title,eventDate,startTime||null,endTime||null,location||null,notes||null,eventType,status).run();
            return json({ok:true,event:{id,title,event_date:eventDate,start_time:startTime||null,end_time:endTime||null,location:location||null,notes:notes||null,event_type:eventType,status}},201,headers);
          }
          if(request.method==="PATCH"&&eventId){
            const current=await env.DB.prepare("SELECT id,title,event_date,start_time,end_time,location,notes,event_type,status FROM stay_events WHERE id=? AND stay_id=? LIMIT 1").bind(eventId,auth.stayId).first();
            if(!current)return json({error:"Événement introuvable."},404,headers);
            if(current.status==="confirmed"||current.event_type==="service")return json({error:"Une prestation confirmée doit être modifiée avec l’aide de Malago."},409,headers);
            const parsed=await readJson(request);if(parsed.error)return json({error:parsed.error},parsed.status,headers);
            const body=parsed.body||{},title=sanitize(body.title===undefined?current.title:body.title,120),eventDate=sanitize(body.event_date===undefined?current.event_date:body.event_date,10),startTime=sanitize(body.start_time===undefined?current.start_time:body.start_time,5),endTime=sanitize(body.end_time===undefined?current.end_time:body.end_time,5),location=sanitize(body.location===undefined?current.location:body.location,180),notes=sanitize(body.notes===undefined?current.notes:body.notes,2000),rawType=body.event_type===undefined?current.event_type:body.event_type,eventType=rawType==="idea"?"idea":rawType==="personal"?"personal":"";
            if(!title)return json({error:"Donne un titre à cet événement."},400,headers);
            if(!isIsoCalendarDate(eventDate))return json({error:"Choisis une date valide."},400,headers);
            if(!isCalendarTime(startTime)||!isCalendarTime(endTime))return json({error:"L’horaire indiqué est invalide."},400,headers);
            if(startTime&&endTime&&endTime<=startTime)return json({error:"L’heure de fin doit être postérieure à l’heure de début."},400,headers);
            if(!eventType)return json({error:"Type d’événement invalide."},400,headers);
            const stay=await env.DB.prepare("SELECT start_date,end_date FROM stays WHERE id=? AND status='active' LIMIT 1").bind(auth.stayId).first();
            if((stay?.start_date&&eventDate<stay.start_date)||(stay?.end_date&&eventDate>stay.end_date))return json({error:"La date doit être comprise dans les dates de votre séjour."},400,headers);
            const status=eventType==="idea"?"idea":"personal";
            await ensureStayNotificationTables(env.DB);
            await env.DB.batch([
              env.DB.prepare("UPDATE stay_events SET title=?,event_date=?,start_time=?,end_time=?,location=?,notes=?,event_type=?,status=?,updated_at=datetime('now') WHERE id=? AND stay_id=?").bind(title,eventDate,startTime||null,endTime||null,location||null,notes||null,eventType,status,eventId,auth.stayId),
              env.DB.prepare("DELETE FROM stay_notifications WHERE event_id=?").bind(eventId)
            ]);
            return json({ok:true,event:{id:eventId,title,event_date:eventDate,start_time:startTime||null,end_time:endTime||null,location:location||null,notes:notes||null,event_type:eventType,status}},200,headers);
          }
          if(request.method==="DELETE"&&eventId){
            const current=await env.DB.prepare("SELECT status,event_type FROM stay_events WHERE id=? AND stay_id=? LIMIT 1").bind(eventId,auth.stayId).first();
            if(!current)return json({error:"Événement introuvable."},404,headers);
            if(current.status==="confirmed"||current.event_type==="service")return json({error:"Une prestation confirmée doit être annulée avec l’aide de Malago."},409,headers);
            await ensureStayNotificationTables(env.DB);
            await env.DB.batch([
              env.DB.prepare("DELETE FROM stay_notifications WHERE event_id=?").bind(eventId),
              env.DB.prepare("DELETE FROM stay_events WHERE id=? AND stay_id=?").bind(eventId,auth.stayId)
            ]);
            return json({ok:true,id:eventId},200,headers);
          }
          return json({error:"Route ou méthode invalide pour cet événement."},405,headers);
        }
        if (request.method === "GET" && url.pathname === "/api/client/requests") {
          const stay = await env.DB.prepare(
            "SELECT property_name, guest_name, start_date, end_date FROM stays WHERE id=? AND status='active' LIMIT 1"
          ).bind(auth.stayId).first();
          const result = await env.DB.prepare(
            "SELECT id, category, description, status, created_at, updated_at FROM client_requests WHERE stay_id=? ORDER BY created_at DESC LIMIT 100"
          ).bind(auth.stayId).all();
          const requests = result.results || [];
          for (const item of requests) {
            const history = await env.DB.prepare("SELECT event_type,details,created_at FROM client_request_events WHERE request_id=? ORDER BY created_at ASC LIMIT 100").bind(item.id).all();
            item.history = (history.results || []).map(event => {
              let proposal = null, structuredDetails = null;
              if (event.event_type === "proposal") { try { proposal = JSON.parse(event.details || "{}"); } catch {} }
              if (event.event_type === "structured_details") { structuredDetails = parseStructuredDetails(event.details); item.structured_details=structuredDetails; }
              return {event_type:event.event_type,details:["proposal","structured_details"].includes(event.event_type) ? "" : event.details,created_at:event.created_at,proposal,structured_details:structuredDetails};
            });
          }
          return json({stay:stay || null,requests},200,headers);
        }
        const decisionMatch=url.pathname.match(/^\/api\/client\/requests\/([0-9a-f-]+)\/decision$/i);
        if (request.method === "POST" && decisionMatch) {
          const parsed=await readJson(request);if(parsed.error)return json({error:parsed.error},parsed.status,headers);
          const decision=sanitize(parsed.body?.decision,20),requestId=decisionMatch[1];
          if(!["accept","decline"].includes(decision))return json({error:"Choix invalide."},400,headers);
          const current=await env.DB.prepare("SELECT r.id,r.status,r.category,r.description,s.property_name,s.guest_name FROM client_requests r JOIN stays s ON s.id=r.stay_id WHERE r.id=? AND r.stay_id=? LIMIT 1").bind(requestId,auth.stayId).first();
          if(!current)return json({error:"Demande introuvable."},404,headers);
          if(current.status!=="quoted")return json({error:"Aucune proposition en attente de réponse pour cette demande."},409,headers);
          const nextStatus=decision==="accept"?"accepted_by_customer":"declined";
          const detail=decision==="accept"?"Le client accepte la proposition. En attente de confirmation finale du prestataire.":"Le client refuse la proposition.";
          await env.DB.batch([
            env.DB.prepare("UPDATE client_requests SET status=?,updated_at=datetime('now') WHERE id=? AND stay_id=?").bind(nextStatus,requestId,auth.stayId),
            env.DB.prepare("INSERT INTO client_request_events (id,request_id,event_type,details) VALUES (?,?,?,?)").bind(crypto.randomUUID(),requestId,"customer_decision",detail)
          ]);
          await sendMalagoEmail(env,{
            to:clean(env?.MALAGO_REQUESTS_EMAIL)||"Malagoagency@gmail.com",
            subject:decision==="accept"?"Un client accepte une proposition Malago":"Un client refuse une proposition Malago",
            text:["Une réponse client vient d’être enregistrée.","","Référence : "+requestId,"Séjour : "+(current.property_name||auth.stayId),"Client : "+(current.guest_name||"Non renseigné"),"Catégorie : "+current.category,"Décision : "+(decision==="accept"?"Proposition acceptée, confirmation prestataire encore requise":"Proposition refusée"),"","Demande : "+current.description].join("\n")
          });
          return json({ok:true,id:requestId,status:nextStatus,message:decision==="accept"?"Votre accord est enregistré. La prestation n’est pas encore confirmée.":"Votre refus est enregistré."},200,headers);
        }
        if (request.method === "POST" && url.pathname === "/api/client/requests") {
          const parsed = await readJson(request);
          if (parsed.error) return json({error:parsed.error},parsed.status,headers);
          const body=parsed.body||{};
          const inputs=Array.isArray(body.requests)?body.requests:[body];
          if(!inputs.length||inputs.length>12)return json({error:"Une demande peut contenir jusqu’à 12 prestations distinctes."},400,headers);
          const normalized=[];
          for(const item of inputs){
            const category=sanitize(item.category,40),description=sanitize(item.description,3000);
            if(!REQUEST_CATEGORIES.has(category))return json({error:"Catégorie de demande invalide."},400,headers);
            if(description.length<3)return json({error:"Précise chaque demande en quelques mots."},400,headers);
            const structuredDetails=item.details&&typeof item.details==="object"&&!Array.isArray(item.details)?item.details:null;
            const structuredJson=structuredDetails?JSON.stringify(structuredDetails):"";
            if(structuredJson.length>8000)return json({error:"Les précisions structurées sont trop volumineuses."},413,headers);
            normalized.push({id:crypto.randomUUID(),category,description,structuredDetails,structuredJson});
          }
          const operations=[];
          for(const item of normalized){
            operations.push(env.DB.prepare("INSERT INTO client_requests (id,stay_id,category,description,status) VALUES (?,?,?,?,'received')").bind(item.id,auth.stayId,item.category,item.description));
            operations.push(env.DB.prepare("INSERT INTO client_request_events (id,request_id,event_type,details) VALUES (?,?,?,?)").bind(crypto.randomUUID(),item.id,"received","Demande créée par le client"));
            if(item.structuredJson)operations.push(env.DB.prepare("INSERT INTO client_request_events (id,request_id,event_type,details) VALUES (?,?,?,?)").bind(crypto.randomUUID(),item.id,"structured_details",item.structuredJson));
          }
          await env.DB.batch(operations);
          const notifications=await Promise.all(normalized.map(item=>notifyNewClientRequest(env,{requestId:item.id,category:item.category,description:item.description,stayId:auth.stayId})));
          const saved=normalized.map(item=>({id:item.id,category:item.category,description:item.description,status:"received",structured_details:item.structuredDetails}));
          return json({ok:true,request:saved.length===1?saved[0]:undefined,requests:saved,message:saved.length===1?"Demande enregistrée. Elle n’est pas une réservation confirmée.":saved.length+" demandes distinctes enregistrées. Elles ne sont pas des réservations confirmées.",notifications_sent:notifications.filter(item=>item.sent).length},201,headers);
        }      } catch (error) {
        const requestId=crypto.randomUUID(); console.error("Client requests API error",requestId,error);
        return json({error:"Impossible de traiter la demande.",requestId},500,headers);
      }
      return json({error:"Route introuvable."},404,headers);
    }

    // Admin endpoints require the MALAGO_ADMIN_TOKEN secret in Worker settings.
    if (url.pathname.startsWith("/api/admin/")) {
      const denied = await adminJson(request,env);
      if (denied) return json(JSON.parse(await denied.text()),denied.status,headers);
      if (!env?.DB) return json({error:"Base de données non configurée."},503,headers);
      try {
        if (request.method === "GET" && url.pathname === "/api/admin/calendar") {
          await ensureStayEventsTable(env.DB);
          const result=await env.DB.prepare("SELECT e.id,e.stay_id,e.title,e.event_date,e.start_time,e.end_time,e.location,e.notes,e.event_type,e.status,e.created_at,e.updated_at,s.property_name,s.guest_name,s.guest_email,s.start_date AS stay_start_date,s.end_date AS stay_end_date FROM stay_events e JOIN stays s ON s.id=e.stay_id ORDER BY e.event_date ASC, COALESCE(e.start_time,'99:99') ASC LIMIT 1000").all();
          return json({events:result.results||[]},200,headers);
        }
        if (request.method === "POST" && url.pathname === "/api/admin/stays") {
          const parsed=await readJson(request);
          if (parsed.error) return json({error:parsed.error},parsed.status,headers);
          const body=parsed.body || {};
          const propertyName=sanitize(body.property_name,160);
          const guestName=sanitize(body.guest_name,160);
          const guestEmail=sanitize(body.guest_email,254);
          const startDate=sanitize(body.start_date,10);
          const endDate=sanitize(body.end_date,10);
          const days=30;
          if (!propertyName) return json({error:"property_name est obligatoire."},400,headers);
          if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) return json({error:"Adresse e-mail invalide."},400,headers);
          if (startDate && !isIsoCalendarDate(startDate)) return json({error:"Date d’arrivée invalide."},400,headers);
          if (endDate && !isIsoCalendarDate(endDate)) return json({error:"Date de départ invalide."},400,headers);
          if (startDate && endDate && endDate < startDate) return json({error:"La date de départ doit être égale ou postérieure à la date d’arrivée."},400,headers);
          const id=crypto.randomUUID();
          const rawToken=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join("");
          const tokenHash=await sha256Hex(rawToken);
          const expiresAt=new Date(Date.now()+days*86400000).toISOString();
          await env.DB.batch([
            env.DB.prepare("INSERT INTO stays (id,property_name,guest_name,guest_email,start_date,end_date,status) VALUES (?,?,?,?,?,?, 'active')").bind(id,propertyName,guestName||null,guestEmail||null,startDate||null,endDate||null),
            env.DB.prepare("INSERT INTO stay_access_tokens (id,stay_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),id,tokenHash,expiresAt)
          ]);
          return json({ok:true,stay:{id,property_name:propertyName,guest_name:guestName||null,start_date:startDate||null,end_date:endDate||null},access_token:rawToken,expires_at:expiresAt,warning:"Le jeton ne sera plus affiché. Transmets-le uniquement au client autorisé via un canal sécurisé."},201,headers);
        }
        const revokeMatch=url.pathname.match(/^\/api\/admin\/stays\/([0-9a-f-]+)\/revoke-tokens$/i);
        if (request.method === "POST" && revokeMatch) {
          const stayId=revokeMatch[1];
          const stay=await env.DB.prepare("SELECT id FROM stays WHERE id=?").bind(stayId).first();
          if (!stay) return json({error:"Séjour introuvable."},404,headers);
          const result=await env.DB.prepare("UPDATE stay_access_tokens SET revoked_at=datetime('now') WHERE stay_id=? AND revoked_at IS NULL").bind(stayId).run();
          return json({ok:true,revoked:result.meta?.changes || 0},200,headers);
        }
        if (request.method === "GET" && url.pathname === "/api/admin/requests") {
          const result=await env.DB.prepare("SELECT r.id,r.stay_id,s.property_name,s.guest_name,s.guest_email,s.start_date AS stay_start_date,s.end_date AS stay_end_date,r.category,r.description,r.status,r.created_at,r.updated_at FROM client_requests r JOIN stays s ON s.id=r.stay_id ORDER BY r.created_at DESC LIMIT 200").all();
          const requests=result.results||[],ids=requests.map(item=>item.id);
          if(ids.length){
            const placeholders=ids.map(()=>"?").join(",");
            const extra=await env.DB.prepare("SELECT request_id,details FROM client_request_events WHERE event_type='structured_details' AND request_id IN ("+placeholders+") ORDER BY created_at DESC").bind(...ids).all();
            const detailMap=new Map();
            for(const row of extra.results||[])if(!detailMap.has(row.request_id))detailMap.set(row.request_id,parseStructuredDetails(row.details));
            for(const item of requests)item.structured_details=detailMap.get(item.id)||null;
          }
          return json({requests},200,headers);
        }
        const proposalMatch=url.pathname.match(/^\/api\/admin\/requests\/([0-9a-f-]+)\/proposal$/i);
        if (request.method === "POST" && proposalMatch) {
          const parsed=await readJson(request);
          if(parsed.error)return json({error:parsed.error},parsed.status,headers);
          const body=parsed.body||{},requestId=proposalMatch[1];
          const message=sanitize(body.message,2000),partnerName=sanitize(body.partner_name,160),price=sanitize(body.price,100),currency=sanitize(body.currency||"EUR",8),conditions=sanitize(body.conditions,1200),availability=sanitize(body.availability,300);
          const proposedDate=sanitize(body.proposed_date,10),proposedStart=sanitize(body.proposed_start_time,5),proposedEnd=sanitize(body.proposed_end_time,5),proposalLocation=sanitize(body.proposal_location,180);
          if(message.length<5)return json({error:"Ajoute le détail de la proposition du prestataire."},400,headers);
          if(price&&!/^[0-9]+([.,][0-9]{1,2})?$/.test(price))return json({error:"Le prix doit être un montant simple, par exemple 180 ou 180,50."},400,headers);
          if(proposedDate&&!isIsoCalendarDate(proposedDate))return json({error:"La date proposée est invalide."},400,headers);
          if(!isCalendarTime(proposedStart)||!isCalendarTime(proposedEnd))return json({error:"L’horaire proposé est invalide."},400,headers);
          if(proposedStart&&proposedEnd&&proposedEnd<=proposedStart)return json({error:"L’heure de fin doit être postérieure à l’heure de début."},400,headers);
          if(!proposedDate&&(proposedStart||proposedEnd))return json({error:"Ajoute une date si tu renseignes un horaire."},400,headers);
          const current=await env.DB.prepare("SELECT r.id,r.status,s.guest_email,s.guest_name,s.property_name,s.start_date,s.end_date FROM client_requests r JOIN stays s ON s.id=r.stay_id WHERE r.id=?").bind(requestId).first();
          if(!current)return json({error:"Demande introuvable."},404,headers);
          if(proposedDate&&((current.start_date&&proposedDate<current.start_date)||(current.end_date&&proposedDate>current.end_date)))return json({error:"La date proposée doit être comprise dans le séjour."},400,headers);
          if(current.status!=="quoted"&&!REQUEST_STATUS_TRANSITIONS[current.status]?.has("quoted"))return json({error:"Cette demande ne peut pas recevoir de proposition dans son état actuel."},409,headers);
          const proposal={message,partner_name:partnerName||"",price:price||null,currency,conditions:conditions||"",availability:availability||"",proposed_date:proposedDate||"",proposed_start_time:proposedStart||"",proposed_end_time:proposedEnd||"",proposal_location:proposalLocation||"",provider_confirmed:false};
          await env.DB.batch([
            env.DB.prepare("UPDATE client_requests SET status='quoted',updated_at=datetime('now') WHERE id=?").bind(requestId),
            env.DB.prepare("INSERT INTO client_request_events (id,request_id,event_type,details) VALUES (?,?,?,?)").bind(crypto.randomUUID(),requestId,"proposal",JSON.stringify(proposal))
          ]);
          if(current.guest_email) await sendMalagoEmail(env,{
            to:current.guest_email,
            subject:"Une proposition vous attend — Villa Magos × Malago",
            text:["Bonjour"+(current.guest_name?" "+current.guest_name:"")+",","","Malago a ajouté une proposition à votre demande.","","Séjour : "+(current.property_name||"Villa Magos"),"Référence : "+requestId,"Proposition : "+message,partnerName?"Prestataire : "+partnerName:"",price?"Prix proposé : "+price+" "+currency:"",availability?"Disponibilité annoncée : "+availability:"",proposedDate?"Date proposée : "+proposedDate:"",proposedStart?"Début : "+proposedStart:"",proposedEnd?"Fin : "+proposedEnd:"",proposalLocation?"Lieu : "+proposalLocation:"",conditions?"Conditions : "+conditions:"","","Connectez-vous à votre espace privé Villa Magos pour consulter la proposition et l’accepter ou la refuser.","","Votre accord ne vaut pas confirmation finale tant que le prestataire n’a pas confirmé la prestation."].filter(Boolean).join("\n")
          });
          return json({ok:true,id:requestId,status:"quoted",proposal},200,headers);
        }
        const statusMatch=url.pathname.match(/^\/api\/admin\/requests\/([0-9a-f-]+)\/status$/i);
        if (request.method === "POST" && statusMatch) {
          const parsed=await readJson(request);
          if (parsed.error) return json({error:parsed.error},parsed.status,headers);
          const nextStatus=sanitize(parsed.body?.status,40);
          const note=sanitize(parsed.body?.note,1000);
          if (!REQUEST_STATUSES.has(nextStatus)) return json({error:"Statut invalide."},400,headers);
          if (nextStatus==="confirmed" && note.length<5) return json({error:"Pour confirmer, ajoute une note attestant la confirmation réelle du prestataire."},400,headers);
          const requestId=statusMatch[1];
          const current=await env.DB.prepare("SELECT r.status,r.stay_id,r.category,s.start_date,s.end_date FROM client_requests r JOIN stays s ON s.id=r.stay_id WHERE r.id=?").bind(requestId).first();
          if (!current) return json({error:"Demande introuvable."},404,headers);
          if (current.status===nextStatus) return json({ok:true,id:requestId,status:nextStatus,unchanged:true},200,headers);
          if (!REQUEST_STATUS_TRANSITIONS[current.status]?.has(nextStatus)) return json({error:"Transition de statut interdite.",current_status:current.status,requested_status:nextStatus},409,headers);
          const eventDetails=current.status+" -> "+nextStatus+(note ? " | "+note : ""),ops=[
            env.DB.prepare("UPDATE client_requests SET status=?,updated_at=datetime('now') WHERE id=?").bind(nextStatus,requestId),
            env.DB.prepare("INSERT INTO client_request_events (id,request_id,event_type,details) VALUES (?,?,?,?)").bind(crypto.randomUUID(),requestId,"status_changed",eventDetails)
          ];
          if(nextStatus==="confirmed"){
            const proposalEvent=await env.DB.prepare("SELECT details FROM client_request_events WHERE request_id=? AND event_type='proposal' ORDER BY created_at DESC LIMIT 1").bind(requestId).first();
            const proposal=parseStructuredDetails(proposalEvent?.details);
            if(!proposal?.proposed_date||!isIsoCalendarDate(proposal.proposed_date))return json({error:"Ajoute une date valide à la proposition avant de confirmer : la prestation doit pouvoir être inscrite dans l’agenda."},400,headers);
            if((current.start_date&&proposal.proposed_date<current.start_date)||(current.end_date&&proposal.proposed_date>current.end_date))return json({error:"La date confirmée doit être comprise dans les dates du séjour."},400,headers);
            await ensureStayEventsTable(env.DB);
            const categoryLabel={car_rental:"Location de voiture",airport_transfer:"Transfert chauffeur",chauffeur:"Chauffeur privé",restaurant:"Restaurant",activity:"Expérience",chef:"Chef privé",groceries:"Courses livrées",beach_club:"Plage / beach club",wellness:"Bien-être",family:"Famille & enfants",decoration:"Décoration & fleurs",bartender:"Barman privé",dj:"DJ privé",event:"Événement privé",villa_services:"Service à la villa",other:"Service Villa Magos"};
            const eventTitle=sanitize((categoryLabel[current.category]||"Service Villa Magos")+(proposal.partner_name?" · "+proposal.partner_name:""),120);
            const existing=await env.DB.prepare("SELECT id FROM stay_events WHERE linked_request_id=? LIMIT 1").bind(requestId).first();
            if(existing)ops.push(env.DB.prepare("UPDATE stay_events SET title=?,event_date=?,start_time=?,end_time=?,location=?,notes=?,event_type='service',status='confirmed',updated_at=datetime('now') WHERE id=?").bind(eventTitle,proposal.proposed_date,proposal.proposed_start_time||null,proposal.proposed_end_time||null,proposal.proposal_location||null,proposal.message||proposal.conditions||null,existing.id));
            else ops.push(env.DB.prepare("INSERT INTO stay_events (id,stay_id,title,event_date,start_time,end_time,location,notes,event_type,status,linked_request_id) VALUES (?,?,?,?,?,?,?,?,'service','confirmed',?)").bind(crypto.randomUUID(),current.stay_id,eventTitle,proposal.proposed_date,proposal.proposed_start_time||null,proposal.proposed_end_time||null,proposal.proposal_location||null,proposal.message||proposal.conditions||null,requestId));
          }
          if(nextStatus==="cancelled"){await ensureStayEventsTable(env.DB);ops.push(env.DB.prepare("UPDATE stay_events SET status='cancelled',updated_at=datetime('now') WHERE linked_request_id=?").bind(requestId));}
          await env.DB.batch(ops);
          return json({ok:true,id:requestId,status:nextStatus},200,headers);
        }
      } catch (error) {
        const requestId=crypto.randomUUID(); console.error("Admin requests API error",requestId,error);
        return json({error:"Impossible de traiter l’opération.",requestId},500,headers);
      }
      return json({error:"Route introuvable."},404,headers);
    }

    // Team-only interface for creating individual Villa Magos stay links. API actions still require the admin bearer token.
    if (request.method === "GET" && url.pathname === "/villa-magos/admin") {
      if (env?.ASSETS) return env.ASSETS.fetch(new Request(new URL("/villa-magos-admin.html", url), { method: "GET", headers: request.headers }));
      return new Response("Malago assets unavailable",{status:503,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
    }

    // Team-only calendar; API data remains protected by adminJson.
    if (request.method === "GET" && url.pathname === "/villa-magos/calendrier") {
      if (env?.ASSETS) return env.ASSETS.fetch(new Request(new URL("/villa-magos-calendar-admin.html", url), { method: "GET", headers: request.headers }));
      return new Response("Malago assets unavailable",{status:503,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
    }

    // Clean client-facing route: serve the existing Villa Magos experience at a dedicated stay URL.
    // The private token remains in the URL fragment, which is not sent to the server.
    if (request.method === "GET" && url.pathname === "/villa-magos/sejour") {
      if (env?.ASSETS) return env.ASSETS.fetch(new Request(new URL("/villa-magos.html", url), { method: "GET", headers: request.headers }));
      return new Response("Malago assets unavailable",{status:503,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
    }

    if (request.method === "GET") {
      if (env?.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Malago assets unavailable",{status:503,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
    }
    if (request.method === "POST" && url.pathname === "/api/chat") {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength && contentLength > MAX_BODY) return json({error:"Requête trop volumineuse."},413,headers);
      try {
        const rawBody = await request.text();
        const bodyBytes = new TextEncoder().encode(rawBody).byteLength;
        if (bodyBytes > MAX_BODY) return json({error:"Requête trop volumineuse."},413,headers);
        let body;
        try { body = JSON.parse(rawBody); }
        catch { return json({error:"JSON invalide."},400,headers); }
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
  },
  async scheduled(controller, env, ctx) {
    try { await processStayReminders(env); }
    catch(error) { console.error("Villa Magos reminder job failed",error); }
  }
};