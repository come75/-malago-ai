export default {
  async fetch(request) {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "malago-villa-la-susana.malago.workers.dev";
    target.port = "";
    return fetch(new Request(target.toString(), request));
  }
};
