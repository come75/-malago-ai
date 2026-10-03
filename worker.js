import { GUIDE, RESSOURCES } from "./data.js";

/* Preview build trigger — V4 Notion site
   ========================================================= */

/* =========================================================
   MALAGO V6 — production V1
   Source of truth: data.js (GUIDE + RESSOURCES)
   Cloudflare binding: env.AI (Workers AI)
   ========================================================= */

const VERSION = "V4";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 1800;
const MAX_QUESTION_CHARS = 1800;
const MAX_BODY_BYTES = 90000;
const MAX_FOCUS = 6;
const MAX_GUIDE_RESULTS = 3;
const MAX_RESOURCE_RESULTS = 30;
const MAX_RESOURCE_DETAILS = 10;

const STOP_WORDS = new Set(`quel quelle quels quelles est sont une un des du de la le les pour avec dans sur ce cette ces peut peut-on faire avoir a à au aux et ou où je me moi nous on il elle ils elles qui comment quoi que y en ça cela ici là ton ta tes mon ma mes notre nos votre vos the what where can for with this that doit dois tu te cherche chercher veux veut voudrais voudrait please tell show give me`.split(/\s+/));

const SYNONYMS = {
  restaurant: ["restaurant", "restaurants", "resto", "restos", "manger", "mange", "repas", "food", "diner", "dîner", "dejeuner", "déjeuner", "eat", "cuisine"],
  nightlife: ["nightlife", "club", "clubs", "boite", "boîtes", "boites", "discotheque", "soirée", "soiree", "sortir", "sortie", "party", "fete", "fête", "night", "after"],
  activity: ["activity", "activities", "activité", "activités", "activite", "activites", "loisir", "loisirs", "buggy", "quad", "parasailing", "bateau", "yacht", "surf", "jetski", "jet ski", "jet-ski", "nautique", "nautiques", "sport", "mer"],
  excursion: ["excursion", "excursions", "voyage", "voyages", "weekend", "week-end", "trip", "trips", "maroc", "algarve", "portugal", "chefchaouen", "tanger", "tetouan", "palmar"],
  discount: ["reduction", "réduction", "reductions", "réductions", "promo", "promotion", "promotions", "discount", "discounts", "offre", "offres", "remise", "avantage", "bon plan", "pourcentage"],
  vegetarian: ["vegetarien", "végétarien", "vegetarienne", "végétarienne", "vegetariens", "vegetariennes", "vegetarian", "vegetarians", "vegan", "vegane", "végane", "vegetal", "sans viande"],
  gluten: ["gluten", "sans gluten", "gluten-free", "celiaque", "coeliaque"],
  menu: ["menu", "carte", "plat", "plats", "entrée", "entree", "dessert", "tapas", "paella", "sushi", "noodles", "burger", "pates", "pâtes", "viande", "poisson", "pizza", "desserts"],
  price: ["prix", "tarif", "combien", "cout", "coût", "cher", "chere", "cheap", "budget", "euros", "euro"],
  vip: ["vip", "bouteille", "bouteilles", "table", "backstage", "premium", "show", "pack"],
  booking: ["reserver", "réserver", "reservation", "réservation", "reserve", "réserve", "booking", "book", "lien", "acheter", "ticket"],
  hours: ["horaire", "horaires", "heure", "heures", "ouvert", "ouverte", "ouvre", "ferme", "fermeture"],
  date: ["date", "dates", "quand", "prochaine", "prochain", "disponible", "disponibilité", "disponibilite"],
  another: ["autre", "autres", "encore", "different", "différente", "deuxieme", "deuxième", "alternatif", "même style", "meme style", "même genre", "meme genre", "similaire", "similaires", "pareil", "pareille", "semblable", "semblables", "dans le meme style", "dans le même style"]
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
  ["cosa nostra", "CosaNuestra"], ["cosa nuestra", "CosaNuestra"],
  ["bro club", "Bro"], ["brø", "Bro"], ["brø club", "Bro"],
  ["santa", "Santa Rita"],
  ["los marangos", "Los Marangós Plaza Camas"], ["los marangós", "Los Marangós Plaza Camas"],
  ["jose herencia", "José, Herencia de Cocina"], ["jose, herencia", "José, Herencia de Cocina"],
  ["taro", "Taró"], ["tuk tuk", "TukTuk Noodles"], ["tuktuk", "TukTuk Noodles"],
  ["sushi flower", "Sushi Flower - Teatinos"], ["la caverna", "La Caverna | Gastro-Taberna Andaluza"],
  ["canela y clavo", "Canela y Clavo"], ["tapearte", "Tapearte"], ["silencio", "Silencio Beach Club"],
  ["water activities", "Jet Ski, Boat & Water Activities"], ["activites nautiques", "Jet Ski, Boat & Water Activities"],
  ["activités nautiques", "Jet Ski, Boat & Water Activities"], ["jet ski", "Jet Ski, Boat & Water Activities"], ["jet-ski", "Jet Ski, Boat & Water Activities"],
  ["buggy", "Quad / Buggy"], ["quad", "Quad / Buggy"], ["surf", "Día de Surf en El Palmar"],
  ["maroc", "El Norte de Marruecos & la Ciudad Azul"], ["algarve", "Algarve Paradise Weekend"],
  ["voiture", "Location de voiture"], ["location voiture", "Location de voiture"]
]);

const GUIDE_NORM = GUIDE.map(item => ({ ...item, category: canonicalGuideCategory(item) }));

function clean(value) { return value === null || value === undefined ? "" : String(value).trim(); }

function sanitizeText(value, max = MAX_QUESTION_CHARS) {
  return clean(value).replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}

function normalize(text = "") {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9€%]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text = "") { return normalize(text).split(/\s+/).filter(Boolean).filter(word => word.length > 2 && !STOP_WORDS.has(word)); }

