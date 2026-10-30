// Turns the driver's feedback into labels with Claude: handling, corners, phase of the corner,
// topics and mood. Server only: it needs ANTHROPIC_API_KEY.

import Anthropic from "@anthropic-ai/sdk";

import { CORNER_PHASES, FEEDBACK_MOODS, FEEDBACK_TOPICS, HANDLING, parseFeedbackTags, type FeedbackTags } from "@/lib/feedback";
import { getPlanAccess } from "@/lib/plan-access";

const schema = {
  type: "object",
  properties: {
    handling: { type: "array", items: { type: "string", enum: Object.keys(HANDLING) } },
    corners: {
      type: "array",
      items: { type: "string" },
      description: 'Corners the driver mentions: just the number ("3") or a short Dutch name ("haarspeld").',
    },
    phases: { type: "array", items: { type: "string", enum: Object.keys(CORNER_PHASES) } },
    topics: { type: "array", items: { type: "string", enum: Object.keys(FEEDBACK_TOPICS) } },
    mood: { type: "string", enum: Object.keys(FEEDBACK_MOODS) },
  },
  required: ["handling", "corners", "phases", "topics", "mood"],
  additionalProperties: false,
};

const instructions = `Dit is de feedback van een kartcoureur na een sessie, vaak ingesproken en dus spreektaal. Zet er labels op.
- handling: understeer (onderstuur, de kart duwt over de voorwielen), oversteer (overstuur, de achterkant breekt uit), balanced (de coureur noemt de balans goed). Alleen wat de coureur echt zegt.
- corners: de bochten die genoemd worden.
- phases: waar in de bocht het speelt: braking (remmen), entry (insturen), apex, exit (uitkomen, accelereren), straight (rechte stuk, topsnelheid).
- topics: waar het over gaat: ${Object.entries(FEEDBACK_TOPICS)
  .map(([key, label]) => `${key} (${label})`)
  .join(", ")}.
- mood: hoe tevreden de coureur klinkt over de sessie.
Verzin niets: is iets niet genoemd, laat de lijst dan leeg.`;

let client: Anthropic | null = null;

/** Null when there is nothing to tag or Claude could not help; saving the feedback never waits on success. */
export async function tagFeedback(feedback: string | null): Promise<FeedbackTags | null> {
  if (!feedback?.trim() || !process.env.ANTHROPIC_API_KEY) return null;
  // AI labels come with Pro; without them the feedback is saved as written.
  if (!(await getPlanAccess()).has("aiDebrief")) return null;
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1000,
      // On a safety decline the API retries on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: [{ type: "text", text: `${instructions}\n\nFeedback:\n${feedback.slice(0, 4000)}` }] }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") return null;
    return parseFeedbackTags(JSON.parse(text.text));
  } catch (error) {
    console.error("Feedback labelen mislukt", error);
    return null;
  }
}
