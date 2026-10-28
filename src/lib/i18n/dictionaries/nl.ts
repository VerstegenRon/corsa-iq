// Dutch is the source language: its shape defines `Dictionary`, and every other language must
// provide the same keys (the typecheck fails on a missing translation). Plain strings only, so the
// dictionary can be handed to Client Components; use {placeholders} and `plural` for variable parts.

import {
  ENGINE_COMPONENTS,
  EVENT_TYPES,
  EXPENSE_CATEGORIES,
  KART_STATUSES,
  MAINTENANCE_TYPES,
  PART_CATEGORIES,
  PART_STATUSES,
  SESSION_TYPES,
  WEATHER,
} from "@/lib/karting";

export const nl = {
  common: {
    signOut: "Uitloggen",
    homeLabel: "CorsaIQ – overzicht",
    language: "Taal",
    navLabel: "Dashboard",
  },
  nav: {
    tracks: "Circuits",
    drivers: "Coureurs",
    karts: "Karts",
    costs: "Kosten",
    parts: "Onderdelen",
    seasons: "Seizoen",
  },
  login: {
    metaTitle: "Inloggen — CorsaIQ",
    heading: "Welkom in de pitbox",
    intro: "Log in, of maak een account aan om je kart en seizoen bij te houden.",
    confirmed: "Je e-mailadres is bevestigd. Log nu in met je wachtwoord.",
    confirmFailed: "De bevestigingslink is verlopen of ongeldig. Log in of vraag een nieuwe link aan.",
    email: "E-mailadres",
    password: "Wachtwoord",
    signIn: "Inloggen",
    signUp: "Account aanmaken",
    missingFields: "Vul je e-mailadres en wachtwoord in.",
    passwordTooShort: "Kies een wachtwoord van minstens {min} tekens.",
    signUpDone: "Account aangemaakt. Check je e-mail en klik op de bevestigingslink om in te loggen.",
    emailNotConfirmed: "Bevestig eerst je e-mailadres via de link in je inbox.",
    invalidCredentials: "E-mailadres of wachtwoord klopt niet.",
  },
  overview: {
    metaTitle: "Dashboard — CorsaIQ",
    signedInAs: "Ingelogd als {email}",
    statsLabel: "Overzicht",
    karts: "Karts",
    parts: "Onderdelen",
    installed: "Gemonteerd",
    costs: "Kosten",
    costsSeason: "Kosten {season}",
    startTitle: "Begin met je kart",
    startText: "Voeg je chassis toe en daarna je motor, banden en andere onderdelen.",
    startLink: "Kart toevoegen",
    dueTitle: "Onderhoud nodig",
    sinceRevision: "{used} / {limit} sinds revisie",
    due: "revisie nodig",
    soon: "bijna",
  },
  progress: {
    title: "Progressie per circuit",
    subtitle: "Je snelste ronde per evenement · lager is sneller",
    events: { one: "{count} evenement", other: "{count} evenementen" },
    fastest: "snelste",
    faster: "Sneller sinds {date}:",
    slower: "Trager sinds {date}:",
    equal: "Gelijk sinds {date}:",
    needSecond: "Na een tweede evenement op dit circuit zie je hier je progressie.",
    asTable: "Als tabel",
    chartLabel: "Snelste ronde per evenement op {track}",
    fastestHere: "snelste op dit circuit",
    vsFastest: "{delta} t.o.v. snelste",
  },
  chart: {
    summary: "{label}. Snelste {time} ({title}). De tabel eronder bevat alle waarden.",
  },
  options: {
    partCategories: PART_CATEGORIES,
    partStatuses: PART_STATUSES,
    kartStatuses: KART_STATUSES,
    eventTypes: EVENT_TYPES,
    sessionTypes: SESSION_TYPES,
    weather: WEATHER,
    expenseCategories: EXPENSE_CATEGORIES,
    maintenanceTypes: MAINTENANCE_TYPES,
    engineComponents: ENGINE_COMPONENTS,
  },
};

/** The same shape as the Dutch dictionary, with any text in place of the Dutch literals. */
type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof nl>;
