export default {
  async fetch(request) {
    const source = new URL(request.url);
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "malago-villamagos.malago.workers.dev";
    target.port = "";
    if (source.pathname === "/partner/villamagos" || source.pathname === "/partner/villamagos/") {
      target.pathname = "/villa-magos.html";
    }
    return fetch(new Request(target.toString(), request));
  }
};
