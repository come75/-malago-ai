import { GUIDE, RESSOURCES } from "./data.js";

const STOP_WORDS = new Set([
  "quel","quelle","quels","quelles","est","sont","une","un","des","du","de",
  "la","le","les","pour","avec","dans","sur","ce","cette","ces","peut",
  "faire","avoir","a","à","et","ou","où","je","me","moi","nous","on","il",
  "elle","ils","elles","qui","comment","quoi","que","y","en","au","aux",
  "the","what","where","can","for","with","this","that"
]);

const SYNONYMS = {
  restaurant: ["restaurant","restaurants","resto","restos","manger","mange","repas","food","diner","dîner"],
  nightlife: ["nightlife","club","clubs","boite","boîte","discotheque","discothèque","soirée","soiree","sortir","sortie","party","fête","fete"],
  activity: ["activity","activities","activité","activités","activite","activites","loisir","loisirs","buggy","quad","parasailing","bateau","yacht","surf","jetski","jet"],
  excursion: ["excursion","excursions","voyage","voyages","weekend","week-end","trip","trips","maroc","algavre","algarve","portugal"],
  discount: ["réduction","reduction","réductions","reductions","promo","promotion","promotions","discount","discounts","offre","offres","moins","30%"],
  big_party: ["grosse","gros","grande","grand","énorme","enorme","big","soirée","soiree","party"]
};

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9€%]+/g, " ")
    .trim();
}

function tokens(text = "") {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function expandQuery(query) {
  const base = tokens(query);
  const expanded = new Set(base);

  for (const group of Object.values(SYNONYMS)) {
    const found = group.some(word => base.includes(normalize(word)));
    if (found) group.forEach(word => expanded.add(normalize(word)));
  }

  return expanded;
}

function scoreGuide(item, query, queryTokens) {
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
    item.when
  ].join(" "));

  const words = new Set(tokens(text));
  let score = 0;

  for (const word of queryTokens) {
    if (words.has(word)) score++;
  }

  const q = normalize(query);

  if (/(restaurant|resto|manger|diner|diner)/.test(q) && item.category === "Restaurant") score += 6;
  if (/(club|boite|soir|nightlife|sortir)/.test(q) && ["Party","Nightlife","Beach Club"].includes(item.category)) score += 5;
  if (/(activ|buggy|quad|jetski|jet ski|bateau|yacht|surf)/.test(q) && ["Activity","Activities"].includes(item.category)) score += 6;
  if (/(excursion|voyage|weekend|week end|maroc|algarve|portugal)/.test(q) && /Excursion/i.test(item.category)) score += 6;
  if (/(reduction|promo|promotion|offre|discount)/.test(q) && /%/.test(item.promo)) score += 7;
  if (/(grosse soiree|grosse soirée)/.test(q) && normalize(item.name).includes("santa rita")) score += 8;

  return score;
}

