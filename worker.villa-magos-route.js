export default {
  async fetch(request) {
    const source = new URL(request.url);
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "malago-villamagos.malago.workers.dev";
    target.port = "";
    if (source.pathname === "/partner/villamagos" || source.pathname === "/partner/villamagos/") {
      // Static assets serve the page at /villa-magos; /villa-magos.html answers with a
      // relative redirect that would land on malago-agency.com/villa-magos (Worker `test`).
      target.pathname = "/villa-magos";
    }
    return fetch(new Request(target.toString(), request));
  }
};
