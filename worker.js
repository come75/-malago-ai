import { GUIDE, RESSOURCES } from "./data.js";

/* =========================================================
   MALAGO — conversational + commercial guide
   Source of truth: data.js (GUIDE + RESSOURCES)
   Cloudflare binding: env.AI
   ========================================================= */

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS_PER_MESSAGE = 1800;
const MAX_FOCUS = 6;
const MAX_GUIDE_RESULTS = 10;
const MAX_RESOURCE_RESULTS = 36;
const MAX_RESOURCE_DETAILS = 12;

const STOP_WORDS = new Set([
  "quel", "quelle", "quels", "quelles", "est", "sont", "une", "un",
  "des", "du", "de", "la", "le", "les", "pour", "avec", "dans",
  "sur", "ce", "cette", "ces", "peut", "peut-on", "peuton", "faire",
  "faire", "avoir", "a", "à", "au", "aux", "et", "ou", "où", "je",
  "me", "moi", "nous", "on", "il", "elle", "ils", "elles", "qui",
  "comment", "quoi", "que", "y", "en", "ça", "cela", "ici", "là",
  "ton", "ta", "tes", "mon", "ma", "mes", "notre", "nos", "votre",
  "vos", "the", "what", "where", "can", "for", "with", "this", "that",
  "doit", "dois", "tu", "te", "cherche", "chercher", "veux", "veut",
  "voudrais", "voudrait", "please", "tell", "show", "give", "me"
]);

const SYNONYMS = {
  restaurant: [
    "restaurant", "restaurants", "resto", "restos", "manger", "mange",
    "repas", "food", "diner", "dejeuner", "eat", "cuisine"
  ],
  nightlife: [
    "nightlife", "club", "clubs", "boite", "boites", "discotheque",
    "soiree", "sortir", "sortie", "party", "fete", "night", "after"
  ],
  activity: [
    "activity", "activities", "activite", "activites", "loisir", "loisirs",
    "buggy", "quad", "parasailing", "bateau", "yacht", "surf", "jetski",
    "jet", "nautique", "nautiques", "sport", "mer"
  ],
  excursion: [
    "excursion", "excursions", "voyage", "voyages", "weekend", "week-end",
    "trip", "trips", "maroc", "algarve", "portugal", "chefchaouen", "tanger",
    "tetouan", "palmar"
  ],
  discount: [
    "reduction", "reductions", "promo", "promotion", "promotions", "discount",
    "discounts", "offre", "offres", "remise", "avantage", "bon plan", "pourcentage"
  ],
  vegetarian: [
    "vegetarien", "vegetarienne", "vegetariens", "vegetariennes", "vegetarian",
    "vegetarians", "vegan", "vegane", "vegetal", "sans viande"
  ],
  gluten: [
    "gluten", "sans gluten", "gluten-free", "celiaque", "coeliaque"
  ],
  menu: [
    "menu", "carte", "plat", "plats", "entree", "dessert", "tapas", "paella",
    "sushi", "noodles", "burger", "pates", "viande", "poisson", "pizza", "desserts"
  ],
  price: [
    "prix", "tarif", "combien", "cout", "cher", "chere", "cheap", "budget",
    "euros", "euro"
  ],
  vip: [
    "vip", "bouteille", "bouteilles", "table", "backstage", "premium", "show", "pack"
  ],
  booking: [
    "reserver", "reservation", "reserve", "booking", "book", "lien", "acheter", "ticket"
  ],
  hours: [
    "horaire", "horaires", "heure", "heures", "ouvert", "ouverte", "ouvre", "ferme", "fermeture"
  ],
  date: [
    "date", "dates", "quand", "prochaine", "prochain", "disponible", "disponibilite"
  ],
  another: [
    "autre", "autres", "encore", "different", "differente", "deuxieme", "deuxieme", "alternatif"
  ]
};

const CATEGORY_BY_NAME = new Map([
  ["los marangos plaza camas", "Restaurant"],
  ["jose herencia de cocina", "Restaurant"],
  ["circus teatinos spaghetteria", "Restaurant"],
  ["sushi flower teatinos", "Restaurant"],
  ["la caverna gastro taberna andaluza", "Restaurant"],
  ["canela y clavo", "Restaurant"],
  ["tapearte", "Restaurant"],
  ["taro", "Restaurant"],
  ["tuktuk noodles", "Restaurant"],
  ["santa rita", "Party"],
  ["cosanuestra", "Party"],
  ["bro", "Party"],
  ["aura", "Party"],
  ["infinity by mirror", "Party"],
  ["mirror", "Party"],
  ["silencio beach club", "Beach Club"],
  ["location de voiture", "Services"],
  ["dia de surf en el palmar", "Excursions"],
  ["el norte de marruecos la ciudad azul", "Excursions"],
  ["algarve paradise weekend", "Excursions"],
  ["jet ski boat water activities", "Activity"],
  ["quad buggy", "Activity"]
]);

