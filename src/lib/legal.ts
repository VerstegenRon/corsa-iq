// Who offers Corsa IQ, for the privacy statement and the terms. One place to fill in; the pages show
// a placeholder in brackets until it is.

export const COMPANY = {
  name: "[BEDRIJFSNAAM]",
  legalForm: "[RECHTSVORM]",
  kvk: "[KVK-NUMMER]",
  address: "[ADRES, POSTCODE PLAATS]",
  email: "[E-MAILADRES VOOR PRIVACYVRAGEN]",
  /** The district court for disputes, usually the one of the company's seat. */
  court: "[RECHTBANK]",
};

/** Date of the current version of both texts; change it with every change of content. */
export const LEGAL_VERSION = "29 oktober 2026";
export const LEGAL_VERSION_EN = "29 October 2026";

/** Accounts are for this age and older (the Dutch age of consent under the GDPR). */
export const MIN_ACCOUNT_AGE = 16;

/** Services that process personal data for Corsa IQ, listed in both texts. */
export const PROCESSORS = [
  { name: "Supabase", role: { nl: "database, inloggen en bestandsopslag", en: "database, sign-in and file storage" }, where: { nl: "EU (Frankfurt)", en: "EU (Frankfurt)" } },
  { name: "Vercel", role: { nl: "hosting van de app", en: "hosting of the app" }, where: { nl: "EU en VS", en: "EU and US" } },
  { name: "Resend", role: { nl: "versturen van e-mails (bevestiging, nieuw wachtwoord)", en: "sending e-mails (confirmation, new password)" }, where: { nl: "EU (Ierland)", en: "EU (Ireland)" } },
  {
    name: "Anthropic (Claude)",
    role: {
      nl: "uitleg bij setup-advies, labels bij de feedback van de coureur, uitlezen van bonnetjes",
      en: "explanations of setup advice, labels on the driver's feedback, reading receipts",
    },
    where: { nl: "VS", en: "US" },
  },
] as const;
