import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n/server";
import { COMPANY, LEGAL_REVIEWED, LEGAL_VERSION, LEGAL_VERSION_EN, MIN_ACCOUNT_AGE, PROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy — Corsa IQ",
};

const draft = !LEGAL_REVIEWED;

function Dutch() {
  return (
    <>
      <section>
        <h2>1. Wie wij zijn</h2>
        <p>
          Corsa IQ is een dienst van {COMPANY.name} ({COMPANY.legalForm}), ingeschreven bij de Kamer van Koophandel onder nummer {COMPANY.kvk}, gevestigd op{" "}
          {COMPANY.address}. Vragen over privacy stel je via {COMPANY.email}.
        </p>
        <p>
          Voor je account zijn wij verantwoordelijk voor je gegevens. Wat een team in Corsa IQ vastlegt over zijn coureurs, karts en sessies, beheert dat team
          zelf: de eigenaar van de garage is daarvoor verantwoordelijk en wij verwerken die gegevens in opdracht (zie de verwerkersafspraken in de{" "}
          <Link href="/voorwaarden" className="text-brand-300 underline">
            voorwaarden
          </Link>
          ).
        </p>
      </section>
      <section>
        <h2>2. Welke gegevens</h2>
        <ul>
          <li>
            <strong>Account:</strong> e-mailadres, je naam, je wachtwoord (alleen versleuteld opgeslagen), taal en weergave.
          </li>
          <li>
            <strong>Team:</strong> de garage, wie er lid is en met welke rol, en uitnodigingen.
          </li>
          <li>
            <strong>Coureurs:</strong> naam, startnummer en, als het team dat invult, gewicht en licentienummer.
          </li>
          <li>
            <strong>Racen en materiaal:</strong> karts, onderdelen, evenementen, sessies, rondetijden, telemetrie uit de logger, setups, checklists, agenda en de
            feedback van de coureur (getypt of ingesproken).
          </li>
          <li>
            <strong>Kosten:</strong> uitgaven en bonnetjes, alleen zichtbaar voor eigenaar en monteur.
          </li>
          <li>
            <strong>Techniek:</strong> loggegevens zoals IP-adres en tijdstip bij elk verzoek, voor beveiliging en het oplossen van fouten.
          </li>
        </ul>
        <p>
          Inspreken gaat via de spraakherkenning van je browser (bijvoorbeeld Google of Apple); alleen de tekst die daaruit komt, slaan wij op. Je locatie in de
          Pitwall gebruiken we alleen op je eigen apparaat om het dichtstbijzijnde circuit te vinden; die slaan we niet op. Voor het weer sturen we alleen de
          ligging van het circuit naar Open-Meteo, geen persoonsgegevens.
        </p>
      </section>
      <section>
        <h2>3. Waarvoor en op welke grond</h2>
        <ul>
          <li>Om de dienst te leveren die je gebruikt: inloggen, je team, je gegevens bewaren en tonen (uitvoering van de overeenkomst).</li>
          <li>Om e-mails te sturen die bij je account horen, zoals bevestiging en een nieuw wachtwoord (uitvoering van de overeenkomst).</li>
          <li>Om de dienst veilig te houden en fouten op te lossen (gerechtvaardigd belang).</li>
          <li>Voor de slimme functies die je zelf start, zoals uitleg bij setup-advies of het uitlezen van een bonnetje (uitvoering van de overeenkomst).</li>
        </ul>
        <p>We verkopen geen gegevens, tonen geen advertenties en gebruiken je gegevens niet om AI-modellen te trainen.</p>
      </section>
      <section>
        <h2>4. Minderjarigen</h2>
        <p>
          Een account is voor mensen van {MIN_ACCOUNT_AGE} jaar en ouder. Jongere coureurs krijgen geen eigen account: een ouder of het team legt hun gegevens
          vast. Het team zorgt daarbij voor toestemming van de ouders of verzorgers, en legt niet meer vast dan nodig is.
        </p>
      </section>
      <section>
        <h2>5. Wie de gegevens verwerkt</h2>
        <p>Wij werken met deze dienstverleners, die gegevens alleen voor ons verwerken:</p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>: {p.role.nl} ({p.where.nl})
            </li>
          ))}
        </ul>
        <p>
          Waar gegevens buiten de EU komen (de VS), gebeurt dat op basis van het EU-VS Data Privacy Framework of de standaardcontractbepalingen van de Europese
          Commissie. Binnen je team zien leden de gegevens volgens hun rol; kijkers en coureurs zien geen kosten.
        </p>
      </section>
      <section>
        <h2>6. Hoe lang</h2>
        <p>
          We bewaren je gegevens zolang je account bestaat. Verwijder je je account, dan zijn je gegevens direct weg uit de app; in back-ups blijven ze nog
          hooguit 30 dagen. Loggegevens bewaren we niet langer dan nodig, meestal enkele weken.
        </p>
      </section>
      <section>
        <h2>7. Je rechten</h2>
        <p>Je hebt recht op inzage, correctie, verwijdering, beperking, overdraagbaarheid en bezwaar. Het meeste regel je zelf:</p>
        <ul>
          <li>
            <strong>Inzage en overdraagbaarheid:</strong> Instellingen → Je gegevens en account → Download je gegevens.
          </li>
          <li>
            <strong>Correctie:</strong> pas het aan in de app.
          </li>
          <li>
            <strong>Verwijdering:</strong> Instellingen → Account verwijderen.
          </li>
        </ul>
        <p>
          Voor de rest mail je {COMPANY.email}; we reageren binnen een maand. Ben je het niet met ons eens, dan kun je een klacht indienen bij de Autoriteit
          Persoonsgegevens.
        </p>
      </section>
      <section>
        <h2>8. Beveiliging</h2>
        <p>
          Verbindingen zijn versleuteld (https). Wachtwoorden slaan we versleuteld op. De database laat iemand alleen de gegevens zien van de teams waarvan hij lid
          is, en alleen wijzigen wat zijn rol toestaat. Bestanden staan in afgeschermde opslag per team.
        </p>
      </section>
      <section>
        <h2>9. Cookies</h2>
        <p>
          We gebruiken alleen cookies die nodig zijn om de app te laten werken: om ingelogd te blijven, voor je taal en voor de garage die je kiest. Je thema
          bewaren we in je browser. Er zijn geen analyse- of advertentiecookies.
        </p>
      </section>
      <section>
        <h2>10. Wijzigingen</h2>
        <p>Als we deze verklaring wijzigen, zie je dat aan de datum bovenaan. Bij belangrijke wijzigingen laten we het je weten in de app of per e-mail.</p>
      </section>
    </>
  );
}