const NAME_ALIASES = new Map([
  ["cosa nostra", "CosaNuestra"],
  ["cosa nuestra", "CosaNuestra"],
  ["bro club", "Bro"],
  ["brø", "Bro"],
  ["brø club", "Bro"],
  ["santa", "Santa Rita"],
  ["los marangos", "Los Marangós Plaza Camas"],
  ["los marangós", "Los Marangós Plaza Camas"],
  ["jose herencia", "José, Herencia de Cocina"],
  ["jose, herencia", "José, Herencia de Cocina"],
  ["taro", "Taró"],
  ["tuk tuk", "TukTuk Noodles"],
  ["tuktuk", "TukTuk Noodles"],
  ["sushi flower", "Sushi Flower - Teatinos"],
  ["la caverna", "La Caverna | Gastro-Taberna Andaluza"],
  ["canela y clavo", "Canela y Clavo"],
  ["tapearte", "Tapearte"],
  ["silencio", "Silencio Beach Club"],
  ["water activities", "Jet Ski, Boat & Water Activities"],
  ["activites nautiques", "Jet Ski, Boat & Water Activities"],
  ["activités nautiques", "Jet Ski, Boat & Water Activities"],
  ["jet ski", "Jet Ski, Boat & Water Activities"],
  ["jet-ski", "Jet Ski, Boat & Water Activities"],
  ["buggy", "Quad / Buggy"],
  ["quad", "Quad / Buggy"],
  ["surf", "Día de Surf en El Palmar"],
  ["maroc", "El Norte de Marruecos & la Ciudad Azul"],
  ["algarve", "Algarve Paradise Weekend"],
  ["voiture", "Location de voiture"],
  ["location voiture", "Location de voiture"]
]);

const GUIDE_NORM = GUIDE.map(item => ({ ...item, category: canonicalGuideCategory(item) }));