function hasAny(text, terms) {
  const q = normalize(text); const words = new Set(tokens(q));
  return terms.some(term => { const t = normalize(term); return t.includes(" ") ? (` ${q} `).includes(` ${t} `) : words.has(t); });
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
  const q = normalize(query); const base = new Set(tokens(q)); const expanded = new Set(base);
  for (const group of Object.values(SYNONYMS)) {
    const normalized = group.map(normalize);
    const found = normalized.some(term => term.includes(" ") ? (` ${q} `).includes(` ${term} `) : base.has(term));
    if (found) normalized.forEach(term => expanded.add(term));
  }
  return expanded;
}

function intentOf(query) {
  const q = normalize(query);
  return {
    restaurant: hasAny(q, SYNONYMS.restaurant), nightlife: hasAny(q, SYNONYMS.nightlife), activity: hasAny(q, SYNONYMS.activity), excursion: hasAny(q, SYNONYMS.excursion),
    discount: hasAny(q, SYNONYMS.discount), vegetarian: hasAny(q, SYNONYMS.vegetarian), gluten: hasAny(q, SYNONYMS.gluten), menu: hasAny(q, MENU_REQUEST_TERMS),
    price: hasAny(q, SYNONYMS.price), vip: hasAny(q, SYNONYMS.vip), booking: hasAny(q, SYNONYMS.booking), hours: hasAny(q, SYNONYMS.hours), date: hasAny(q, SYNONYMS.date), another: hasAny(q, SYNONYMS.another),
    broad: /^(quel|quels|quelle|quelles|que|quoi|donne|montre|cherche|voir|liste)\b/.test(q) || /^je veux\b/.test(q)
  };
}

function detectMentionedNames(text = "") {
  const q = normalize(text); const padded = ` ${q} `; const found = [];
  for (const item of GUIDE_NORM) { const n = normalize(item.name); if (n && padded.includes(` ${n} `)) found.push(item.name); }
  for (const [alias, canonical] of NAME_ALIASES.entries()) { const a = normalize(alias); if (a && padded.includes(` ${a} `)) found.push(canonical); }
  return [...new Set(found)];
}

function extractHistoryNames(history = []) { return [...new Set(history.slice(-MAX_HISTORY_MESSAGES).flatMap(m => detectMentionedNames(m.content)))]; }

function conversationSearchQuery(question = "", history = []) {
  const userMessages = Array.isArray(history)
    ? history.filter(m => m?.role === "user" && typeof m.content === "string").slice(-MAX_HISTORY_MESSAGES).map(m => clean(m.content))
    : [];
  const all = [...userMessages, clean(question)].filter(Boolean);
  return all.join(" ");
}

function looksLikeRefinement(intent) {
  return (intent.discount || intent.vegetarian || intent.gluten || intent.price || intent.vip || intent.booking || intent.hours || intent.date || intent.menu) && !intent.restaurant && !intent.nightlife && !intent.activity && !intent.excursion;
}

function focusNames(question, activeResults = [], history = []) {
  const explicit = detectMentionedNames(question); if (explicit.length) return explicit.slice(0, MAX_FOCUS);
  const active = Array.isArray(activeResults) ? activeResults.map(x => clean(x?.name)).filter(Boolean) : [];
  const intent = intentOf(question); const q = normalize(question);
  const follow = looksLikeRefinement(intent) || intent.another || /^(et|mais|du coup|donc|alors|et pour|et au fait)\b/.test(q) || /\b(ce resto|ce restaurant|ce club|celui|celle|eux|elles|ils|il|elle)\b/.test(q);
  if (!follow) return [];
  return [...new Set([...active, ...extractHistoryNames(history)])].slice(0, MAX_FOCUS);
}

function canonicalResourceEstablishment(name) {
  const n=normalize(name);
  if(n==="br"||n==="bro"||n==="bro club") return "Bro";
  if(n==="silencio") return "Silencio Beach Club";
  if(n==="activites nautiques"||n==="activités nautiques"||n==="jet ski boat water activities") return "Jet Ski, Boat & Water Activities";
  if(n==="los marangos plaza camas") return "Los Marangós Plaza Camas";
  return clean(name);
}
function sameEstablishment(a,b){return normalize(canonicalResourceEstablishment(a))===normalize(canonicalResourceEstablishment(b));}
function suspiciousPrice(value){return /^20\d{2}-\d{2}-\d{2}(?:T|$)/.test(clean(value));}
function validResourcePrice(value){const v=clean(value);return !v||suspiciousPrice(v)?"":v;}

function detectCategoryFromText(text="") {
  const q=normalize(text);
  if(hasAny(q,SYNONYMS.restaurant) || /\b(paella|sushi|noodles|tapas|pizza|burger|pates|pâtes|plat|plats|carte|menu)\b/i.test(q)) return "Restaurant";
  if(hasAny(q,SYNONYMS.nightlife)) return "Party";
  if(hasAny(q,SYNONYMS.activity)) return "Activity";
  if(hasAny(q,SYNONYMS.excursion)) return "Excursions";
  return "";
}

const MENU_REQUEST_TERMS=["menu","carte","carta","voir la carte","voir le menu","envoie le menu","envoyer le menu","send the menu","show me the menu","menu complet"];
const PRODUCT_TERMS=["paella","sushi","noodles","burger","pizza","tapas","pâtes","pates","jet ski","jetski","bateau","boat","yacht","parasailing","buggy","quad","surf"];
const DIET_TERMS=["vegetarien","végétarien","vegetarienne","végétarienne","vegetariens","vegetariennes","vegetarian","vegetarians","vegan","vegane","végane","sans viande","gluten","sans gluten"];