function English() {
  return (
    <>
      <section>
        <h2>1. Who we are</h2>
        <p>
          Corsa IQ is a service of {COMPANY.name} ({COMPANY.legalForm}), registered with the Dutch Chamber of Commerce under number {COMPANY.kvk}, at{" "}
          {COMPANY.address}. Ask privacy questions at {COMPANY.email}.
        </p>
        <p>
          For your account we are responsible for your data. What a team records in Corsa IQ about its drivers, karts and sessions is managed by that team: the
          owner of the garage is responsible for it and we process that data on its behalf (see the processing terms in the{" "}
          <Link href="/voorwaarden?lang=en" className="text-brand-300 underline">
            terms
          </Link>
          ).
        </p>
      </section>
      <section>
        <h2>2. What data</h2>
        <ul>
          <li>
            <strong>Account:</strong> e-mail address, your name, your password (stored only encrypted), language and display settings.
          </li>
          <li>
            <strong>Team:</strong> the garage, who is a member with which role, and invitations.
          </li>
          <li>
            <strong>Drivers:</strong> name, race number and, if the team fills them in, weight and licence number.
          </li>
          <li>
            <strong>Racing and equipment:</strong> karts, parts, events, sessions, lap times, logger telemetry, setups, checklists, calendar and the driver’s
            feedback (typed or spoken).
          </li>
          <li>
            <strong>Costs:</strong> expenses and receipts, visible only to owner and mechanic.
          </li>
          <li>
            <strong>Technical:</strong> log data such as IP address and time of each request, for security and fixing errors.
          </li>
        </ul>
        <p>
          Speaking uses your browser’s speech recognition (for example Google or Apple); we only store the resulting text. Your location in the Pitwall is used
          only on your own device to find the nearest circuit; we do not store it. For the weather we only send the circuit’s location to Open-Meteo, no personal
          data.
        </p>
      </section>
      <section>
        <h2>3. Purposes and legal basis</h2>
        <ul>
          <li>To provide the service you use: signing in, your team, storing and showing your data (performance of the contract).</li>
          <li>To send e-mails that belong to your account, such as confirmation and a new password (performance of the contract).</li>
          <li>To keep the service secure and fix errors (legitimate interest).</li>
          <li>For the smart features you start yourself, such as explaining setup advice or reading a receipt (performance of the contract).</li>
        </ul>
        <p>We do not sell data, show no advertising and do not use your data to train AI models.</p>
      </section>
      <section>
        <h2>4. Minors</h2>
        <p>
          An account is for people aged {MIN_ACCOUNT_AGE} and over. Younger drivers do not get their own account: a parent or the team records their data. The
          team makes sure parents or guardians consent, and records no more than needed.
        </p>
      </section>
      <section>
        <h2>5. Who processes the data</h2>
        <p>We work with these service providers, who process data only for us:</p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>: {p.role.en} ({p.where.en})
            </li>
          ))}
        </ul>
        <p>
          Where data leaves the EU (the US), this is based on the EU-US Data Privacy Framework or the European Commission’s standard contractual clauses. Within
          your team, members see data according to their role; viewers and drivers do not see costs.
        </p>
      </section>
      <section>
        <h2>6. How long</h2>
        <p>
          We keep your data as long as your account exists. If you delete your account, your data is gone from the app at once; backups keep it for at most 30
          more days. We keep log data no longer than needed, usually a few weeks.
        </p>
      </section>
      <section>
        <h2>7. Your rights</h2>
        <p>You have the right of access, correction, deletion, restriction, portability and objection. Most of it you do yourself:</p>
        <ul>
          <li>
            <strong>Access and portability:</strong> Settings → “Je gegevens en account” → “Download je gegevens”.
          </li>
          <li>
            <strong>Correction:</strong> change it in the app.
          </li>
          <li>
            <strong>Deletion:</strong> Settings → “Account verwijderen”.
          </li>
        </ul>
        <p>
          For anything else, e-mail {COMPANY.email}; we reply within a month. If you disagree with us, you can complain to the Dutch Data Protection Authority
          (Autoriteit Persoonsgegevens).
        </p>
      </section>
      <section>
        <h2>8. Security</h2>
        <p>
          Connections are encrypted (https). Passwords are stored encrypted. The database shows someone only the data of the teams they belong to, and lets them
          change only what their role allows. Files are kept in protected storage per team.
        </p>
      </section>
      <section>
        <h2>9. Cookies</h2>
        <p>
          We only use cookies needed for the app to work: to keep you signed in, for your language and for the garage you choose. Your theme is kept in your
          browser. There are no analytics or advertising cookies.
        </p>
      </section>
      <section>
        <h2>10. Changes</h2>
        <p>When we change this statement, the date at the top changes. For important changes we tell you in the app or by e-mail.</p>
      </section>
    </>
  );
}

/** The privacy statement: Dutch is the binding version, English a translation. */
export default async function PrivacyPage({ searchParams }: PageProps<"/privacy">) {
  const [{ lang }, locale] = await Promise.all([searchParams, getLocale()]);
  const english = lang === "en" || (lang !== "nl" && locale !== "nl");
  return english ? (
    <LegalPage
      title="Privacy statement"
      version={`Version ${LEGAL_VERSION_EN} · translation; the Dutch text is binding`}
      switchTo={{ href: "/privacy?lang=nl", label: "Nederlands" }}
      draftNotice={draft ? "Draft: this text is still being reviewed." : undefined}
    >
      <English />
    </LegalPage>
  ) : (
    <LegalPage
      title="Privacyverklaring"
      version={`Versie ${LEGAL_VERSION}`}
      switchTo={{ href: "/privacy?lang=en", label: "English" }}
      draftNotice={draft ? "Concept: deze tekst wordt nog juridisch nagekeken." : undefined}
    >
      <Dutch />
    </LegalPage>
  );
}
