const UPSTREAM = "https://malago-rendezvous-preview.malago.workers.dev";
const PREFIX = "/partner/rendezvous";
export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    if (incoming.pathname !== PREFIX && !incoming.pathname.startsWith(PREFIX + "/")) {
      return new Response("Not Found", { status: 404 });
    }
    let path = incoming.pathname.slice(PREFIX.length) || "/";
    if (path === "/" || path === "") path = "/rendezvous";
    const upstreamUrl = new URL(path + incoming.search, UPSTREAM);
    const upstreamRequest = new Request(upstreamUrl, request);
    const response = await fetch(upstreamRequest);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;
    let html = await response.text();
    html = html.replaceAll(UPSTREAM + "/rendezvous", "https://malago-agency.com" + PREFIX)
               .replaceAll(UPSTREAM + "/", "https://malago-agency.com" + PREFIX + "/")
               // Assets that only exist on the Rendez-Vous Worker (not on the shared `test` site).
               .replaceAll('"/img/rdv-immo-', '"' + PREFIX + '/img/rdv-immo-');
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }
};