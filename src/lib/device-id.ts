const KEY = "abastece_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr-no-device";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `dev_${crypto.randomUUID()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