function detectProductTerms(text="") {
  const q=` ${normalize(text)} `;
  return PRODUCT_TERMS.filter(term=>q.includes(` ${normalize(term)} `));
}
function detectDietTerms(text="") {
  const q=` ${normalize(text)} `;
  return DIET_TERMS.filter(term=>q.includes(` ${normalize(term)} `));
}
function uniqueCanonical(names=[]) {
  return [...new Set(names.map(canonicalResourceEstablishment).filter(Boolean))];
}
function userMessages(history=[],question="") {
  return [...history.filter(x=>x?.role==="user").map(x=>clean(x.content)),clean(question)].filter(Boolean);
}
function activeCriteria(question="",history=[]){
  const messages=userMessages(history,question);
  const last=messages[messages.length-1]||"";
  const lastCategory=detectCategoryFromText(last);
  let relevant=messages;
  if(lastCategory){
    let start=messages.length-1;
    for(let i=messages.length-2;i>=0;i--){
      const c=detectCategoryFromText(messages[i]);
      if(c && c!==lastCategory) break;
      if(c===lastCategory) start=i;
    }
    relevant=messages.slice(start);
  }
  const combined=relevant.join(" ");
  const category=lastCategory||detectCategoryFromText(combined);
  const products=uniqueList(relevant.flatMap(detectProductTerms));
  const diets=uniqueList(relevant.flatMap(detectDietTerms));
  const intent=relevant.map(intentOf).reduce((acc,x)=>({
    restaurant:acc.restaurant||x.restaurant,nightlife:acc.nightlife||x.nightlife,activity:acc.activity||x.activity,excursion:acc.excursion||x.excursion,
    discount:acc.discount||x.discount,vegetarian:acc.vegetarian||x.vegetarian,gluten:acc.gluten||x.gluten,menu:acc.menu||x.menu,
    price:acc.price||x.price,vip:acc.vip||x.vip,booking:acc.booking||x.booking,hours:acc.hours||x.hours,date:acc.date||x.date
  }),{});
  return {category,products,diets,intent,messages:relevant};
}
function uniqueList(arr){return [...new Set(arr)];}
function lastExplicitNames(question="",history=[]) {
  return uniqueCanonical([...history.flatMap(x=>detectMentionedNames(x.content)),...detectMentionedNames(question)]);
}
function activeExcluded(question,history,activeResults,another) {
  if(!another) return [];
  const active=Array.isArray(activeResults)?activeResults.map(x=>x?.name).filter(Boolean):[];
  const names=lastExplicitNames(question,history);
  return uniqueCanonical([...active,...names]);
}
function isAnotherRequest(question="") { return intentOf(question).another; }

function resourceText(item){ return normalize([item.establishment,item.type,item.offer,item.conditions].join(" ")); }
function resourceMatchesTerm(item,term){
  const text=resourceText(item), t=normalize(term);
  if(t.includes("paella")) return /\bpaella\b/.test(text);
  if(t.includes("sushi")) return /\bsushi\b|\bmaki\b|\btemaki\b|\bpoke\b/.test(text);
  if(t.includes("noodles")) return /noodles|pad thai|wok/.test(text);
  if(t.includes("burger")) return /burger|hamburguesa/.test(text);
  if(t.includes("pizza")) return /pizza/.test(text);
  if(t.includes("tapas")) return /tapas/.test(text);
  if(t.includes("pates")) return /pates|pasta|spaghetti|macaroni/.test(text);
  if(t.includes("jet ski")||t==="jetski") return /jet ski|jetski/.test(text);
  if(t.includes("bateau")||t.includes("boat")) return /bateau|boat/.test(text);
  if(t.includes("yacht")) return /yacht/.test(text);
  if(t.includes("parasailing")) return /parasail/.test(text);
  if(t.includes("buggy")) return /buggy/.test(text);
  if(t.includes("quad")) return /quad/.test(text);
  if(t.includes("surf")) return /surf/.test(text);
  if(t.includes("gluten")) return /gluten|celiac|celiaco/.test(text);
  if(/vegetar|vegan|sans viande/.test(t)) {
    if(/carne|pollo|ternera|cerdo|jamon|chorizo|atun|anchoa|gamba|langostino|pescado|marisco|bacon|calamar|pulpo|boqueron/.test(text)) return false;
    return /vegetar|vegan|verdura|verduras|veggie|legumbre|legumes|pimiento|pimientos|berenjena|berenjenas|tortilla de patatas|lasagna de verdura|burger vegana|parrillada de verduras/.test(text);
  }
  return text.includes(t);
}
function resourceGroupsByCriteria(criteria,exclude=[]) {
  const excluded=new Set(exclude.map(normalize));
  const required=[...criteria.products,...criteria.diets];
  const groups=new Map();
  for(const item of RESSOURCES){
    const est=canonicalResourceEstablishment(item.establishment); if(!est||excluded.has(normalize(est))) continue;
    if(required.length && !required.every(term=>RESSOURCES.some(r=>sameEstablishment(r.establishment,est)&&resourceMatchesTerm(r,term))) ) continue;
    if(!groups.has(est)) groups.set(est,[]);
    const arr=groups.get(est);
    if(required.some(term=>resourceMatchesTerm(item,term))) arr.push(item);
  }
  return groups;
}
function evidenceForEstablishment(est,criteria,limit=8){
  const required=[...criteria.products,...criteria.diets];
  let rows=RESSOURCES.filter(r=>sameEstablishment(r.establishment,est));
  if(required.length) rows=rows.filter(r=>required.some(term=>resourceMatchesTerm(r,term)));
  return dedupeResources(rows).slice(0,limit);
}
function guideByEstablishment(est){ return GUIDE_NORM.find(x=>normalize(x.name)===normalize(est)); }
function categoryMatches(item,category){ return !category || canonicalGuideCategory(item)===category; }

