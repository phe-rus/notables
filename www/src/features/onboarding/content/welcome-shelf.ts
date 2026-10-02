import type { InvoiceDocument } from "@notables/core";

/**
 * Examples added alongside the first welcome notes, so every place in the
 * library has something in it: an article, a book of short pieces, a
 * manga, a comic, and an invoice with its receipt.
 */

export const welcomeArticle = `# Why we still write by hand

A keyboard is faster. It is also forgetful: the words arrive, get tidied, and the thinking that made them disappears behind them.

Writing by hand is slower in a useful way. You can't type ahead of yourself, so you decide what matters before the pen moves. Studies of students taking notes keep finding the same thing: the ones who write by hand remember more, because they had to choose.

## Try it in Notables

- Write with a pen or your finger on a tablet or touch screen.
- Switch a note to a handwriting font when you want it to feel like paper.
- Keep typing when speed matters. Nothing is lost either way.

> The best notebook is the one you actually open.`;

export interface ShelfBook {
  title: string;
  subtitle: string;
  author: string;
  /** Chapters written for the book, in Markdown. */
  chapters: string[];
}

export const smallHours: ShelfBook = {
  title: "Small Hours",
  subtitle: "Three short pieces",
  author: "Notables",
  chapters: [
    `# The night bus

The 2:14 always smells of oranges. Nobody knows why. The driver hums the same four bars of something, and the regulars nod to each other without ever having spoken.

Tonight a girl with a cello case gets on at the bridge and sits in the back, and for six stops the bus is quieter than it has ever been, as if everyone is waiting for her to play.`,
    `# Bread

My grandmother never measured. She said the dough would tell you, and it did, if you were patient enough to listen with your hands.

I measure everything. I have scales and timers and a thermometer. Some mornings the loaf is perfect and I still can't make it taste like hers.`,
    `# Letters to the sea

Every summer we wrote a letter, rolled it into a bottle and threw it from the end of the pier. We never got an answer.

Years later my brother found one of them in a museum two countries away, under glass, labelled *message, child's hand, origin unknown.* He sent me a photo with no caption. I knew exactly which year it was.`,
  ],
};

/** Example invoice details; numbers and dates are filled in when it's made. */
export const welcomeInvoice: Pick<
  InvoiceDocument,
  "issuer" | "client" | "items" | "taxRate" | "discount" | "notes" | "paymentDetails" | "currency"
> = {
  currency: "USD",
  issuer: {
    name: "Amara Studio",
    email: "hello@amara.example",
    phone: "",
    address: "14 Harbour Road\nPort Bell",
    taxId: "",
  },
  client: {
    name: "Harbour Café",
    email: "orders@harbourcafe.example",
    phone: "",
    address: "2 Pier Street\nPort Bell",
    taxId: "",
  },
  items: [
    { id: "menu", description: "Menu illustrations", quantity: 6, unitPrice: 4500 },
    { id: "sign", description: "Shop sign design", quantity: 1, unitPrice: 18000 },
  ],
  taxRate: 0,
  discount: 0,
  notes: "This is an example. Edit it, or make your own from the + button.",
  paymentDetails: "Bank transfer: Example Bank · 0000 1111 2222",
};