function searchGuide(query) {
  const q = expandQuery(query);

  return GUIDE
    .map(item => ({ item, score: scoreGuide(item, query, q) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.item);
}

function scoreResource(item, query, queryTokens) {
  const text = normalize([
    item.establishment,
    item.type,
    item.offer,
    item.price,
    item.conditions,
    item.source,
    item.date
  ].join(" "));

  const words = new Set(tokens(text));
  let score = 0;

  for (const word of queryTokens) {
    if (words.has(word)) score++;
  }

  const q = normalize(query);

  if (/(prix|price|cout|coût|combien|tarif)/.test(q) && item.price !== "") score += 2;
  if (/(menu|bouteille|bouteilles|drink|boisson)/.test(q) && /menu|drink|bottle|bouteille/i.test(item.type + " " + item.offer)) score += 3;
  if (/(restaurant|resto|manger|diner)/.test(q) && /restaurant|menu|plat|dessert|entrée/i.test(item.type + " " + item.offer + " " + item.conditions)) score += 3;
  if (/(club|soiree|soirée|vip|bouteille)/.test(q) && /night|club|vip|bottle|bouteille|drink/i.test(item.type + " " + item.offer)) score += 3;
  if (/(buggy|quad|jet ski|jetski|bateau|yacht|parasailing)/.test(q) && /buggy|quad|jet|boat|bateau|yacht|parasail/i.test(item.establishment + " " + item.type + " " + item.offer)) score += 4;

  return score;
}

function searchResources(query) {
  const q = expandQuery(query);

  return RESSOURCES
    .map(item => ({ item, score: scoreResource(item, query, q) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 12)
    .map(x => x.item);
}

function buildContext(question) {
  const guide = searchGuide(question);
  const resources = searchResources(question);

  const guideText = guide.map(item => ({
    type: "GUIDE",
    ...item
  }));

  const resourceText = resources.map(item => ({
    type: "RESSOURCE",
    ...item
  }));

  return {
    guide: guideText,
    resources: resourceText
  };
}

async function askAI(question, context, env) {
  if (!env.AI) {
    throw new Error("Workers AI binding AI missing");
  }

  const system = `
Tu es Malago, le guide intelligent de Málaga.

Réponds en français, naturellement et de façon concise.

SOURCE DE VÉRITÉ :
Tu dois utiliser uniquement les données Malago présentes dans le contexte.
Le contexte contient deux niveaux :
1. GUIDE : recommandations, descriptions, prix indicatifs, promotions, horaires et informations générales.
2. RESSOURCES : données détaillées provenant des menus/offres et leurs sources et dates.

RÈGLES :
- N'invente jamais une information absente du contexte.
- Ne transforme jamais un prix indicatif du GUIDE en prix officiel.
- Pour une information précise de menu, prix, composition ou offre, privilégie RESSOURCES.
- Si une information précise n'est pas disponible, dis-le.
- Ne prétends jamais avoir vérifié Internet.
- Ne donne pas de disponibilité en temps réel si elle n'est pas fournie.
- Pour une date, distingue les dates passées des prochaines dates indiquées dans le contexte.
- Tu peux comparer les options présentes dans le contexte.
- Tu peux recommander une option lorsque cela découle directement des données.
- Ne parle pas de la base de données ni de ton fonctionnement technique.
- Réponse courte et utile, adaptée à un étudiant/visiteur à Málaga.

QUESTION :
${question}

CONTEXTE MALAGO :
${JSON.stringify(context)}
`;

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
    messages: [
      { role: "system", content: system },
      { role: "user", content: question }
    ],
    max_tokens: 450,
    temperature: 0.3
  });

  return result?.response?.trim() || "Je n'ai pas trouvé de réponse.";
}

const HTML = `
<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Malago</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Arial,sans-serif;background:#f5f5f5;color:#111}
.container{max-width:680px;margin:auto;padding:24px}
h1{font-size:40px;margin:0 0 6px}
.subtitle{color:#666;margin-bottom:28px}
textarea{width:100%;min-height:120px;padding:16px;border:1px solid #ddd;border-radius:16px;font-size:17px;font-family:Arial;background:#fff;color:#111}
button{border:0;border-radius:14px;padding:14px 16px;font-size:16px;cursor:pointer}
.main-button{width:100%;margin-top:12px;background:#111;color:#fff}
.examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.example{background:#fff;color:#111;border:1px solid #ddd;border-radius:20px}
#answer{margin-top:24px;background:#fff;padding:20px;border-radius:16px;line-height:1.55;white-space:pre-wrap;min-height:24px}
</style>
</head>
<body>
<div class="container">
<h1>Malago</h1>
<div class="subtitle">Ton guide intelligent de Málaga</div>
<textarea id="question" placeholder="Que faire ce soir à Málaga ?"></textarea>
<div class="examples">
<button class="example" onclick="q('Quel club est bien pour une grosse soirée ?')">Grosse soirée</button>
<button class="example" onclick="q('Quel restaurant a une réduction ?')">Restaurants</button>
<button class="example" onclick="q('Quelles activités peut-on faire ?')">Activités</button>
<button class="example" onclick="q('Quelles excursions sont disponibles ?')">Excursions</button>
</div>
<button class="main-button" onclick="ask()">Demander à Malago</button>
<div id="answer"></div>
</div>
<script>
function q(text){document.getElementById("question").value=text}
async function ask(){
 const question=document.getElementById("question").value.trim();
 const answer=document.getElementById("answer");
 if(!question){answer.textContent="Écris ta question.";return}
 answer.textContent="Malago cherche...";
 try{
  const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question})});
  const data=await r.json();
  answer.textContent=data.answer||data.error||"Erreur.";
 }catch(e){answer.textContent="Impossible de contacter Malago."}
}
</script>
</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return new Response(HTML, {
        headers: {"Content-Type":"text/html;charset=UTF-8"}
      });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const body = await request.json();
        const question = typeof body.question === "string" ? body.question.trim() : "";

        if (!question) {
          return Response.json({error:"Question vide."},{status:400});
        }

        const context = buildContext(question);
        const answer = await askAI(question, context, env);

        return Response.json({
          answer,
          results: context
        });
      } catch (error) {
        console.error("Malago error:", error);
        return Response.json({error:"Erreur serveur."},{status:500});
      }
    }

    return new Response("Malago");
  }
};