function searchCatalog(criteria,question,history,activeResults){
  const another=isAnotherRequest(question);
  const excluded=activeExcluded(question,history,activeResults,another);
  const category=criteria.category || (criteria.products.length||criteria.diets.length ? "Restaurant" : "");
  const resourceGroups=resourceGroupsByCriteria(criteria,excluded);
  let candidates=[];
  for(const [est,evidence] of resourceGroups){
    const guide=guideByEstablishment(est);
    if(!guide || !categoryMatches(guide,category)) continue;
    candidates.push({guide,evidence});
  }
  // If this is a refinement about the current establishment, keep that establishment even when
  // the new message contains no standalone product term.
  const focusNames=Array.isArray(activeResults)?activeResults.map(x=>clean(x?.name)).filter(Boolean):[];
  const refinement=!another && focusNames.length && (criteria.diets.length || criteria.intent.price || criteria.intent.menu || criteria.intent.discount || criteria.intent.booking);
  if(refinement){
    const focused=focusNames.map(guideByEstablishment).filter(Boolean).filter(g=>categoryMatches(g,category));
    candidates=focused.map(guide=>({guide,evidence:evidenceForEstablishment(guide.name,criteria)})).filter(x=>!criteria.products.length || x.evidence.some(r=>resourceMatchesTerm(r,criteria.products[0])));
  }
  // Broad category query without product/diet constraint: use GUIDE only, never dump the whole base.
  if(!criteria.products.length && !criteria.diets.length && !candidates.length && category){
    candidates=GUIDE_NORM.filter(g=>categoryMatches(g,category)).slice(0,MAX_GUIDE_RESULTS).map(guide=>({guide,evidence:[]}));
  }
  // For an "another" request, never return the currently shown establishment.
  if(another) candidates=candidates.filter(x=>!excluded.some(n=>sameEstablishment(n,x.guide.name)));
  return {candidates:candidates.slice(0,MAX_GUIDE_RESULTS),excluded,another,category};
}

function scoreResource(item, query, qTokens, focus) {
  const text=normalize([item.establishment,item.type,item.offer,validResourcePrice(item.price),item.conditions,item.source,item.date].join(" ")); const words=new Set(tokens(text)); let score=0;
  for(const word of qTokens) if(words.has(word)) score++;
  for(const name of focus) if(sameEstablishment(item.establishment,name)) score+=22;
  return score;
}
function dedupeResources(items){const seen=new Set();return items.filter(item=>{const key=[item.establishment,item.type,item.offer,validResourcePrice(item.price),item.conditions].map(clean).join("|");if(seen.has(key))return false;seen.add(key);return true;});}
function searchResources(question,focus=[],options={}){
  const criteria=options.criteria||activeCriteria(question,[]); const terms=[...criteria.products,...criteria.diets];
  if(!terms.length && !criteria.intent.menu && !criteria.intent.price && !criteria.intent.vip) return [];
  const excluded=new Set((options.exclude||[]).map(normalize));
  let rows=RESSOURCES.filter(r=>!excluded.has(normalize(canonicalResourceEstablishment(r.establishment))));
  if(focus.length && !options.includeAll){const f=new Set(focus.map(normalize));rows=rows.filter(r=>f.has(normalize(canonicalResourceEstablishment(r.establishment))));}
  if(terms.length){
    const validEst=new Set();
    for(const r of rows){ if(terms.every(t=>RESSOURCES.some(x=>sameEstablishment(x.establishment,r.establishment)&&resourceMatchesTerm(x,t)))) validEst.add(normalize(canonicalResourceEstablishment(r.establishment))); }
    rows=rows.filter(r=>validEst.has(normalize(canonicalResourceEstablishment(r.establishment))) && terms.some(t=>resourceMatchesTerm(r,t)));
  }
  if(criteria.intent.vegetarian) rows=rows.filter(r=>resourceMatchesTerm(r,"vegetarien"));
  if(criteria.intent.gluten) rows=rows.filter(r=>resourceMatchesTerm(r,"gluten"));
  return dedupeResources(rows).slice(0,MAX_RESOURCE_RESULTS);
}

