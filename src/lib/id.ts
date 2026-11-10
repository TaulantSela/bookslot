import { nanoid } from "nanoid";

export function newId(prefix?: string) {
  const id = nanoid(12);
  return prefix ? `${prefix}_${id}` : id;
}

// Latin transliteration for Cyrillic alphabets (Macedonian, Serbian,
// Bulgarian, Russian, Ukrainian). Applied before accent stripping because
// letters such as ѓ, ќ and й decompose into a base letter plus an accent.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ѓ: "gj", ђ: "dj", е: "e", ё: "e",
  є: "ye", ж: "zh", з: "z", ѕ: "dz", и: "i", і: "i", ї: "yi", й: "y", ј: "j",
  к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r",
  с: "s", т: "t", ќ: "kj", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "ch",
  џ: "dzh", ш: "sh", щ: "sht", ъ: "a", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (char) => CYRILLIC_TO_LATIN[char] ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/, "");
}
