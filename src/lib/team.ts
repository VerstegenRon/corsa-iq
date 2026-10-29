// The four roles in a team, as people read them. The rights themselves are in garage.ts and the database.

export const ROLE_LABELS: Record<string, { name: string; text: string }> = {
  owner: { name: "Eigenaar", text: "Alles, ook het team, de garage en de kosten." },
  mechanic: { name: "Monteur", text: "Alles van racen en materiaal bewerken, en de kosten." },
  driver: { name: "Coureur", text: "Alles van racen en materiaal bewerken, geen kosten." },
  viewer: { name: "Kijker", text: "Alles van racen lezen, niets wijzigen, geen kosten. Voor ouders, sponsors of een coach." },
};