function extractUrls(text="") { return [...new Set((String(text).match(/https?:\/\/[^\s|]+/gi)||[]).map(url=>url.replace(/[),.;]+$/g,"")))]; }
function isPromotion(value){const v=normalize(value);return Boolean(v&&v!=="non"&&v!=="-");}
function extractDates(text=""){return [...new Set(String(text).match(/\b\d{2}\/\d{2}\/\d{4}\b/g)||[])];}
function localMadridDateKey(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function dateKey(date){const m=String(date).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;}
function nextDateInfo(item){const dates=extractDates([item.when,item.notes,item.description].join(" ")).map(display=>({display,key:dateKey(display)})).filter(x=>x.key).sort((a,b)=>a.key.localeCompare(b.key));const today=localMadridDateKey();return{allDates:dates.map(x=>x.display),nextDate:dates.find(x=>x.key>=today)?.display||null};}
function formatResourceDate(value){const v=clean(value);const m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:v;}

function formatGuidePrice(){ return ""; }
function restaurantCategory(category){ return canonicalGuideCategory({category}) === "Restaurant"; }
function guideNamesFromResources(resources){ return [...new Set(resources.map(r=>canonicalResourceEstablishment(r.establishment)).filter(Boolean))]; }
function formatPromotion(value="") {
  const v=clean(value).replace(/du\s+Samedi\s+Au\s+lundi/gi,"du samedi au lundi").replace(/du\s+samedi\s+au\s+lundi/gi,"du samedi au lundi").replace(/\s+/g," ").trim();
  if(!v) return "";
  if(/-50%/.test(v)&&/-30%/.test(v)) return "Réduction de 30 à 50 % selon le jour et le service";
  return v.replace(/-50%/g,"-50 %").replace(/-30%/g,"-30 %");
}
function menuLinks(item){const candidates=[item.menu,item.menuUrl,item.menuURL,item.carte,item.carteUrl,item.menuLink].filter(Boolean);return extractUrls(candidates.join(" ")).map(url=>({url,label:"Voir le menu",kind:"menu"}));}
function bookingLinks(booking=""){return extractUrls(booking).map(url=>{const u=url.toLowerCase();let label="Ouvrir",kind="booking";if(u.includes("wa.me")){label="WhatsApp";kind="whatsapp";}else if(/bookeo|fourvenues|whan\.es|enterticket|malagasouthexperiences/.test(u))label=u.includes("malagasouthexperiences")?"Voir l’excursion":"Réserver";return{url,label,kind};});}
function serializeGuide(item,resourceHits=[]){const dates=nextDateInfo(item);return{category:canonicalGuideCategory(item),name:clean(item.name),promo:formatPromotion(item.promo),hasPromotion:isPromotion(item.promo),booking:clean(item.booking),bookingLinks:bookingLinks(item.booking),menuLinks:menuLinks(item),description:clean(item.description),when:clean(item.when),allDates:dates.allDates,nextDate:dates.nextDate,evidence:resourceHits.filter(r=>sameEstablishment(r.establishment,item.name)).slice(0,8).map(r=>({type:clean(r.type),offer:clean(r.offer),price:validResourcePrice(r.price),conditions:clean(r.conditions)}))};}
function serializeResource(item){return{establishment:canonicalResourceEstablishment(item.establishment),type:clean(item.type),offer:clean(item.offer),price:validResourcePrice(item.price),conditions:clean(item.conditions)};}
function cleanHistory(history){if(!Array.isArray(history))return[];return history.filter(x=>x&&(x.role==="user"||x.role==="assistant")&&typeof x.content==="string").slice(-MAX_HISTORY_MESSAGES).map(x=>({role:x.role,content:sanitizeText(x.content,MAX_HISTORY_CHARS)})).filter(x=>x.content);}
function currentContext(question,history,activeResults){
  const criteria=activeCriteria(question,history);
  const search=searchCatalog(criteria,question,history,activeResults);
  const focus=Array.isArray(activeResults)?activeResults.map(x=>clean(x?.name)).filter(Boolean):[];
  const resourceFocus=focus.length && !search.another ? focus : search.candidates.map(x=>x.guide.name);
  const resources=searchResources(question,resourceFocus,{criteria,exclude:search.excluded,includeAll:!resourceFocus.length});
  const guide=search.candidates.map(x=>serializeGuide(x.guide,x.evidence.length?x.evidence:resources));
  return {criteria,another:search.another,excluded:search.excluded,category:search.category,guide,resources:resources.map(serializeResource),todayMadrid:localMadridDateKey(),dataCounts:{guideRecords:GUIDE_NORM.length,resourceRecords:RESSOURCES.length}};
}
function promotionBlock(context){const promos=context.guide.filter(x=>x.hasPromotion);return promos.length?promos.map(x=>`- ${x.name}: ${x.promo}`).join("\n"):"Aucune promotion explicite dans les résultats actuels.";}
function commercialLinkBlock(context){const links=[];for(const item of context.guide.slice(0,MAX_GUIDE_RESULTS))for(const link of item.bookingLinks||[])links.push(`- ${item.name}: ${link.label}`);return links.length?links.join("\n"):"Aucun lien commercial disponible.";}
function languageOf(text=""){
  const q=normalize(text); const fr=["je","cherche","restaurant","avec","et","options","vegetarien","autre","reservation","prix","reduction","menu","combien","pour","personnes"]; const es=["busco","restaurante","con","opciones","vegetariano","otro","reserva","precio","descuento","menu","cuanto"]; const en=["i","looking","restaurant","with","options","vegetarian","another","book","price","discount","menu","how much"];
  const score=arr=>arr.reduce((n,w)=>n+(q.split(" ").includes(w)?1:0),0); const scores={fr:score(fr),es:score(es),en:score(en)}; return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0]||"fr";
}
function money(value){const n=Number(String(value).replace(",","."));if(!Number.isFinite(n))return clean(value);const fixed=n.toFixed(2);return `${fixed.replace(".",",")} €`;}
function evidenceFor(context,est,terms){let rows=RESSOURCES.filter(r=>sameEstablishment(r.establishment,est));if(terms.length)rows=rows.filter(r=>terms.some(t=>resourceMatchesTerm(r,t)));return dedupeResources(rows).slice(0,10);}
function catalogFacts(context){
  const terms=[...context.criteria.products,...context.criteria.diets];
  return context.guide.map(g=>({g,rows:evidenceFor(context,g.name,terms)}));
}
function firstNumericPrice(rows){for(const r of rows){const v=validResourcePrice(r.price);const n=Number(String(v).replace(",","."));if(Number.isFinite(n))return n;}return null;}
function promotionRange(promo){const v=normalize(promo);const rates=[];if(v.includes("50"))rates.push(0.5);if(v.includes("30"))rates.push(0.3);return rates.length?{min:Math.min(...rates),max:Math.max(...rates)}:null;}
function calculationLine(price,promo,people){const range=promotionRange(promo);if(!Number.isFinite(price)||!range)return "";const low=price*(1-range.max),high=price*(1-range.min);if(Number.isFinite(people)&&people>0){return `Pour ${people} personne${people>1?"s":""}, cela représente environ ${money(low*people)} à ${money(high*people)} au total avec la réduction, selon le jour et le service.`;}return `Avec la réduction, la paella revient environ à ${money(low)} à ${money(high)} par personne selon le jour et le service.`;}
function extractPeople(question="",history=[]){const text=[...history.map(x=>x.content||""),question].join(" ");const m=normalize(text).match(/(?:pour|on est|nous sommes|nous serons|a|à)\s*(\d{1,2})\s*(?:personne|personnes|pers|pax)?\b/);return m?Number(m[1]):null;}

