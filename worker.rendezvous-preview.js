export default {
  async fetch(request, env) {
    if (!env?.ASSETS) {
      return new Response("Preview assets unavailable", {
        status: 503,
        headers: { "content-type": "text/plain; charset=UTF-8" }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
