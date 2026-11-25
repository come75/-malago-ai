export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = "/partner/hermosabeach";
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) {
      return new Response("Not Found", { status: 404 });
    }
    let assetPath = url.pathname.slice(prefix.length) || "/";
    if (assetPath === "/") assetPath = "/rendezvous.html";
    url.pathname = assetPath;
    return env.ASSETS.fetch(new Request(url, request));
  }
};