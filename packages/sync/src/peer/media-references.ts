import * as Y from "yjs";

/**
 * Every distinct media id a document refers to as `${prefix}<id>`, in any
 * attribute or map value, including plain data stored in a map (a book's
 * cover). Lexical keeps a decorator node (a photo, a
 * drawing) as an element embedded in its parent's text, with its fields as
 * attributes (`__src`, `__scene`), so embeds are searched too.
 */
export function mediaReferences(doc: Y.Doc, prefix = "media:"): string[] {
  const ids = new Set<string>();
  const seen = new Set<Y.AbstractType<unknown>>();

  const take = (value: unknown) => {
    if (typeof value === "string" && value.startsWith(prefix)) {
      const id = value.slice(prefix.length);
      if (/^[\w-]{1,64}$/.test(id)) ids.add(id);
    } else if (value instanceof Y.AbstractType) {
      visit(value);
    } else if (Array.isArray(value)) {
      for (const each of value) take(each);
    } else if (value && typeof value === "object" && !(value instanceof Uint8Array)) {
      // Plain data kept in a map, such as a book with its cover.
      for (const each of Object.values(value)) take(each);
    }
  };

  const visit = (type: Y.AbstractType<unknown>) => {
    if (seen.has(type)) return;
    seen.add(type);
    if (type instanceof Y.XmlElement || type instanceof Y.XmlText) {
      for (const value of Object.values(type.getAttributes())) take(value);
    }
    if (type instanceof Y.XmlText) {
      for (const part of type.toDelta() as Array<{ insert?: unknown }>) take(part.insert);
    } else if (type instanceof Y.XmlElement || type instanceof Y.XmlFragment) {
      for (const child of type.toArray()) take(child);
    } else if (type instanceof Y.Map) {
      for (const value of type.values()) take(value);
    } else if (type instanceof Y.Array) {
      for (const value of type.toArray()) take(value);
    }
  };

  for (const [name, type] of doc.share) {
    // A root nobody has opened yet has no concrete type; Lexical's is text.
    visit(
      (type.constructor === Y.AbstractType
        ? doc.get(name, Y.XmlText)
        : type) as Y.AbstractType<unknown>,
    );
  }
  return [...ids];
}
