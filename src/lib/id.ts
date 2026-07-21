import { nanoid } from "nanoid";

export function newId(prefix?: string) {
  const id = nanoid(12);
  return prefix ? `${prefix}_${id}` : id;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
