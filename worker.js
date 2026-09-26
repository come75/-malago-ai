const DB = [
  {
    name: "Santa Rita",
    category: "Nightlife",
    price: "10€ entrée / VIP à partir de 150€",
    info: "Très grand club, environ 2500 personnes, 2 étages, espace fumeur, VIP. Public 20-30 ans. Très bon pour une grosse soirée. Jeudi à samedi, surtout vendredi et samedi."
  },
  {
    name: "Cosa Nostra",
    category: "Nightlife",
    price: "À partir de 25€ avec boissons / VIP à partir de 150€",
    info: "Grand club hors centre. Public espagnol, concerts et showcases, programmation variable. Vendredi et samedi."
  },
  {
    name: "BRØ Club",
    category: "Nightlife",
    price: "À partir de 10€ / VIP 120-150€",
    info: "Grand club avec plusieurs espaces, terrasse et VIP. Programmation commerciale, urbaine, reggaeton et électronique. Vendredi et samedi."
  },
  {
    name: "Aura",
    category: "Nightlife",
    price: "10-15€",
    info: "Petit club rénové d'environ 100 personnes, central, jeune et tendance, bon DJ. Idéal pour commencer la soirée avant Mirror. Jeudi à samedi."
  },
  {
    name: "Mirror",
    category: "Nightlife",
    price: "10-25€",
    info: "Club central de 250-300 personnes, public 22-28 ans, musique tendance et très bon DJ. Deux bons espaces VIP. Jeudi à samedi, surtout vendredi et samedi."
  },
  {
    name: "Infinity by Mirror",
    category: "Nightlife",
    price: "8-10€ / bouteilles à partir de 150€",
    info: "Grand club, bonne offre VIP, public principalement espagnol avec une partie internationale. Jeudi et samedi."
  },
  {
    name: "Silencio Beach Club",
    category: "Beach Club",
    price: "Transat 15€ / bed autour de 200€",
    info: "Beach club directement sur la plage à Torremolinos. Ambiance à partir de 17h, musique house, beaucoup d'Espagnols. Très bien pour plage, sunset et soirée. Vendredi à dimanche."
  },
  {
    name: "TukTuk Noodles",
    category: "Restaurant",
    price: "Environ 18€",
    info: "Restaurant asiatique. Offre commerciale Malago : -30% midi et soir toute la semaine."
  },
  {
    name: "Los Marangós",
    category: "Restaurant",
    price: "Environ 20€",
    info: "Restaurant. Offre commerciale Malago : -30% midi et soir toute la semaine."
  },
  {
    name: "Tapearte",
    category: "Restaurant",
    price: "Environ 22€",
    info: "Restaurant de tapas. Offre commerciale Malago : -30% midi et soir toute la semaine."
  },
  {
    name: "Buggy Adventure Mijas",
    category: "Activity",
    price: "Buggy 1h 100€ / 2h 145€ / 3h 185€",
    info: "Buggy et quad dans les montagnes de Mijas avec vues mer et montagne. Permis nécessaire. 2 personnes par buggy ou quad. Horaires 10h, 13h, 16h et 18h. Réserver via WhatsApp."
  },
  {
    name: "Water Activities",
    category: "Activity",
    price: "Jet Ski à partir de 60€ / Parasailing à partir de 60€ / bateau à partir de 120€",
    info: "Jet ski, parasailing, banana, fly fish, bateaux, yacht privé, dolphin tour et pêche. Réservation via WhatsApp."
  },
  {
    name: "Día de Surf en El Palmar",
    category: "Excursion",
    price: "25€",
    info: "Excursion d'une journée depuis Málaga avec transport, cours de surf débutant de 2h et équipement. Environ 8h à 18h. Savoir nager. Prochaine date connue : 11/10/2026."
  },
  {
    name: "Algarve Paradise Weekend",
    category: "Excursion",
    price: "129€ avec carte / 149€ normal",
    info: "Voyage 3 jours et 2 nuits depuis Málaga. Algarve, plages, Lagos et Ponta da Piedade. Transport et hébergement inclus. Prochaine date connue : 09/10/2026."
  }
];

function tokens(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9€]+/g, " ")
    .split(" ")
    .filter(x => x.length > 2);
}

function search(query) {
  const q = new Set(tokens(query));

  return DB
    .map(item => {
      const text = tokens(
        item.name + " " +
        item.category + " " +
        item.price + " " +
        item.info
      );

      let score = 0;

      for (const word of text) {
        if (q.has(word)) score++;
      }

      return { item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.item);
}

async function askAI(question, context) {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    return "Le prototype est connecté, mais la clé OpenAI n'est pas encore configurée.";
  }

  const prompt = `
Tu es l'assistant intelligent de Malago, le guide de Málaga.

Réponds en français, naturellement et de façon concise.

Utilise UNIQUEMENT les informations fournies dans les données Malago ci-dessous.
N'invente jamais un prix, une réduction, un horaire, une disponibilité ou une date.
Si une information manque, dis-le clairement.

DONNÉES MALAGO :
${JSON.stringify(context, null, 2)}

QUESTION :
${question}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      input: prompt
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return "Erreur lors de la connexion à l'IA.";
  }

  return data.output_text || "Je n'ai pas trouvé de réponse.";
}

const HTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Malago AI</title>
<style>
body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f5f5f5;
  color:#111;
}
.container{
  max-width:600px;
  margin:auto;
  padding:24px;
}
h1{
  font-size:38px;
  margin-bottom:5px;
}
.subtitle{
  color:#666;
  margin-bottom:30px;
}
textarea{
  width:100%;
  box-sizing:border-box;
  min-height:120px;
  padding:16px;
  border:1px solid #ddd;
  border-radius:16px;
  font-size:17px;
}
button{
  width:100%;
  margin-top:12px;
  padding:16px;
  border:0;
  border-radius:14px;
  background:#111;
  color:white;
  font-size:17px;
}
.examples{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:15px;
}
.example{
  background:white;
  border:1px solid #ddd;
  padding:10px 12px;
  border-radius:20px;
}
#answer{
  margin-top:25px;
  background:white;
  padding:20px;
  border-radius:16px;
  line-height:1.5;
  white-space:pre-wrap;
}
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
</div>

<button onclick="ask()">Demander à Malago</button>

<div id="answer"></div>
</div>

<script>
function q(text){
  document.getElementById("question").value=text;
}

async function ask(){
  const question=document.getElementById("question").value;
  const answer=document.getElementById("answer");

  if(!question){
    answer.textContent="Écris ta question.";
    return;
  }

  answer.textContent="Malago cherche...";

  const r=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({question})
  });

  const data=await r.json();
  answer.textContent=data.answer || data.error || "Erreur.";
}
</script>
</body>
</html>
`;

export default {
  async fetch(request, env) {

    if (request.method === "GET") {
      return new Response(HTML, {
        headers: {"Content-Type": "text/html;charset=UTF-8"}
      });
    }

    if (request.method === "POST" && new URL(request.url).pathname === "/api/chat") {

      try {
        const body = await request.json();
        const question = body.question || "";

        const results = search(question);

        const answer = await askAI(question, results);

        return Response.json({
          answer,
          results
        });

      } catch (error) {
        return Response.json({
          error: "Erreur serveur."
        }, {status:500});
      }
    }

    return new Response("Malago");
  }
};
// Malago build test
