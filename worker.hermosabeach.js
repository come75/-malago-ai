// Hermosa Beach × Malago — holding page while the partner showcase is being built.
// (Until 26/11/2026 this path proxied the Rendez-Vous Immo preview; Rendez-Vous now lives
// at /partner/rendezvous, served by malago-rendezvous-route.)
const PREFIX = "/partner/hermosabeach";
const WHATSAPP = "https://wa.me/34613384566?text=" + encodeURIComponent(
  "PROPERTY: HERMOSA BEACH\nHello Malago, I would like to discover your services."
);

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Hermosa Beach × Malago — Coming soon</title>
<style>
  *{box-sizing:border-box;margin:0}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;
       background:#0d0d0d;color:#f4efe6;font-family:Georgia,"Times New Roman",serif;text-align:center}
  main{max-width:560px}
  .lockup{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:40px;
          font-family:Helvetica,Arial,sans-serif;letter-spacing:.18em;font-size:14px;text-transform:uppercase}
  .lockup img{height:34px;width:auto;background:#f4efe6;border-radius:6px;padding:4px 8px}
  .x{opacity:.6}
  h1{font-weight:400;font-size:clamp(30px,6vw,44px);line-height:1.15;margin-bottom:18px}
  p{font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;opacity:.8;margin-bottom:10px}
  a.cta{display:inline-block;margin-top:28px;padding:15px 28px;border-radius:999px;background:#e8c98f;
        color:#0d0d0d;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:.08em;
        text-transform:uppercase;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<main>
  <div class="lockup"><span>Hermosa Beach</span><span class="x">×</span><img src="/img/malago-logo.webp" alt="Malago"></div>
  <h1>Your private concierge on the Costa del Sol.</h1>
  <p>Our Hermosa Beach guest guide is coming soon.</p>
  <p>Notre guide pour les voyageurs d’Hermosa Beach arrive bientôt. · Nuestra guía para los huéspedes de Hermosa Beach llega pronto.</p>
  <a class="cta" href="${WHATSAPP}" target="_blank" rel="noopener">Contact Malago on WhatsApp</a>
</main>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + "/")) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(PAGE, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-robots-tag": "noindex",
      },
    });
  },
};
