export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function toJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function absoluteRoomLink(code: string) {
  return `/join/${code}`;
}