function buildCatalogAnswer(question,context){
  const lang=languageOf(question), facts=catalogFacts(context), first=facts[0];
  if(context.another && !facts.length){
    if(lang==="es") return "No tengo otro restaurante confirmado en el catálogo Malago que cumpla todos los criterios que has dado. Prefiero no inventarte una opción.";
    if(lang==="en") return "I don't have another confirmed restaurant in the Malago catalog that matches all your criteria. I prefer not to invent an option.";
    return "Je n’ai pas d’autre restaurant confirmé dans le catalogue Malago qui corresponde à tous tes critères. Je préfère ne pas t’inventer une adresse.";
  }
  if(!facts.length){
    if(lang==="es") return "No he encontrado una opción confirmada en el catálogo Malago que corresponda a tu búsqueda.";
    if(lang==="en") return "I couldn't find a confirmed option in the Malago catalog that matches your search.";
    return "Je n’ai pas trouvé d’option confirmée dans le catalogue Malago qui corresponde à ta recherche.";
  }
  const g=first.g, rows=first.rows, productRows=rows.filter(r=>context.criteria.products.some(t=>resourceMatchesTerm(r,t))), dietRows=rows.filter(r=>context.criteria.diets.some(t=>resourceMatchesTerm(r,t)));
  if(context.criteria.intent.menu){
    const menu=g.menuLinks?.length?"MENU_LINK":"NO_MENU_LINK";
    if(menu==="MENU_LINK"){
      if(lang==="es") return `Claro. Te dejo el menú de **${g.name}** en el botón de abajo. Si me dices el día, la hora y cuántas personas sois, también puedo ayudarte con la reserva.`;
      if(lang==="en") return `Of course. The menu for **${g.name}** is available from the button below. If you tell me the day, time and number of people, I can also help with the reservation.`;
      return `Bien sûr. Le menu de **${g.name}** est disponible avec le bouton sous la réponse. Si tu me donnes le jour, l’heure et le nombre de personnes, je peux aussi t’aider pour la réservation.`;
    }
    if(lang==="es") return `No tengo el menú completo de **${g.name}** registrado como documento o enlace. Aun así, puedo darte los platos concretos que tengo registrados si quieres.`;
    if(lang==="en") return `I don't have the full menu for **${g.name}** saved as a document or link. I can still give you the specific dishes I have recorded if you want.`;
    return `Je n’ai pas le menu complet de **${g.name}** enregistré comme document ou lien. Je peux quand même te donner les plats précis que j’ai enregistrés si tu veux.`;
  }
  const productLines=productRows.slice(0,3).map(r=>{
    const label=resourceMatchesTerm(r,"paella")?"Paella":r.offer;
    const p=validResourcePrice(r.price);
    return label+(p?" : "+money(p):"");
  });
  const dietLines=dietRows.slice(0,6).map(r=>{
    const p=validResourcePrice(r.price);
    return r.offer+(p?" : "+money(p):"");
  });
  const promo=g.promo?`\n🔥 ${g.promo}`:"";
  const mainPrice=firstNumericPrice(productRows);
  const people=extractPeople(question,context.criteria.messages.map(content=>({content})));
  const calc=mainPrice!==null?calculationLine(mainPrice,g.promo,people):"";
  const reservation=g.bookingLinks?.length?"\n\nTu peux réserver avec le bouton sous la réponse.":"";
  const ask="\n\nSi tu me donnes le jour, l’heure et le nombre de personnes, je peux te calculer le prix estimé avec l’offre applicable et t’aider à réserver.";
  if(lang==="es"){
    let out=`Te recomiendo **${g.name}**.`;
    if(productLines.length) out+=`\n\n🍽️ ${productLines.join(" · ")}`;
    if(dietLines.length) out+=`\n🌱 Opciones vegetarianas confirmadas: ${dietLines.join(" · ")}`;
    if(promo) out+=promo;
    if(calc) out+=`\n🧮 ${calc}`;
    out+=reservation+ask; return out;
  }
  if(lang==="en"){
    let out=`I'd recommend **${g.name}**.`;
    if(productLines.length) out+=`\n\n🍽️ ${productLines.join(" · ")}`;
    if(dietLines.length) out+=`\n🌱 Confirmed vegetarian options: ${dietLines.join(" · ")}`;
    if(promo) out+=promo;
    if(calc) out+=`\n🧮 ${calc}`;
    out+=reservation+ask; return out;
  }
  let out=`Je te recommande **${g.name}**.`;
  if(productLines.length) out+=`\n\n🍽️ ${productLines.join(" · ")}`;
  if(dietLines.length) out+=`\n🌱 Options végétariennes confirmées : ${dietLines.join(" · ")}`;
  if(promo) out+=`\n🔥 ${g.promo}`;
  if(calc) out+=`\n🧮 ${calc}`;
  out+=reservation+ask; return out;
}
function isCatalogRequest(context){return Boolean(context.category||context.criteria.products.length||context.criteria.diets.length||context.criteria.intent.menu||context.criteria.intent.price||context.criteria.intent.discount||context.criteria.intent.booking||context.another);}
function buildSystemPrompt(question,context){return `Tu es MALAGO, guide local intelligent de Málaga. Réponds dans la langue de l'utilisateur, naturellement et brièvement.\n\nRÈGLES ABSOLUES\n- Les établissements autorisés sont UNIQUEMENT ceux présents dans CONTEXTE GUIDE. N'en invente jamais.\n- N'ajoute aucun prix, plat, offre, horaire, adresse, disponibilité ou caractéristique absente du contexte.\n- Les données RESSOURCES sont internes : ne montre jamais source, date, JSON, scores ou champs techniques.\n- Ne montre jamais le prix moyen du GUIDE.\n- Pour un produit précis, utilise uniquement le prix précis de RESSOURCES.\n- Si aucun établissement ne correspond, dis-le. N'invente jamais une alternative.\n- « Un autre » conserve toutes les contraintes actives et exclut les établissements déjà proposés.\n- Ne prétends jamais qu'une réservation ou disponibilité est confirmée.\n\nCONTEXTE GUIDE\n${JSON.stringify(context.guide,null,2)}\n\nRESSOURCES PERTINENTES\n${JSON.stringify(context.resources,null,2)}\n\nDEMANDE\n${question}`;}

