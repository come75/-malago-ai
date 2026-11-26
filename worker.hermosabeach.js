// Hermosa Beach × Malago — serves the Hermosa Beach site (Worker malago-hermosabeach-site,
// branch feat/hermosa-beach-preview) under malago-agency.com/partner/hermosabeach.
const UPSTREAM = "https://malago-hermosabeach-site.malago.workers.dev";
const PREFIX = "/partner/hermosabeach";
export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    if (incoming.pathname !== PREFIX && !incoming.pathname.startsWith(PREFIX + "/")) {
      return new Response("Not Found", { status: 404 });
    }
    let path = incoming.pathname.slice(PREFIX.length) || "/";
    if (path === "/" || path === "") path = "/rendezvous";
    const upstreamUrl = new URL(path + incoming.search, UPSTREAM);
    const response = await fetch(new Request(upstreamUrl, request));
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;
    let html = await response.text();
    html = html.replaceAll(UPSTREAM + "/rendezvous", "https://malago-agency.com" + PREFIX)
               .replaceAll(UPSTREAM + "/", "https://malago-agency.com" + PREFIX + "/")
               // Assets that only exist on the Hermosa Beach Worker (not on the shared `test` site).
               .replaceAll('"/media/hermosa-', '"' + PREFIX + '/media/hermosa-')
               .replaceAll('"/img/hermosa-', '"' + PREFIX + '/img/hermosa-');
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  }
};
