import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n/server";
import { COMPANY, LEGAL_REVIEWED, LEGAL_VERSION, LEGAL_VERSION_EN, MIN_ACCOUNT_AGE, PROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy — CorsaIQ",
};

const draft = !LEGAL_REVIEWED;
const link = "text-brand-300 underline";

function Dutch() {
  return (
    <>
      <section>
        <h2>1. Wie wij zijn en wie waarvoor verantwoordelijk is</h2>
        <p>
          CorsaIQ is een dienst van {COMPANY.name} ({COMPANY.legalForm}), ingeschreven bij de Kamer van Koophandel onder nummer {COMPANY.kvk},
          gevestigd op {COMPANY.address}. Vragen over privacy stel je via {COMPANY.email}.
        </p>
        <p>
          Voor de gegevens die nodig zijn voor je account, het beveiligen van de dienst, berichten over je account en je abonnement zijn wij
          verwerkingsverantwoordelijke.
        </p>
        <p>
          Wat een team in CorsaIQ vastlegt over coureurs, teamleden, karts, sessies, rondetijden, telemetrie, setups en kosten, beheert dat team zelf.
          Voor die teamgegevens is de eigenaar van de garage verwerkingsverantwoordelijke en verwerken wij de gegevens als verwerker, alleen om
          CorsaIQ te leveren en volgens de instructies van het team. Daarvoor gelden de verwerkersafspraken in artikel 9 van de{" "}
          <Link href="/voorwaarden" className={link}>
            voorwaarden
          </Link>
          .
        </p>
        <p>
          Voor een paar eigen doelen zijn we ook bij teamgegevens zelf verantwoordelijk: het beveiligen van de dienst, het voorkomen van misbruik en
          het nakomen van wettelijke plichten.
        </p>
      </section>

      <section>
        <h2>2. Welke gegevens</h2>
        <p>Welke gegevens we verwerken, hangt af van hoe jij en je team CorsaIQ gebruiken:</p>
        <ul>
          <li>
            <strong>Account en voorkeuren:</strong> e-mailadres, je naam, je wachtwoord (alleen als onleesbare hash, zie artikel 10), taal en
            weergave.
          </li>
          <li>
            <strong>Team en toegang:</strong> de garage, wie er lid is met welke rol, en uitnodigingen.
          </li>
          <li>
            <strong>Coureurs:</strong> naam, startnummer en, als het team dat invult, gewicht en licentienummer.
          </li>
          <li>
            <strong>Racen en materiaal:</strong> karts, onderdelen, evenementen, sessies, rondetijden, telemetrie uit de logger, setups, checklists,
            agenda en de feedback van de coureur (getypt of ingesproken).
          </li>
          <li>
            <strong>Kosten en bonnetjes:</strong> uitgaven en bonnetjes (foto of pdf), alleen zichtbaar voor eigenaar en monteur.
          </li>
          <li>
            <strong>Abonnement:</strong> je klantnummer bij Stripe, het gekozen abonnement, de status en de verleng- of einddatum. Kaart- en
            bankgegevens komen niet bij ons; die verwerkt Stripe (zie artikel 6).
          </li>
          <li>
            <strong>Techniek:</strong> bij elk verzoek onder meer IP-adres, tijdstip en browser in de logs van onze hosting, en foutmeldingen zonder
            naam, e-mailadres of IP-adres.
          </li>
        </ul>
        <p>
          Leg alleen vast wat nodig is. Wie als team gegevens over anderen vastlegt, zorgt zelf voor een goede grond om dat te doen en vertelt die
          mensen wat er met hun gegevens gebeurt.
        </p>
      </section>

      <section>
        <h2>3. Waarvoor en op welke grond</h2>
        <ul>
          <li>
            <strong>De dienst leveren:</strong> je account maken en beheren, inloggen, je team, je gegevens bewaren en tonen, en de functies die je
            gebruikt (uitvoering van de overeenkomst).
          </li>
          <li>
            <strong>Berichten over je account:</strong> bevestiging van je e-mailadres en een link voor een nieuw wachtwoord (uitvoering van de
            overeenkomst). We sturen geen reclame zonder je toestemming.
          </li>
          <li>
            <strong>Je abonnement:</strong> afrekenen, verlengen, wijzigen en opzeggen (uitvoering van de overeenkomst).
          </li>
          <li>
            <strong>Beveiliging en fouten oplossen:</strong> misbruik voorkomen, storingen onderzoeken en fouten verhelpen (gerechtvaardigd belang:
            een veilige en betrouwbare dienst). We gebruiken daarvoor zo weinig mogelijk gegevens; je kunt er bezwaar tegen maken.
          </li>
          <li>
            <strong>Wettelijke plichten:</strong> bijvoorbeeld bewaarplichten, alleen voor zover de wet dat vraagt (wettelijke verplichting).
          </li>
        </ul>
        <p>We verkopen geen gegevens, tonen geen advertenties en gebruiken je gegevens niet om AI-modellen te trainen.</p>
      </section>

      <section>
        <h2>4. AI-functies</h2>
        <p>Een paar functies gebruiken Claude, het AI-model van Anthropic. Wat er dan wordt verstuurd:</p>
        <ul>
          <li>
            <strong>Labels bij de feedback van de coureur</strong> (Pro en Team): als feedback wordt opgeslagen, gaat de tekst van die feedback naar
            Claude, dat er labels op zet, zoals onderstuur of een bocht. Staan er namen of andere persoonlijke dingen in de tekst, dan gaan die mee.
          </li>
          <li>
            <strong>Uitleg bij setup-advies</strong> (Pro en Team): als je om uitleg vraagt, gaan alleen de berekende verbanden mee, zoals een
            instelling, het aantal sessies en het tijdsverschil. Geen namen.
          </li>
          <li>
            <strong>Bonnetjes uitlezen</strong> (Pro en Team): als je een bonnetje toevoegt, gaat de foto of pdf naar Claude om bedrag, datum en
            omschrijving te lezen. Wat er op het bonnetje staat, gaat dus mee.
          </li>
        </ul>
        <p>
          Volgens de zakelijke voorwaarden van Anthropic worden gegevens die via de API binnenkomen niet gebruikt om modellen te trainen. Wat AI
          teruggeeft, kan onvolledig of fout zijn: controleer adviezen en uitgelezen bedragen altijd zelf. CorsaIQ neemt met AI geen besluiten over
          personen; het geeft alleen advies.
        </p>
      </section>

      <section>
        <h2>5. Spraak, locatie, weer en opslag op je apparaat</h2>
        <ul>
          <li>
            <strong>Inspreken:</strong> gebruikt de spraakherkenning van je browser. Chrome stuurt het geluid daarvoor naar Google, Safari naar Apple;
            daarop zijn hun voorwaarden van toepassing. Wij krijgen alleen de tekst die eruit komt.
          </li>
          <li>
            <strong>Locatie:</strong> de Pitwall gebruikt je locatie alleen op je eigen apparaat om het dichtstbijzijnde circuit te vinden. We sturen
            en bewaren die locatie niet.
          </li>
          <li>
            <strong>Weer:</strong> onze server vraagt het weer op bij Open-Meteo met alleen de ligging van het circuit en de datum. Open-Meteo krijgt
            geen persoonsgegevens en ziet jouw IP-adres niet.
          </li>
          <li>
            <strong>Zonder bereik:</strong> sessies en evenementen die je in de Pitwall vastlegt zonder internet, bewaart je browser op je apparaat
            tot ze verstuurd zijn.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Wie de gegevens verwerkt</h2>
        <p>Deze dienstverleners verwerken gegevens in onze opdracht:</p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>: {p.role.nl} ({p.where.nl})
            </li>
          ))}
        </ul>
        <p>
          <strong>Betalen gaat via Stripe.</strong> Stripe (met zijn dienst Link) verkoopt het abonnement als officiële verkoper en regelt de
          betaling, de factuur en de btw. Voor de betaal- en factuurgegevens die je daar invult, is Stripe zelf verwerkingsverantwoordelijke; daarop
          is de privacyverklaring van Stripe van toepassing. Wij geven Stripe je e-mailadres en de naam van je garage, en krijgen je klantnummer en de
          status van je abonnement terug.
        </p>
        <p>
          Komen gegevens buiten de Europese Economische Ruimte, of zijn ze van daaruit toegankelijk (zoals bij diensten uit de VS), dan gebeurt dat
          alleen met een geldige grondslag uit hoofdstuk V van de AVG: een adequaatheidsbesluit, zoals het EU-VS Data Privacy Framework voor bedrijven
          die daaronder vallen, of de standaardcontractbepalingen van de Europese Commissie. Welke grondslag per dienstverlener geldt, vertellen we je
          op verzoek.
        </p>
        <p>Binnen je team zien leden de gegevens volgens hun rol; kijkers en coureurs zien geen kosten.</p>
      </section>

      <section>
        <h2>7. Minderjarige coureurs</h2>
        <p>
          Een eigen account is voor mensen van {MIN_ACCOUNT_AGE} jaar en ouder. Een team kan wel gegevens over jongere coureurs vastleggen, als dat
          nodig en toegestaan is. Het team bepaalt daarvoor de grond, informeert de coureur en de ouders of verzorgers, en vraagt hun toestemming als
          die nodig is. Leg niet meer vast dan nodig is.
        </p>
      </section>

      <section>
        <h2>8. Hoe lang</h2>
        <ul>
          <li>Account- en teamgegevens bewaren we zolang het account of de garage bestaat.</li>
          <li>
            Verwijder je je account, dan zijn je gegevens en die van de garages waarvan je het enige lid was direct weg uit de app, met de geüploade
            bestanden; je klantgegevens bij Stripe verwijderen we dan ook. In back-ups blijven gegevens nog hooguit 30 dagen.
          </li>
          <li>Logs en foutmeldingen bewaren we niet langer dan nodig voor beveiliging en het oplossen van fouten, meestal enkele weken.</li>
          <li>Moeten we gegevens langer bewaren voor de wet of een geschil, dan bewaren we alleen wat daarvoor nodig is.</li>
        </ul>
      </section>

      <section>
        <h2>9. Je rechten</h2>
        <p>
          Je hebt recht op inzage, correctie, verwijdering, beperking, overdraagbaarheid en bezwaar. Berust iets op je toestemming, dan kun je die
          altijd intrekken. Veel regel je zelf:
        </p>
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
          Gaat je vraag over gegevens die een team over je heeft vastgelegd, neem dan eerst contact op met de eigenaar van die garage; wij helpen het
          team daarbij. Voor al het andere mail je {COMPANY.email}. We reageren binnen een maand; is een verzoek ingewikkeld, dan kan dat hooguit twee
          maanden langer duren, en dat laten we je dan binnen de eerste maand weten.
        </p>
        <p>
          Ben je het niet met ons eens, dan kun je een klacht indienen bij de{" "}
          <a href="https://autoriteitpersoonsgegevens.nl/" className={link}>
            Autoriteit Persoonsgegevens
          </a>
          .
        </p>
      </section>

      <section>
        <h2>10. Beveiliging</h2>
        <p>
          Verbindingen zijn versleuteld (https). Wachtwoorden worden niet leesbaar opgeslagen maar als hash, door onze inlogdienst Supabase. De
          database laat iemand alleen de gegevens zien van de teams waarvan hij lid is, en alleen wijzigen wat zijn rol toestaat. Bestanden staan in
          afgeschermde opslag per team. Geheime sleutels staan alleen op de server. Geen enkele dienst op internet is volledig veilig, maar we nemen
          de maatregelen die bij deze gegevens passen.
        </p>
      </section>

      <section>
        <h2>11. Cookies en opslag in je browser</h2>
        <p>
          We gebruiken alleen cookies die nodig zijn om de app te laten werken: om ingelogd te blijven, voor je taal en voor de garage die je kiest.
          In je browser bewaren we je thema, sessies uit de Pitwall die nog niet verstuurd zijn, en of je de melding over installeren hebt weggeklikt.
          Er zijn geen analyse- of advertentiecookies. Afrekenen gebeurt op de site van Stripe, met de cookies van Stripe.
        </p>
      </section>

      <section>
        <h2>12. Wijzigingen</h2>
        <p>
          Als we deze verklaring wijzigen, zie je dat aan de datum bovenaan. Bij belangrijke wijzigingen laten we het je weten in de app of per
          e-mail.
        </p>
      </section>
    </>
  );
}