function extractAIText(result){if(typeof result==="string")return result.trim();for(const candidate of [result?.response,result?.result?.response,result?.output_text])if(typeof candidate==="string"&&candidate.trim())return candidate.trim();return "";}
function stripLeakage(answer){let out=clean(answer);const markers=["CONTEXTE MALAGO","RESSOURCES PERTINENTES","PROMOTIONS DISPONIBLES","LIENS DISPONIBLES","focusNames","bookingLinks","GUIDE:","RESSOURCES:"];const positions=markers.map(m=>out.indexOf(m)).filter(p=>p>=0);if(positions.length)out=out.slice(0,Math.min(...positions)).trim();return out.replace(/\n{3,}/g,"\n\n").trim();}
async function askAI(question,context,history,env){
  if(isCatalogRequest(context)) return buildCatalogAnswer(question,context);
  if(!env?.AI) throw new Error("Workers AI binding AI missing");
  const system=buildSystemPrompt(question,context);
  const messages=[{role:"system",content:system},...history.map(x=>({role:x.role,content:x.content})),{role:"user",content:question}];
  const result=await env.AI.run(MODEL,{messages,max_tokens:420,temperature:0.15});
  return stripLeakage(extractAIText(result))||"Je n’ai pas trouvé suffisamment d’informations dans le guide Malago.";
}
function activeResultPayload(context){return context.guide.slice(0,MAX_FOCUS).map(item=>({name:item.name,category:item.category,promo:item.promo,bookingLinks:item.bookingLinks,menuLinks:item.menuLinks}));}
function detailPayload(){return [];}
function json(data,status=200,extraHeaders={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extraHeaders}});}

const HTML="";

