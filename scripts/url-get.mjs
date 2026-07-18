import http from "node:http";
import https from "node:https";

const DEFAULT_CLIENTS = { http, https };

export function getUrl(url, callback, clients = DEFAULT_CLIENTS) {
  const protocol = new URL(url).protocol;
  const client = protocol === "http:"
    ? clients.http
    : protocol === "https:"
      ? clients.https
      : null;

  if (!client) throw new TypeError(`Unsupported URL protocol: ${protocol}`);
  return client.get(url, callback);
}
