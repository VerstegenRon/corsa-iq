// Reads a receipt or invoice (photo or PDF) with Claude and returns the fields of an expense, so the
// form can be filled in for the driver to check. Server only: it needs ANTHROPIC_API_KEY.

import Anthropic from "@anthropic-ai/sdk";

import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/karting";

export type ReceiptFields = {
  /** Total paid, including VAT, in the receipt's currency. */
  amount: number | null;
  currency: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  description: string | null;
  category: ExpenseCategory;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export function isReadableReceiptType(type: string) {
  return type === "application/pdf" || IMAGE_TYPES.includes(type as ImageType);
}

const categories = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[];

const schema = {
  type: "object",
  properties: {
    amount: { type: ["number", "null"], description: "Total amount paid including VAT; null if not readable." },
    currency: { type: ["string", "null"], description: "ISO 4217 code, e.g. EUR." },
    date: { type: ["string", "null"], description: "Purchase or invoice date as YYYY-MM-DD." },
    description: { type: ["string", "null"], description: "Short Dutch description: vendor and what was bought." },
    category: { type: "string", enum: categories },
  },
  required: ["amount", "currency", "date", "description", "category"],
  additionalProperties: false,
};

const instructions = `Dit is een bonnetje of factuur van een kartcoureur. Lees de gegevens voor één uitgave uit.
- amount: het totaal dat betaald is, inclusief btw (niet een subtotaal of het btw-bedrag).
- date: de aankoop- of factuurdatum.
- description: kort, in het Nederlands, bijvoorbeeld "Inschrijving NK ronde 1 – Genk" of "2× MG Red banden, Kartshop X". Hooguit 80 tekens.
- category: kies de best passende: ${categories.map((key) => `${key} (${EXPENSE_CATEGORIES[key]})`).join(", ")}.
Wat je niet kunt lezen, laat je null.`;

let client: Anthropic | null = null;

export async function readReceipt(file: { data: ArrayBuffer; type: string }): Promise<ReceiptFields> {
  client ??= new Anthropic();
  const data = Buffer.from(file.data).toString("base64");
  const source: Anthropic.Beta.BetaContentBlockParam =
    file.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.type as ImageType, data } };

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    // On a safety decline the API retries on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: [source, { type: "text", text: instructions }] }],
  });

  if (response.stop_reason === "refusal") throw new Error("Het bonnetje kon niet worden gelezen.");
  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("Geen antwoord ontvangen.");

  const parsed = JSON.parse(text.text) as ReceiptFields;
  return {
    amount: typeof parsed.amount === "number" && parsed.amount > 0 ? Math.round(parsed.amount * 100) / 100 : null,
    currency: parsed.currency?.toUpperCase() ?? null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? "") ? parsed.date : null,
    description: parsed.description?.slice(0, 120) ?? null,
    category: categories.includes(parsed.category) ? parsed.category : "other",
  };
}
