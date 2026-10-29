// Puts the setup advisor's findings into plain words with Claude. It only gets the numbers the advisor
// worked out, so it cannot invent a finding. Server only: it needs ANTHROPIC_API_KEY.

import Anthropic from "@anthropic-ai/sdk";

import { CONFIDENCE, formatGap, insightSentence, type Insight } from "@/lib/setup-advisor";

/** Enough for the clearest findings; the rest is on the page. */
const MAX_FINDINGS = 15;

export type AnalysisLength = "short" | "full";

const role = `Je bent race-engineer van een kartteam. Hieronder staan verbanden die de app heeft gevonden in de eigen sessies van het team: welke afstelling ging samen met snellere beste rondes, op hetzelfde circuit, met dezelfde kart en bij hetzelfde weer.
Schrijf in het Nederlands, zakelijk en professioneel zoals een engineer die aan het team rapporteert: zonder spreektaal of uitroepen, en begrijpelijk voor wie geen statisticus is.`;

const rules = `Noem een 'voorzichtig' verband nooit een zekerheid. Staat er dat ook een andere instelling tegelijk veranderde, zeg dan dat niet vast te stellen is welke van de twee het verschil maakte.
Gebruik alleen de cijfers hieronder; verzin niets en geef geen algemene kart-tips die niet uit de cijfers volgen.`;

const FORMAT: Record<AnalysisLength, string> = {
  // For a quick look between two sessions.
  short: `Vorm: alleen een lijst van drie tot vijf kernpunten, elke regel beginnend met "- ", elk hooguit vijftien woorden, met het aantal sessies en de betrouwbaarheid tussen haakjes. De laatste regel begint met "- Volgende test:" en geeft één concreet voorstel. Geen inleiding, geen slotzin, geen kopjes.`,
  full: `Vorm: korte alinea's, geen kopjes en geen opsommingstekens. Begin met de twee of drie belangrijkste lessen en zeg bij elke les op hoeveel sessies hij rust en hoe betrouwbaar hij is. Sluit af met één concreet voorstel voor de volgende testsessie, bijvoorbeeld wat je bewust los zou testen. Maximaal 250 woorden.`,
};

function describe(insight: Insight): string {
  const lines = [
    `- ${insightSentence(insight)}`,
    `  ${insight.best.text}: ${insight.best.sessions} sessies; ${insight.other.text}: ${insight.other.sessions} sessies; verschil ${formatGap(insight.gapMs)}; betrouwbaarheid ${CONFIDENCE[insight.confidence].label.toLowerCase()}.`,
  ];
  if (insight.alsoChanged.length > 0) lines.push(`  Tegelijk anders in dezelfde sessies: ${insight.alsoChanged.join(", ")}.`);
  return lines.join("\n");
}

let client: Anthropic | null = null;

export async function explainInsights(insights: Insight[], length: AnalysisLength): Promise<{ text: string } | { error: string }> {
  if (insights.length === 0) return { error: "Er zijn nog geen verbanden om uit te leggen." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Uitleg met Claude is nu niet beschikbaar." };
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1500,
      // On a safety decline the API retries on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `${role}\n${rules}\n${FORMAT[length]}\n\nGevonden verbanden:\n${insights.slice(0, MAX_FINDINGS).map(describe).join("\n")}` }],
        },
      ],
    });
    const text = response.content.find((block) => block.type === "text");
    if (response.stop_reason === "refusal" || !text || text.type !== "text") return { error: "Claude kon hier geen uitleg bij geven." };
    return { text: text.text.trim() };
  } catch (error) {
    console.error("Advies uitleggen mislukt", error);
    return { error: "Uitleg ophalen mislukt. Probeer het later opnieuw." };
  }
}