function clean(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9€%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text = "") {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function hasAny(text, terms) {
  const q = normalize(text);
  const words = new Set(tokens(q));
  return terms.some(term => {
    const t = normalize(term);
    if (!t) return false;
    if (t.includes(" ")) return (` ${q} `).includes(` ${t} `);
    return words.has(t);
  });
}

function canonicalGuideCategory(item) {
  const name = normalize(item?.name || "");
  if (CATEGORY_BY_NAME.has(name)) return CATEGORY_BY_NAME.get(name);

  const raw = normalize(item?.category || "");
  if (raw.includes("restaurant")) return "Restaurant";
  if (raw.includes("party") || raw.includes("nightlife")) return "Party";
  if (raw.includes("beach")) return "Beach Club";
  if (raw.includes("service")) return "Services";
  if (raw.includes("excursion") || raw.includes("voyage")) return "Excursions";
  if (raw.includes("activit")) return "Activity";
  return clean(item?.category);
}

function expandQuery(query) {
  const q = normalize(query);
  const base = new Set(tokens(q));
  const expanded = new Set(base);

  for (const group of Object.values(SYNONYMS)) {
    const normalized = group.map(normalize);
    const found = normalized.some(term =>
      term.includes(" ") ? (` ${q} `).includes(` ${term} `) : base.has(term)
    );
    if (found) normalized.forEach(term => expanded.add(term));
  }

  return expanded;
}

function intentOf(query) {
  const q = normalize(query);
  return {
    restaurant: hasAny(q, SYNONYMS.restaurant),
    nightlife: hasAny(q, SYNONYMS.nightlife),
    activity: hasAny(q, SYNONYMS.activity),
    excursion: hasAny(q, SYNONYMS.excursion),
    discount: hasAny(q, SYNONYMS.discount),
    vegetarian: hasAny(q, SYNONYMS.vegetarian),
    gluten: hasAny(q, SYNONYMS.gluten),
    menu: hasAny(q, SYNONYMS.menu),
    price: hasAny(q, SYNONYMS.price),
    vip: hasAny(q, SYNONYMS.vip),
    booking: hasAny(q, SYNONYMS.booking),
    hours: hasAny(q, SYNONYMS.hours),
    date: hasAny(q, SYNONYMS.date),
    another: hasAny(q, SYNONYMS.another),
    broad: /^(quel|quels|quelle|quelles|que|quoi|donne|montre|cherche|voir|liste)\b/.test(q) || /^je veux\b/.test(q)
  };
}

function detectMentionedNames(text = "") {
  const q = normalize(text);
  const padded = ` ${q} `;
  const found = [];

  for (const item of GUIDE_NORM) {
    const n = normalize(item.name);
    if (n && padded.includes(` ${n} `)) found.push(item.name);
  }

  for (const [alias, canonical] of NAME_ALIASES.entries()) {
    const a = normalize(alias);
    if (a && (` ${q} `).includes(` ${a} `)) found.push(canonical);
  }

  return [...new Set(found)];
}

function extractHistoryNames(history = []) {
  const names = [];
  for (const message of history.slice(-MAX_HISTORY_MESSAGES)) {
    names.push(...detectMentionedNames(message.content));
  }
  return [...new Set(names)];
}

function focusNames(question, activeResults = [], history = []) {
  const explicit = detectMentionedNames(question);
  if (explicit.length) return explicit.slice(0, MAX_FOCUS);

  const active = Array.isArray(activeResults)
    ? activeResults.map(item => clean(item?.name)).filter(Boolean)
    : [];

  const intent = intentOf(question);
  const q = normalize(question);
  const conversationalFollowUp =
    looksLikeRefinement(intent) ||
    intent.another ||
    /^(et|mais|du coup|donc|alors|et pour|et au fait)\b/.test(q) ||
    /\b(ce resto|ce restaurant|ce club|celui|celle|eux|elles|ils|il|elle)\b/.test(q);

  if (!conversationalFollowUp) return [];

  const fromHistory = extractHistoryNames(history);
  return [...new Set([...active, ...fromHistory])].slice(0, MAX_FOCUS);
}

function categoryMatches(item, intent) {
  const category = canonicalGuideCategory(item);
  if (intent.restaurant) return category === "Restaurant";
  if (intent.nightlife) return category === "Party" || category === "Beach Club";
  if (intent.activity) return category === "Activity";
  if (intent.excursion) return category === "Excursions";
  return true;
}

function looksLikeRefinement(intent) {
  return (
    intent.discount || intent.vegetarian || intent.gluten || intent.price ||
    intent.vip || intent.booking || intent.hours || intent.date || intent.menu
  ) && !intent.restaurant && !intent.nightlife && !intent.activity && !intent.excursion;
}

function scoreGuide(item, query, qTokens, focus, excludeNames = []) {
  const text = normalize([
    item.category,
    item.name,
    item.price,
    item.promo,
    item.booking,
    item.description,
    item.notes,
    item.tags,
    item.forWho,
    item.when,
    item.externalResource,
  ].join(" "));
  const words = new Set(tokens(text));
  const q = normalize(query);
  const intent = intentOf(query);
  const name = clean(item.name);

  if (excludeNames.some(x => normalize(x) === normalize(name))) return -Infinity;

  let score = 0;
  for (const word of qTokens) if (words.has(word)) score += 1;

  if (intent.restaurant && item.category === "Restaurant") score += 10;
  if (intent.nightlife && ["Party", "Beach Club"].includes(item.category)) score += 10;
  if (intent.activity && item.category === "Activity") score += 11;
  if (intent.excursion && item.category === "Excursions") score += 11;
  if (intent.discount && /%/.test(clean(item.promo))) score += 12;
  if (intent.vip && /(vip|bouteille|backstage|pack|show)/i.test([item.price, item.booking, item.tags, item.description].join(" "))) score += 7;
  if (intent.vegetarian && /(vegetar|vegan|sans viande)/i.test([item.tags, item.description, item.notes].join(" "))) score += 9;
  if (intent.gluten && /gluten/i.test([item.tags, item.description, item.notes].join(" "))) score += 9;
  if (intent.booking && clean(item.booking)) score += 5;
  if (intent.hours && clean(item.when)) score += 4;
  if (intent.date && /\d{2}\/\d{2}\/\d{4}/.test([item.when,item.notes,item.description].join(" "))) score += 5;

  if (q.includes("paella") && /paella/i.test(text)) score += 15;
  if (q.includes("sushi") && /sushi/i.test(text)) score += 15;
  if (q.includes("noodles") && /noodles/i.test(text)) score += 15;
  if ((q.includes("grosse soiree") || q.includes("grosse fete")) && normalize(item.name) === "santa rita") score += 15;

  if (focus.some(x => normalize(x) === normalize(name))) score += 35;

  return score;
}

function searchGuide(query, focus = []) {
  const intent = intentOf(query);
  const qTokens = expandQuery([query, ...focus].join(" "));

  const focusItems = focus
    .map(name => GUIDE_NORM.find(item => normalize(item.name) === normalize(name)))
    .filter(Boolean);

  const explicitNames = detectMentionedNames(query);
  if (explicitNames.length && !intent.another) {
    return explicitNames
      .map(name => GUIDE_NORM.find(item => normalize(item.name) === normalize(name)))
      .filter(Boolean)
      .slice(0, MAX_GUIDE_RESULTS);
  }

  const exclude = intent.another ? focus : [];

  // Broad category requests should list the whole relevant category.
  if (!focus.length && intent.restaurant && intent.broad && !intent.menu && !intent.price && !intent.discount) {
    return GUIDE_NORM.filter(item => item.category === "Restaurant").slice(0, MAX_GUIDE_RESULTS);
  }

  if (!focus.length && intent.restaurant && intent.discount && !intent.menu) {
    return GUIDE_NORM.filter(item => item.category === "Restaurant" && /%/.test(clean(item.promo))).slice(0, MAX_GUIDE_RESULTS);
  }

  if (!focus.length && intent.nightlife && intent.broad && !intent.vip && !intent.price) {
    return GUIDE_NORM.filter(item => ["Party", "Beach Club"].includes(item.category)).slice(0, MAX_GUIDE_RESULTS);
  }

  if (!focus.length && intent.activity && intent.broad && !intent.price && !intent.menu) {
    return GUIDE_NORM.filter(item => item.category === "Activity").slice(0, MAX_GUIDE_RESULTS);
  }

  if (!focus.length && intent.excursion && intent.broad && !intent.price && !intent.menu) {
    return GUIDE_NORM.filter(item => item.category === "Excursions").slice(0, MAX_GUIDE_RESULTS);
  }

  // Detail follow-up: keep the active establishments as the primary target.
  if (focus.length && looksLikeRefinement(intent) && !intent.another) {
    return focusItems.slice(0, MAX_GUIDE_RESULTS);
  }

  const scored = GUIDE_NORM
    .map(item => ({
      item,
      score: scoreGuide(item, query, qTokens, focus, exclude)
    }))
    .filter(x => Number.isFinite(x.score) && x.score > 0)
    .sort((a, b) => b.score - a.score);

  // If the user asks for another option, preserve the category from the query
  // and exclude the current focus.
  if (intent.another) {
    const categoryPool = scored.filter(x => categoryMatches(x.item, intent));
    return categoryPool.slice(0, MAX_GUIDE_RESULTS).map(x => x.item);
  }

  // Very specific dish/activity queries: prefer direct textual matches.
  const specificTerms = [
    "paella", "sushi", "noodles", "burger", "tapas", "pizza", "yacht",
    "jet ski", "jetski", "buggy", "quad", "parasailing", "surf", "gluten", "vegetarien"
  ];
  const specific = specificTerms.find(term => normalize(query).includes(normalize(term)));
  if (specific && !focus.length) {
    const direct = scored.filter(x => {
      const text = normalize([x.item.name, x.item.description, x.item.notes, x.item.tags].join(" "));
      return text.includes(normalize(specific));
    });
    if (direct.length) return direct.slice(0, 3).map(x => x.item);
  }

  return scored.slice(0, MAX_GUIDE_RESULTS).map(x => x.item);
}

function canonicalResourceEstablishment(name) {
  const n = normalize(name);
  if (n === "br") return "Bro";
  if (n === "silencio") return "Silencio Beach Club";
  if (n === "activites nautiques" || n === "activites nautiques") return "Jet Ski, Boat & Water Activities";
  if (n === "jet ski boat water activities") return "Jet Ski, Boat & Water Activities";
  if (n === "los marangos plaza camas") return "Los Marangós Plaza Camas";
  return clean(name);
}

function sameEstablishment(a, b) {
  return normalize(canonicalResourceEstablishment(a)) === normalize(canonicalResourceEstablishment(b));
}

function suspiciousPrice(value) {
  const v = clean(value);
  return /^20\d{2}-\d{2}-\d{2}(?:T|$)/.test(v);
}

function validResourcePrice(value) {
  const v = clean(value);
  if (!v || suspiciousPrice(v)) return "";
  return v;
}

function scoreResource(item, query, qTokens, focus) {
  const establishment = clean(item.establishment);
  const type = clean(item.type);
  const offer = clean(item.offer);
  const price = validResourcePrice(item.price);
  const conditions = clean(item.conditions);
  const source = clean(item.source);
  const date = clean(item.date);

  const text = normalize([establishment, type, offer, price, conditions, source, date].join(" "));
  const words = new Set(tokens(text));
  const intent = intentOf(query);
  const q = normalize(query);
  let score = 0;

  for (const word of qTokens) if (words.has(word)) score += 1;
  for (const name of focus) if (sameEstablishment(establishment, name)) score += 22;

  if (intent.menu) score += 3;
  if (intent.activity && /activites nautiques|jet ski|quad|buggy|surf/i.test(text)) score += 6;
  if (intent.price && price) score += 4;
  if (intent.vegetarian && /(vegetar|vegan|verdura|verduras|tofu|legumbre|veggie)/i.test(text)) score += 10;
  if (intent.gluten && /gluten/i.test(text)) score += 10;
  if (intent.vip && /(vip|bottle|bouteille|champagne|vodka|whisky|gin|ron|tequila|pack|show)/i.test(text)) score += 7;

  if (/(jet ski|jetski|bateau|boat|yacht|parasailing|buggy|quad|surf)/.test(q) && /(jet|boat|bateau|yacht|parasail|buggy|quad|surf)/i.test(text)) score += 6;
  if (/(restaurant|resto|manger|plat|menu|carte|paella|sushi|noodles|tapas|pizza)/.test(q) && /(menu|plat|tapas|sushi|noodles|paella|pasta|pates|carne|pescado|postres|pizza)/i.test(text)) score += 6;

  return score;
}

function resourceLimit(question) {
  const q = normalize(question);
  if (/menu|carte/.test(q)) return 40;
  if (/ingredient|composition|vegetar|vegan|gluten|option|options/.test(q)) return 30;
  if (/(prix|tarif|combien|plat|plats|dessert|tapas|paella|sushi|noodles|bouteille|vip|cocktail|biere|vin|whisky|gin|vodka|rhum|tequila)/.test(q)) return 28;
  return 18;
}

function shouldUseResources(question) {
  const intent = intentOf(question);
  if (intent.activity && intent.broad) return true;

  return hasAny(question, [
    ...SYNONYMS.menu,
    ...SYNONYMS.vegetarian,
    ...SYNONYMS.gluten,
    ...SYNONYMS.price,
    ...SYNONYMS.vip,
    "ingredient", "ingredients", "composition", "option", "options",
    "boisson", "boissons", "cocktail", "biere", "vin", "whisky", "gin",
    "vodka", "rhum", "tequila"
  ]);
}

function dedupeResources(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = [
      clean(item.establishment), clean(item.type), clean(item.offer),
      validResourcePrice(item.price), clean(item.conditions)
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function specificResourceTerms(question) {
  const q = normalize(question);
  const terms = [
    "paella", "sushi", "noodles", "burger", "pizza", "tapas",
    "jet ski", "jetski", "bateau", "boat", "yacht", "parasailing",
    "buggy", "quad", "surf", "gluten", "vegetarien", "vegetarienne",
    "vegan", "sans viande", "bouteille", "vip", "champagne", "vodka",
    "gin", "whisky", "rhum", "tequila"
  ];
  return terms.filter(term => (` ${q} `).includes(` ${normalize(term)} `));
}

function resourceContainsTerm(item, term) {
  const text = normalize([item.establishment, item.type, item.offer, item.conditions].join(" "));
  return (` ${text} `).includes(` ${normalize(term)} `) || text.includes(normalize(term));
}

function searchResources(question, focus = []) {
  if (!shouldUseResources(question)) return [];

  const qTokens = expandQuery(question);
  const limit = resourceLimit(question);
  const intent = intentOf(question);
  const specificTerms = specificResourceTerms(question);
  const focusedNames = new Set(focus.map(normalize));

  let results;

  // Exact detail terms come first. This prevents generic words such as
  // "restaurant" or "prix" from polluting a question about paella, sushi,
  // buggy, jet ski, etc.
  if (specificTerms.length) {
    results = RESSOURCES
      .filter(item => specificTerms.some(term => resourceContainsTerm(item, term)))
      .filter(item => !focus.length || focusedNames.has(normalize(canonicalResourceEstablishment(item.establishment))))
      .map(item => ({
        item,
        score: specificTerms.reduce((sum, term) => sum + (resourceContainsTerm(item, term) ? 10 : 0), 0)
          + scoreResource(item, question, qTokens, focus)
      }))
      .sort((a, b) => b.score - a.score);
  } else {
    results = RESSOURCES
      .map(item => ({ item, score: scoreResource(item, question, qTokens, focus) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  // When a user asks a follow-up detail about a known establishment,
  // only use resources belonging to that establishment.
  if (focus.length && (intent.vegetarian || intent.gluten || intent.menu || intent.price || intent.vip)) {
    results = results.filter(x => focusedNames.has(normalize(canonicalResourceEstablishment(x.item.establishment))));
  }

  // Vegetarian / gluten answers require an explicit match in the resource fields.
  if (intent.vegetarian) {
    results = results.filter(x => /(vegetar|vegan|verdura|verduras|tofu|legumbre|veggie)/i.test(
      [x.item.type, x.item.offer, x.item.conditions].join(" ")
    ));
  }

  if (intent.gluten) {
    results = results.filter(x => /gluten/i.test(
      [x.item.type, x.item.offer, x.item.conditions].join(" ")
    ));
  }

  return dedupeResources(results.slice(0, limit).map(x => x.item));
}

function extractUrls(text = "") {
  return [...new Set(
    (String(text).match(/https?:\/\/[^\s|]+/gi) || [])
      .map(url => url.replace(/[),.;]+$/g, ""))
  )];
}

function bookingLinks(booking = "") {
  return extractUrls(booking).map(url => {
    const u = url.toLowerCase();
    let label = "Ouvrir";
    let kind = "booking";

    if (u.includes("wa.me")) {
      label = "WhatsApp Malago";
      kind = "whatsapp";
    } else if (u.includes("malagasouthexperiences")) {
      label = "Réserver l'excursion";
    } else if (u.includes("bookeo")) {
      label = "Réserver";
    } else if (u.includes("fourvenues")) {
      label = "Réserver";
    } else if (u.includes("whan.es")) {
      label = "Réserver";
    } else if (u.includes("enterticket")) {
      label = "Réserver";
    }

    return { url, label, kind };
  });
}

function isPromotion(value) {
  const v = normalize(value);
  return Boolean(v && v !== "non" && v !== "-");
}

function extractDates(text = "") {
  return [...new Set(String(text).match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || [])];
}

function localMadridDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function dateKey(date) {
  const m = String(date).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function nextDateInfo(item) {
  const dates = extractDates([item.when, item.notes, item.description].join(" "))
    .map(display => ({ display, key: dateKey(display) }))
    .filter(x => x.key)
    .sort((a, b) => a.key.localeCompare(b.key));

  const today = localMadridDateKey();
  return {
    allDates: dates.map(x => x.display),
    nextDate: dates.find(x => x.key >= today)?.display || null
  };
}

function formatResourceDate(value) {
  const v = clean(value);
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : v;
}

function serializeGuide(item, promoRequested = false, resourceHits = []) {
  const linkList = bookingLinks(item.booking);
  const dates = nextDateInfo(item);
  const hasPromo = isPromotion(item.promo);

  const relevantResourceOffers = resourceHits
    .filter(resource => sameEstablishment(resource.establishment, item.name))
    .slice(0, 4)
    .map(resource => ({
      type: clean(resource.type),
      offer: clean(resource.offer),
      price: validResourcePrice(resource.price),
      conditions: clean(resource.conditions),
      source: clean(resource.source),
      date: formatResourceDate(resource.date)
    }));

  return {
    category: canonicalGuideCategory(item),
    name: clean(item.name),
    price: clean(item.price),
    promo: clean(item.promo),
    hasPromotion: hasPromo,
    booking: clean(item.booking),
    bookingLinks: linkList,
    description: clean(item.description),
    notes: clean(item.notes),
    tags: clean(item.tags),
    forWho: clean(item.forWho),
    when: clean(item.when),
    externalResource: clean(item.externalResource || item["Ressource externe"]),
    allDates: dates.allDates,
    nextDate: dates.nextDate,
    promoRequested,
    commercialResourceHighlights: relevantResourceOffers
  };
}

function serializeResource(item) {
  return {
    establishment: canonicalResourceEstablishment(item.establishment),
    type: clean(item.type),
    offer: clean(item.offer),
    price: validResourcePrice(item.price),
    conditions: clean(item.conditions),
    source: clean(item.source),
    date: formatResourceDate(item.date)
  };
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map(item => ({
      role: item.role,
      content: clean(item.content).slice(0, MAX_HISTORY_CHARS_PER_MESSAGE)
    }))
    .filter(item => item.content);
}

function historyText(history = []) {
  if (!history.length) return "Aucun historique.";
  return history
    .map(item => `${item.role === "user" ? "UTILISATEUR" : "MALAGO"}: ${item.content}`)
    .join("\n");
}

function currentContext(question, history, activeResults) {
  const focus = focusNames(question, activeResults, history);
  const guideMatches = searchGuide(question, focus);
  const resources = searchResources(question, focus);
  const promoRequested = intentOf(question).discount;

  // For broad category answers, attach the most relevant resource highlights
  // only when the current question actually asks for detailed commercial info.
  const guide = guideMatches.map(item => serializeGuide(item, promoRequested, resources));

  return {
    focusNames: focus,
    guide,
    resources: resources.map(serializeResource),
    todayMadrid: localMadridDateKey(),
    dataCounts: {
      guideRecords: GUIDE_NORM.length,
      resourceRecords: RESSOURCES.length
    }
  };
}

function promotionBlock(context) {
  const promos = context.guide.filter(item => item.hasPromotion);
  if (!promos.length) return "Aucune promotion explicite dans les résultats actuels. Ne crée jamais de promotion.";

  return promos
    .map(item => `- ${item.name}: ${item.promo}`)
    .join("\n");
}

function commercialLinkBlock(context) {
  const links = [];
  for (const item of context.guide.slice(0, MAX_GUIDE_RESULTS)) {
    for (const link of item.bookingLinks || []) {
      links.push(`- ${item.name}: ${link.label} — ${link.url}`);
    }
  }
  return links.length ? links.join("\n") : "Aucun lien URL disponible pour ces résultats.";
}

async function askAI(question, context, history, env) {
  if (!env?.AI) throw new Error("Workers AI binding AI missing");

  const system = `
Tu es MALAGO, le guide local intelligent et commercial de Málaga.

MISSION
Aider l'utilisateur à découvrir, comparer et réserver des restaurants, clubs,
activités, services et excursions à Málaga.

STYLE COMMERCIAL
- Réponds en français naturel, chaleureux, direct et vendeur sans être agressif.
- Va droit au but.
- Quand une promotion Malago existe dans les résultats, mentionne-la clairement,
  même si l'utilisateur n'a pas demandé la réduction, dès que c'est pertinent.
- Ne confonds jamais promotion et simple prix.
- Si aucune réduction n'existe, ne prétends jamais qu'il y en a une.
- Mets en avant les offres commerciales disponibles: VIP, pack, formule, activité,
  réservation ou excursion.
- Lorsqu'un lien commercial ou WhatsApp est présent, indique à l'utilisateur qu'il
  peut réserver avec le bouton correspondant sous la réponse.
- Ne prétends jamais avoir effectué une réservation.

CONVERSATION
- Tu es conversationnel: l'utilisateur peut dire "et la réduction ?", "et végétarien ?",
  "et le prix ?", "et un autre ?", "et comment réserver ?" sans répéter le nom.
- L'historique aide uniquement à comprendre le contexte et les pronoms.
- Les nouvelles informations factuelles doivent venir du CONTEXTE MALAGO ACTUEL.
- Si l'utilisateur change complètement de sujet, traite la nouvelle question normalement.

FIABILITÉ ABSOLUE
- Source de vérité: uniquement le CONTEXTE MALAGO ACTUEL ci-dessous.
- GUIDE contient les informations générales, prix indicatifs, promotions, horaires,
  public, tags, notes et réservation.
- RESSOURCES contient les détails précis disponibles dans le fichier source:
  produits/offres, menus, prix détaillés, conditions, source et date.
- Tu peux répondre avec une information seulement si elle apparaît dans ces données.
- N'invente jamais un prix, une remise, un plat, un ingrédient, une option végétarienne,
  un horaire, une date, une disponibilité, une adresse ou une caractéristique.
- Un prix indicatif du GUIDE ne doit pas être présenté comme le prix détaillé d'un plat.
- Une valeur de prix qui ressemble à une date dans une ressource n'est PAS un prix fiable:
  ignore-la comme prix et ne la convertis pas en tarif.
- Si une information manque, dis clairement que Malago ne l'a pas encore dans ses données.
- Ne prétends jamais avoir vérifié Internet.
- Ne prétends jamais connaître une disponibilité en temps réel.
- Pour les excursions, distingue toujours les dates passées des prochaines dates connues.
- Pour les promotions, reprends la formulation du GUIDE sans la modifier de manière trompeuse.

RÉPONSE
- Pour une demande de liste, donne les options pertinentes, pas tout le catalogue.
- Pour une demande de détail sur un établissement précis, concentre-toi sur lui.
- Pour une question comparative, compare uniquement les éléments présents dans les données.
- Pour une question "réserver", oriente vers le lien ou le WhatsApp présent dans les données.
- Ne donne pas d'URL brute dans le texte: l'interface affiche les boutons commerciaux.
- Si les données contiennent une promotion, mets-la dans une phrase courte et visible.

PROMOTIONS TROUVÉES
${promotionBlock(context)}

LIENS COMMERCIAUX DISPONIBLES
${commercialLinkBlock(context)}

DATE LOCALE DE MÁLAGA
${context.todayMadrid}

HISTORIQUE DE CONVERSATION
${historyText(history)}

ÉTABLISSEMENT(S) ACTIF(S)
${context.focusNames.join(", ") || "Aucun"}

CONTEXTE MALAGO ACTUEL
${JSON.stringify(context)}
`;

  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: question }
    ],
    max_tokens: 520,
    temperature: 0.2
  });

  const answer = clean(result?.response);
  return answer || "Je n'ai pas trouvé de réponse dans les informations Malago.";
}

function activeResultPayload(context) {
  return context.guide
    .slice(0, MAX_FOCUS)
    .map(item => ({
      name: item.name,
      category: item.category,
      price: item.price,
      promo: item.promo,
      booking: item.booking,
      bookingLinks: item.bookingLinks
    }));
}

function detailPayload(context) {
  return context.resources
    .filter(item => item.offer)
    .slice(0, MAX_RESOURCE_DETAILS)
    .map(item => ({
      establishment: item.establishment,
      type: item.type,
      offer: item.offer,
      price: item.price,
      conditions: item.conditions,
      source: item.source,
      date: item.date
    }));
}

const HTML = `
<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Malago</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f5f5f5;color:#111}
.container{max-width:720px;margin:auto;padding:18px 16px 34px}
.header{padding:8px 4px 16px}
h1{font-size:40px;line-height:1;margin:0 0 6px}
.subtitle{color:#666;font-size:16px}
.chat{display:flex;flex-direction:column;gap:10px;margin-bottom:10px}
.msg{display:flex}.msg.user{justify-content:flex-end}
.bubble{max-width:92%;padding:12px 14px;border-radius:17px;line-height:1.5;white-space:pre-wrap}
.msg.user .bubble{background:#111;color:#fff;border-bottom-right-radius:6px}
.msg.assistant .bubble{background:#fff;border:1px solid #e4e4e4;border-bottom-left-radius:6px}
.cards{display:flex;flex-direction:column;gap:10px;margin:8px 0 12px}
.card{background:#fff;border:1px solid #e5e5e5;border-radius:17px;padding:14px}
.title{font-weight:700;font-size:18px}.meta{color:#666;font-size:13px;margin:3px 0 8px}
.price{font-weight:600;margin-bottom:8px}.promo{background:#f1f1f1;border-radius:11px;padding:9px 11px;font-weight:600;margin-bottom:10px}
.desc{font-size:14px;line-height:1.45;margin-bottom:10px}
.actions{display:flex;gap:8px;flex-wrap:wrap}.actions a{background:#111;color:#fff;text-decoration:none;padding:9px 11px;border-radius:11px;font-size:14px}
.details{background:#fff;border:1px solid #e5e5e5;border-radius:17px;padding:14px;margin:8px 0 12px}
.details h3{font-size:15px;margin:0 0 9px}.detail{padding:8px 0;border-top:1px solid #eee;font-size:13px;line-height:1.4}.detail:first-child{border-top:0}
.composer{position:sticky;bottom:0;background:rgba(245,245,245,.96);padding-top:8px}
.examples{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 10px}.example{background:#fff;color:#111;border:1px solid #ddd;border-radius:999px;padding:8px 11px;font-size:14px}
textarea{width:100%;min-height:84px;padding:14px;border:1px solid #d8d8d8;border-radius:16px;font-size:17px;font-family:inherit;resize:vertical;background:#fff;color:#111;outline:none}
.bar{display:flex;gap:8px;margin-top:8px}.ask{flex:1;background:#111;color:#fff;border:0;border-radius:13px;padding:14px;font-size:16px}.ask:disabled{opacity:.6}.reset{background:#fff;color:#111;border:1px solid #ddd;border-radius:13px;padding:14px}
.status{font-size:13px;color:#777;min-height:17px;margin-top:7px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Malago</h1>
    <div class="subtitle">Ton guide intelligent de Málaga</div>
  </div>

  <div id="chat" class="chat">
    <div class="msg assistant"><div class="bubble">Salut 👋 Je peux te trouver un resto, une soirée, une activité, une excursion ou une voiture. Et tu peux continuer la conversation pour affiner ton choix.</div></div>
  </div>

  <div id="results" class="cards"></div>
  <div id="details" class="details" style="display:none"></div>

  <div class="composer">
    <div class="examples">
      <button class="example" onclick="fillExample('Je cherche un restaurant avec une paella')">Paella</button>
      <button class="example" onclick="fillExample('Quel club est bien pour une grosse soirée ?')">Grosse soirée</button>
      <button class="example" onclick="fillExample('Quelles activités peut-on faire ?')">Activités</button>
      <button class="example" onclick="fillExample('Quels restaurants ont une réduction ?')">Promotions</button>
    </div>

    <textarea id="question" placeholder="Ex. Je cherche un restaurant avec une paella…"></textarea>
    <div class="bar">
      <button id="ask" class="ask" onclick="sendQuestion()">Demander à Malago</button>
      <button class="reset" onclick="resetChat()">Nouveau</button>
    </div>
    <div id="status" class="status"></div>
  </div>
</div>

<script>
let history=[];
let activeResults=[];
let waiting=false;

function fillExample(text){
  const q=document.getElementById('question');
  q.value=text;
  q.focus();
}

function addMessage(role,text){
  const row=document.createElement('div');
  row.className='msg '+role;
  const bubble=document.createElement('div');
  bubble.className='bubble';
  bubble.textContent=text;
  row.appendChild(bubble);
  const chat=document.getElementById('chat');
  chat.appendChild(row);
  row.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function renderResults(items){
  const wrap=document.getElementById('results');
  wrap.innerHTML='';
  if(!Array.isArray(items)||!items.length) return;

  items.forEach(item=>{
    const card=document.createElement('div');
    card.className='card';

    const title=document.createElement('div');
    title.className='title';
    title.textContent=item.name||'';
    card.appendChild(title);

    const meta=document.createElement('div');
    meta.className='meta';
    meta.textContent=item.category||'';
    card.appendChild(meta);

    if(item.price){
      const p=document.createElement('div');
      p.className='price';
      p.textContent=item.price;
      card.appendChild(p);
    }

    if(item.hasPromotion){
      const promo=document.createElement('div');
      promo.className='promo';
      promo.textContent='🔥 Promotion Malago : '+item.promo;
      card.appendChild(promo);
    } else if(item.promoRequested){
      const promo=document.createElement('div');
      promo.className='promo';
      promo.textContent='Aucune réduction indiquée dans les données Malago.';
      card.appendChild(promo);
    }

    if(item.description){
      const d=document.createElement('div');
      d.className='desc';
      d.textContent=item.description;
      card.appendChild(d);
    }

    if(item.nextDate){
      const n=document.createElement('div');
      n.className='desc';
      n.textContent='Prochaine date connue : '+item.nextDate;
      card.appendChild(n);
    }

    const links=Array.isArray(item.bookingLinks)?item.bookingLinks:[];
    if(links.length){
      const actions=document.createElement('div');
      actions.className='actions';
      links.forEach(link=>{
        const a=document.createElement('a');
        a.href=link.url;
        a.target='_blank';
        a.rel='noopener noreferrer';
        a.textContent=link.label||'Ouvrir';
        actions.appendChild(a);
      });
      card.appendChild(actions);
    } else if(item.booking){
      const b=document.createElement('div');
      b.className='desc';
      b.textContent=item.booking;
      card.appendChild(b);
    }

    wrap.appendChild(card);
  });
}

function renderDetails(items){
  const wrap=document.getElementById('details');
  wrap.innerHTML='';
  if(!Array.isArray(items)||!items.length){
    wrap.style.display='none';
    return;
  }

  const heading=document.createElement('h3');
  heading.textContent='Détails trouvés dans les informations Malago';
  wrap.appendChild(heading);

  items.forEach(item=>{
    const line=document.createElement('div');
    line.className='detail';
    const parts=[];
    if(item.establishment) parts.push(item.establishment);
    if(item.type) parts.push(item.type);
    if(item.offer) parts.push(item.offer);
    if(item.price) parts.push(item.price+'€');
    if(item.conditions) parts.push('— '+item.conditions);
    line.textContent=parts.join(' · ');
    wrap.appendChild(line);
  });

  wrap.style.display='block';
}

async function sendQuestion(){
  if(waiting) return;

  const input=document.getElementById('question');
  const question=input.value.trim();
  const status=document.getElementById('status');
  const btn=document.getElementById('ask');

  if(!question){
    status.textContent='Écris ta question.';
    return;
  }

  waiting=true;
  btn.disabled=true;
  btn.textContent='Malago cherche…';
  status.textContent='';

  addMessage('user',question);
  const previousHistory=history.slice();
  history.push({role:'user',content:question});

  try{
    const response=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question,history:previousHistory,activeResults})
    });

    const data=await response.json();

    if(!response.ok) throw new Error(data.error||'Erreur serveur.');

    const answer=data.answer||'Je n’ai pas trouvé de réponse.';
    addMessage('assistant',answer);
    history.push({role:'assistant',content:answer});

    activeResults=Array.isArray(data.activeResults)?data.activeResults:[];
    renderResults(Array.isArray(data.results)?data.results:[]);
    renderDetails(Array.isArray(data.resourceDetails)?data.resourceDetails:[]);

  }catch(error){
    addMessage('assistant',error.message||'Impossible de contacter Malago.');
    status.textContent='Réessaie dans un instant.';
  }finally{
    waiting=false;
    btn.disabled=false;
    btn.textContent='Demander à Malago';
    input.value='';
    input.focus();
  }
}

function resetChat(){
  history=[];
  activeResults=[];
  document.getElementById('chat').innerHTML='<div class="msg assistant"><div class="bubble">Nouvelle conversation. Qu’est-ce que tu cherches à Málaga ?</div></div>';
  document.getElementById('results').innerHTML='';
  document.getElementById('details').innerHTML='';
  document.getElementById('details').style.display='none';
  document.getElementById('status').textContent='';
  document.getElementById('question').value='';
}

document.getElementById('question').addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==='Enter') sendQuestion();
});
</script>
</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response(HTML, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store"
        }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const question = typeof body.question === "string" ? body.question.trim() : "";
        const history = cleanHistory(body.history);
        const activeResults = Array.isArray(body.activeResults)
          ? body.activeResults.slice(0, MAX_FOCUS)
          : [];

        if (!question) {
          return Response.json({ error: "Question vide." }, { status: 400 });
        }

        const context = currentContext(question, history, activeResults);
        const answer = await askAI(question, context, history, env);
        const active = activeResultPayload(context);

        return Response.json({
          answer,
          results: context.guide,
          activeResults: active,
          resourceDetails: detailPayload(context),
          meta: context.dataCounts
        });
      } catch (error) {
        console.error("Malago API error", error);
        return Response.json({ error: "Erreur serveur." }, { status: 500 });
      }
    }

    return new Response("Malago");
  }
};
