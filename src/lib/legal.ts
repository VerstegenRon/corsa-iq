// Who offers CorsaIQ, for the privacy statement and the terms.

export const COMPANY = {
  name: "Corsa Events",
  legalForm: "eenmanszaak",
  kvk: "67676715",
  address: "Laan van Selis 102, 5283 PG Boxtel",
  email: "privacy@corsaiq.com",
  /** The district court for disputes: the one of the company's seat (Boxtel). */
  court: "Rechtbank Oost-Brabant",
};

/** Set to true once a lawyer has reviewed both texts; until then the pages say they are a draft. */
export const LEGAL_REVIEWED = false;

/** Date of the current version of both texts; change it with every change of content. */
export const LEGAL_VERSION = "30 oktober 2026";
export const LEGAL_VERSION_EN = "30 October 2026";

/** Accounts are for this age and older (the Dutch age of consent under the GDPR). */
export const MIN_ACCOUNT_AGE = 16;

/** Services that process personal data on behalf of CorsaIQ (processors and sub-processors), listed in both texts. */
export const PROCESSORS = [
  {
    name: "Supabase",
    role: { nl: "database, inloggen en bestandsopslag", en: "database, sign-in and file storage" },
    where: { nl: "EU (Frankfurt)", en: "EU (Frankfurt)" },
  },
  { name: "Vercel", role: { nl: "hosting van de app", en: "hosting of the app" }, where: { nl: "EU en VS", en: "EU and US" } },
  {
    name: "Sentry",
    role: { nl: "foutmeldingen, zonder naam, e-mailadres of IP-adres", en: "error reports, without name, e-mail address or IP address" },
    where: { nl: "EU (Frankfurt)", en: "EU (Frankfurt)" },
  },
  {
    name: "Resend",
    role: { nl: "versturen van e-mails (bevestiging, nieuw wachtwoord)", en: "sending e-mails (confirmation, new password)" },
    where: { nl: "EU (Ierland)", en: "EU (Ireland)" },
  },
  {
    name: "Anthropic (Claude)",
    role: {
      nl: "uitleg bij setup-advies, labels bij de feedback van de coureur, uitlezen van bonnetjes",
      en: "explanations of setup advice, labels on the driver's feedback, reading receipts",
    },
    where: { nl: "VS", en: "US" },
  },
] as const;

/** How many days before a new or replaced sub-processor starts the owners hear of it (terms, section 9). */
export const SUBPROCESSOR_NOTICE_DAYS = 14;