function English() {
  return (
    <>
      <section>
        <h2>1. Who we are and who is responsible for what</h2>
        <p>
          CorsaIQ is a service of {COMPANY.name} ({COMPANY.legalForm}), registered with the Dutch Chamber of Commerce under number {COMPANY.kvk}, at{" "}
          {COMPANY.address}. Ask privacy questions at {COMPANY.email}.
        </p>
        <p>
          We are the controller for the data needed for your account, for securing the service, for messages about your account and for your
          subscription.
        </p>
        <p>
          What a team records in CorsaIQ about drivers, team members, karts, sessions, lap times, telemetry, setups and costs is managed by that team.
          For that team data the owner of the garage is the controller and we process the data as a processor, only to provide CorsaIQ and according
          to the team’s instructions. The processing terms in section 9 of the{" "}
          <Link href="/voorwaarden?lang=en" className={link}>
            terms
          </Link>{" "}
          apply.
        </p>
        <p>
          For a few purposes of our own we are responsible ourselves, also for team data: securing the service, preventing abuse and meeting legal
          obligations.
        </p>
      </section>

      <section>
        <h2>2. What data</h2>
        <p>Which data we process depends on how you and your team use CorsaIQ:</p>
        <ul>
          <li>
            <strong>Account and preferences:</strong> e-mail address, your name, your password (only as an unreadable hash, see section 10), language
            and display settings.
          </li>
          <li>
            <strong>Team and access:</strong> the garage, who is a member with which role, and invitations.
          </li>
          <li>
            <strong>Drivers:</strong> name, race number and, if the team fills them in, weight and licence number.
          </li>
          <li>
            <strong>Racing and equipment:</strong> karts, parts, events, sessions, lap times, logger telemetry, setups, checklists, calendar and the
            driver’s feedback (typed or spoken).
          </li>
          <li>
            <strong>Costs and receipts:</strong> expenses and receipts (photo or pdf), visible only to owner and mechanic.
          </li>
          <li>
            <strong>Subscription:</strong> your customer number at Stripe, the chosen plan, its status and its renewal or end date. Card and bank
            details never reach us; Stripe processes them (see section 6).
          </li>
          <li>
            <strong>Technical:</strong> with each request, among other things the IP address, time and browser in our hosting’s logs, and error
            reports without name, e-mail address or IP address.
          </li>
        </ul>
        <p>
          Record only what is needed. A team that records data about others makes sure it has a proper basis to do so and tells those people what
          happens with their data.
        </p>
      </section>

      <section>
        <h2>3. Purposes and legal basis</h2>
        <ul>
          <li>
            <strong>Providing the service:</strong> creating and managing your account, signing in, your team, storing and showing your data, and the
            features you use (performance of the contract).
          </li>
          <li>
            <strong>Messages about your account:</strong> confirming your e-mail address and a link for a new password (performance of the contract).
            We send no marketing without your consent.
          </li>
          <li>
            <strong>Your subscription:</strong> paying, renewing, changing and cancelling (performance of the contract).
          </li>
          <li>
            <strong>Security and fixing errors:</strong> preventing abuse, investigating outages and fixing errors (legitimate interest: a secure and
            reliable service). We use as little data as possible for this; you can object to it.
          </li>
          <li>
            <strong>Legal obligations:</strong> for example retention obligations, only as far as the law requires (legal obligation).
          </li>
        </ul>
        <p>We do not sell data, show no advertising and do not use your data to train AI models.</p>
      </section>

      <section>
        <h2>4. AI features</h2>
        <p>A few features use Claude, the AI model of Anthropic. What is sent:</p>
        <ul>
          <li>
            <strong>Labels on the driver’s feedback</strong> (Pro and Team): when feedback is saved, its text goes to Claude, which labels it, for
            example understeer or a corner. If the text contains names or other personal details, those go along.
          </li>
          <li>
            <strong>Explaining setup advice</strong> (Pro and Team): when you ask for an explanation, only the calculated findings go along, such as a
            setting, the number of sessions and the time difference. No names.
          </li>
          <li>
            <strong>Reading receipts</strong> (Pro and Team): when you add a receipt, the photo or pdf goes to Claude to read the amount, date and
            description. Whatever is on the receipt goes along.
          </li>
        </ul>
        <p>
          Under Anthropic’s commercial terms, data received through its API is not used to train models. What AI returns can be incomplete or wrong:
          always check advice and amounts that were read. CorsaIQ makes no decisions about people with AI; it only gives advice.
        </p>
      </section>

      <section>
        <h2>5. Speech, location, weather and storage on your device</h2>
        <ul>
          <li>
            <strong>Speaking:</strong> uses your browser’s speech recognition. Chrome sends the audio to Google for this, Safari to Apple; their terms
            apply. We only receive the resulting text.
          </li>
          <li>
            <strong>Location:</strong> the Pitwall uses your location only on your own device to find the nearest circuit. We do not send or store it.
          </li>
          <li>
            <strong>Weather:</strong> our server asks Open-Meteo for the weather with only the circuit’s location and the date. Open-Meteo receives no
            personal data and does not see your IP address.
          </li>
          <li>
            <strong>Without signal:</strong> sessions and events you record in the Pitwall without internet are kept by your browser on your device
            until they are sent.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Who processes the data</h2>
        <p>These service providers process data on our behalf:</p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>: {p.role.en} ({p.where.en})
            </li>
          ))}
        </ul>
        <p>
          <strong>Payments go through Stripe.</strong> Stripe (with its Link service) sells the subscription as the official seller and handles the
          payment, the invoice and VAT. For the payment and billing details you enter there, Stripe is the controller itself; Stripe’s privacy policy
          applies. We give Stripe your e-mail address and the name of your garage, and receive your customer number and the status of your
          subscription.
        </p>
        <p>
          Where data leaves the European Economic Area, or can be accessed from outside it (as with US services), this happens only on a valid basis
          under Chapter V of the GDPR: an adequacy decision, such as the EU-US Data Privacy Framework for companies it covers, or the European
          Commission’s standard contractual clauses. Which basis applies to each provider we tell you on request.
        </p>
        <p>Within your team, members see data according to their role; viewers and drivers do not see costs.</p>
      </section>

      <section>
        <h2>7. Drivers who are minors</h2>
        <p>
          An account of your own is for people aged {MIN_ACCOUNT_AGE} and over. A team may record data about younger drivers where that is needed and
          allowed. The team determines the basis for it, informs the driver and the parents or guardians, and asks for their consent where that is
          needed. Record no more than needed.
        </p>
      </section>

      <section>
        <h2>8. How long</h2>
        <ul>
          <li>We keep account and team data as long as the account or the garage exists.</li>
          <li>
            If you delete your account, your data and that of garages where you were the only member is gone from the app at once, with the uploaded
            files; we then also delete your customer details at Stripe. Backups keep data for at most 30 more days.
          </li>
          <li>We keep logs and error reports no longer than needed for security and fixing errors, usually a few weeks.</li>
          <li>If we must keep data longer for the law or a dispute, we keep only what is needed for that.</li>
        </ul>
      </section>

      <section>
        <h2>9. Your rights</h2>
        <p>
          You have the right of access, correction, deletion, restriction, portability and objection. Where something is based on your consent, you
          can withdraw it at any time. Much of it you do yourself:
        </p>
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
          If your question is about data a team recorded about you, first contact the owner of that garage; we help the team with it. For anything
          else, e-mail {COMPANY.email}. We reply within a month; for a complex request this can take at most two months longer, and we will tell you
          so within the first month.
        </p>
        <p>
          If you disagree with us, you can complain to the Dutch Data Protection Authority (
          <a href="https://autoriteitpersoonsgegevens.nl/" className={link}>
            Autoriteit Persoonsgegevens
          </a>
          ).
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          Connections are encrypted (https). Passwords are not stored readably but as a hash, by our sign-in service Supabase. The database shows
          someone only the data of the teams they belong to, and lets them change only what their role allows. Files are kept in protected storage per
          team. Secret keys live only on the server. No service on the internet is completely secure, but we take the measures that fit this data.
        </p>
      </section>

      <section>
        <h2>11. Cookies and storage in your browser</h2>
        <p>
          We only use cookies needed for the app to work: to keep you signed in, for your language and for the garage you choose. In your browser we
          keep your theme, Pitwall sessions not yet sent, and whether you dismissed the install hint. There are no analytics or advertising cookies.
          Checkout happens on Stripe’s site, with Stripe’s cookies.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
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