const NOTION_VERSION="2025-09-03";
const NOTION_DATA_SOURCE_ID="43dd83a7-a18a-461c-9bb8-9cd9e79376df";
const NOTION_CATEGORY_MAP={"Party":"Party","Activité":"Activity","Cocktail Bar / Restaurant":"Restaurant","Restaurants":"Restaurant","Service":"Services"};
function notionText(v){if(v==null)return "";if(typeof v==="string")return v;if(Array.isArray(v))return v.map(x=>x?.plain_text||x?.text?.content||x?.name||"").join("").trim();if(v?.title)return notionText(v.title);if(v?.rich_text)return notionText(v.rich_text);if(v?.select)return v.select?.name||"";return "";}
function notionLinks(text,category){const out=[];const raw=String(text||"").match(/https?:\/\/[^\s)]+/g)||[];raw.forEach(u=>{const clean=u.replace(/[.,;]+$/,"");if(out.some(x=>x.url===clean))return;const low=String(text||"").toLowerCase();let label="Réserver";if(category==="Party" && low.includes("whatsapp") && clean.includes("wa.me")) label="Réserver VIP";else if(category==="Party" && (low.includes("fourvenues")||low.includes("ticket"))) label="Réserver un ticket";out.push({label,url:clean});});return out;}
function mapNotionRow(row){const p=row?.properties||{};const name=notionText(p["Élément à intégrer au guide"]);if(!name)return null;const category=NOTION_CATEGORY_MAP[notionText(p["Catégorie"])]||notionText(p["Catégorie"]);const promo=notionText(p["Offre Promo"]);const bookingLinks=notionLinks(notionText(p["Comment Reserver"]),category);const menu=notionText(p["Carte / Formules"]);const lat=Number(p["Latitude"]?.number),lon=Number(p["Longitude"]?.number);return {name,category,promo,hasPromotion:isPromotion(promo),description:notionText(p["Description généraliste"]),when:notionText(p["Quand ?"]),address:notionText(p["Adresse"]),bookingLinks,notes:notionText(p["Notes"]),audience:notionText(p["Pour Qui ?"]),price:notionText(p["Prix (moyen. sans reduc)"]),tags:notionText(p["Tags"]),menu,coordinates:Number.isFinite(lat)&&Number.isFinite(lon)?[lat,lon]:null};}
async function fetchNotionPartners(env){const token=env?.NOTION_TOKEN;if(!token)throw new Error("Missing NOTION_TOKEN secret");const ds=env?.NOTION_DATA_SOURCE_ID||NOTION_DATA_SOURCE_ID;const cacheKey=new Request("https://malago.internal/partners/"+ds);const cached=await caches.default.match(cacheKey);if(cached){try{return await cached.json()}catch{}}const all=[];let cursor=null;for(let i=0;i<20;i++){const body={page_size:100};if(cursor)body.start_cursor=cursor;const r=await fetch("https://api.notion.com/v1/data_sources/"+ds+"/query",{method:"POST",headers:{"Authorization":"Bearer "+token,"Notion-Version":NOTION_VERSION,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error("Notion API "+r.status);const d=await r.json();all.push(...(d.results||[]).map(mapNotionRow).filter(Boolean));if(!d.has_more||!d.next_cursor)break;cursor=d.next_cursor;}const res=new Response(JSON.stringify(all),{headers:{"Content-Type":"application/json","Cache-Control":"public,max-age=30"}});await caches.default.put(cacheKey,res.clone());return all;}


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {"X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()"};

    if (request.method === "OPTIONS") return new Response(null,{status:204,headers});

    if (request.method === "GET" && url.pathname === "/api/config") {
      return json({version:VERSION,googleMapsConfigured:Boolean(env?.GOOGLE_MAPS_API_KEY),googleMapsKey:env?.GOOGLE_MAPS_API_KEY||null},200,headers);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ok:true,version:VERSION,aiConfigured:Boolean(env?.AI),notionConfigured:Boolean(env?.NOTION_TOKEN),model:MODEL,guideRecords:GUIDE_NORM.length,resourceRecords:RESSOURCES.length,dateMadrid:localMadridDateKey()});
    }


    if (request.method === "GET" && url.pathname === "/api/partners") {
      try {
        const partners = await fetchNotionPartners(env);
        return json({version:VERSION,source:"notion",partners},200,headers);
      } catch (error) {
        const requestId=crypto.randomUUID();
        console.error("Malago Notion partners error",requestId,error);
        return json({error:"Impossible de charger les partenaires depuis Notion.",requestId},502,headers);
      }
    }

    if (request.method === "GET") {
      if (env?.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Malago assets unavailable",{status:503,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
    }


function chatRelevantPartners(question,partners){
  const q=normalize(question);
  const terms=tokens(q).filter(t=>t.length>2);
  return partners.map(p=>{const hay=normalize([p.name,p.category,p.description,p.address,p.tags,p.promo,p.menu,p.when,p.audience].join(" "));let score=0;for(const t of terms){if(hay.includes(t))score+=2;if(normalize(p.name).includes(t))score+=6;}if(q.includes("vip")&&p.category==="Party")score+=5;if((q.includes("menu")||q.includes("carte")||q.includes("prix")||q.includes("tarif"))&&p.menu)score+=4;return{p,score};}).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.p);
}
async function handleNotionChat(question,history,env){
  const partners=await fetchNotionPartners(env);
  const relevant=chatRelevantPartners(question,partners).slice(0,4);
  const compact=relevant.map(p=>({name:p.name,category:p.category,description:p.description,promo:p.hasPromotion?p.promo:"",when:p.when,address:p.address,audience:p.audience,menu:p.menu,bookingLinks:p.bookingLinks,price:p.price}));
  let answer="";
  if(env?.AI){try{
    const system=`Tu es MALAGO, guide local de Málaga. Réponds dans la langue de l'utilisateur.
Utilise uniquement le contexte fourni. N'invente jamais de prix, horaires, adresses, offres ou disponibilités. Si menu/formules sont présents, tu peux les résumer.
CONTEXTE:
${JSON.stringify(compact,null,2)}`;
    const messages=[{role:"system",content:system},...history.map(x=>({role:x.role,content:x.content})),{role:"user",content:question}];
    const result=await env.AI.run(MODEL,{messages,max_tokens:360,temperature:0.15});
    answer=stripLeakage(extractAIText(result));
  }catch(error){console.error("Malago chat AI fallback",error);}}
  if(!answer){
    const p=relevant[0];
    answer=p?(`Pour ta recherche, regarde ${p.name}. ${p.description||""}${p.hasPromotion?" Offre Malago : "+p.promo:""}${p.menu?" Les menus et formules sont disponibles dans la fiche.":""}`):"Je n’ai pas trouvé de partenaire Malago correspondant.";
  }
  return {answer,results:relevant.slice(0,3),activeResults:relevant.slice(0,6)};
}

    if (request.method === "POST" && url.pathname === "/api/chat") {
      const contentLength=Number(request.headers.get("content-length")||0);
      if(contentLength && contentLength>MAX_BODY_BYTES)return json({error:"Requête trop volumineuse."},413,headers);
      try{
        const body=await request.json();
        const question=sanitizeText(body?.question,MAX_QUESTION_CHARS);
        if(!question)return json({error:"Question vide."},400,headers);
        const history=cleanHistory(body?.history);
        const out=await handleNotionChat(question,history,env);
        return json({answer:out.answer,results:out.results,activeResults:out.activeResults,meta:{source:"notion"}},200,headers);
      }catch(error){const requestId=crypto.randomUUID();console.error("Malago Notion chat error",requestId,error);return json({error:"Malago rencontre un problème technique.",requestId},500,headers);}
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      const contentLength=Number(request.headers.get("content-length")||0);
      if(contentLength && contentLength>MAX_BODY_BYTES)return json({error:"Requête trop volumineuse."},413,headers);
      try {
        const body=await request.json();
        const question=sanitizeText(body?.question,MAX_QUESTION_CHARS);
        if(!question)return json({error:"Question vide."},400,headers);
        const history=cleanHistory(body?.history);
        const activeResults=Array.isArray(body?.activeResults)?body.activeResults.slice(0,MAX_FOCUS):[];
        const context=currentContext(question,history,activeResults);
        const answer=await askAI(question,context,history,env);
        return json({answer,results:context.guide.map(({evidence,...item})=>item),activeResults:activeResultPayload(context),resourceDetails:detailPayload(context),meta:context.dataCounts},200,headers);
      } catch(error) {
        const requestId=crypto.randomUUID();
        console.error("Malago API error",requestId,error);
        return json({error:"Malago rencontre un problème technique.",requestId},500,headers);
      }
    }

    return new Response("Malago",{status:404,headers:{...headers,"Content-Type":"text/plain;charset=UTF-8"}});
  }
};
