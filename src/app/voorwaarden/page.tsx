import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n/server";
import { COMPANY, LEGAL_VERSION, LEGAL_VERSION_EN, MIN_ACCOUNT_AGE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Voorwaarden — Corsa IQ",
};

const draft = COMPANY.name.startsWith("[");

function Dutch() {
  return (
    <>
      <section>
        <h2>1. Over deze voorwaarden</h2>
        <p>
          Deze voorwaarden gelden voor het gebruik van Corsa IQ, een dienst van {COMPANY.name} ({COMPANY.legalForm}, KvK {COMPANY.kvk}, {COMPANY.address}). Met
          het maken van een account ga je ermee akkoord. Hoe we met persoonsgegevens omgaan, staat in de{" "}
          <Link href="/privacy" className="text-brand-300 underline">
            privacyverklaring
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>2. Bèta</h2>
        <p>
          Corsa IQ is in een gesloten bèta en is in die periode gratis. Functies kunnen veranderen, erbij komen of verdwijnen, en de dienst kan soms niet
          beschikbaar zijn. We doen ons best om je gegevens veilig te bewaren, maar geven in de bèta geen garantie op beschikbaarheid. Als er later betaalde
          plannen komen, hoor je dat ruim van tevoren en kies je zelf of je doorgaat.
        </p>
      </section>
      <section>
        <h2>3. Je account</h2>
        <ul>
          <li>Een account is voor mensen van {MIN_ACCOUNT_AGE} jaar en ouder.</li>
          <li>Je houdt je wachtwoord geheim en bent verantwoordelijk voor wat er met je account gebeurt.</li>
          <li>
            Als eigenaar van een garage bepaal je wie er lid is en met welke rol. Je bent verantwoordelijk voor de toegang die je anderen geeft en trekt die in als
            iemand het team verlaat.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Gebruik</h2>
        <ul>
          <li>Je gebruikt Corsa IQ voor je eigen kartteam en volgens de wet.</li>
          <li>Je probeert niet bij gegevens van andere teams te komen, de dienst te verstoren of te overbelasten.</li>
          <li>
            Je legt alleen gegevens over anderen vast als je daar een goede reden voor hebt. Voor coureurs onder de {MIN_ACCOUNT_AGE} zorg je voor toestemming van
            de ouders of verzorgers.
          </li>
        </ul>
        <p>Houd je je hier niet aan, dan kunnen we je toegang beperken of je account beëindigen.</p>
      </section>
      <section>
        <h2>5. Jouw gegevens blijven van jou</h2>
        <p>
          Wat je team vastlegt, blijft van je team. Je geeft ons alleen het recht om die gegevens te bewaren en te verwerken om de dienst te leveren. Je kunt je
          gegevens altijd downloaden en je account verwijderen via Instellingen.
        </p>
      </section>
      <section>
        <h2>6. Advies is advies</h2>
        <p>
          Corsa IQ rekent, vergelijkt en geeft adviezen over afstelling, bandenspanning, onderhoud en rijstijl, deels met behulp van AI. Dat zijn hulpmiddelen,
          geen garanties. <strong>Controleer de kart altijd zelf</strong>: de monteur en de coureur blijven verantwoordelijk voor een veilige kart en voor de
          beslissingen op de baan.
        </p>
      </section>
      <section>
        <h2>7. Aansprakelijkheid</h2>
        <p>
          We zijn niet aansprakelijk voor schade door het gebruik van adviezen of berekeningen, door tijdelijke onbeschikbaarheid of door verlies van gegevens
          buiten onze schuld. Voor zover we wel aansprakelijk zijn, is dat beperkt tot het bedrag dat je ons in de twaalf maanden daarvoor betaalde; in de gratis
          bèta is dat nul. Dit geldt niet bij opzet of grove nalatigheid.
        </p>
      </section>
      <section>
        <h2>8. Stoppen</h2>
        <p>
          Je kunt altijd stoppen door je account te verwijderen. Wij kunnen de bèta of de dienst beëindigen; dan laten we het minstens 30 dagen van tevoren weten,
          zodat je je gegevens kunt downloaden.
        </p>
      </section>
      <section>
        <h2>9. Verwerkersafspraken voor teamgegevens</h2>
        <p>
          Voor de gegevens die een team vastlegt over coureurs, teamleden en sessies is de eigenaar van de garage verwerkingsverantwoordelijke en zijn wij verwerker.
          Daarvoor gelden deze afspraken, als verwerkersovereenkomst in de zin van artikel 28 AVG:
        </p>
        <ul>
          <li>We verwerken de gegevens alleen om de dienst te leveren en volgens de instructies die het team via de app geeft.</li>
          <li>Iedereen die bij ons met de gegevens werkt, heeft een geheimhoudingsplicht.</li>
          <li>We nemen passende beveiligingsmaatregelen, zoals beschreven in de privacyverklaring.</li>
          <li>
            We schakelen alleen de subverwerkers in die in de privacyverklaring staan. Komt er een bij, dan melden we dat vooraf; het team kan dan bezwaar maken of
            stoppen.
          </li>
          <li>We helpen het team bij verzoeken van betrokkenen, zoals inzage en verwijdering, onder meer met de export- en verwijderfuncties.</li>
          <li>Een datalek dat de teamgegevens raakt, melden we zonder onredelijke vertraging en uiterlijk binnen 48 uur nadat we het ontdekten.</li>
          <li>Na het einde van de dienst of na verwijdering van de garage wissen we de gegevens, met uitzondering van back-ups, die binnen 30 dagen verlopen.</li>
          <li>We geven het team de informatie die nodig is om aan te tonen dat deze afspraken worden nageleefd.</li>
        </ul>
      </section>
      <section>
        <h2>10. Wijzigingen en recht</h2>
        <p>
          We kunnen deze voorwaarden wijzigen; bij belangrijke wijzigingen laten we het je vooraf weten. Op deze voorwaarden is Nederlands recht van toepassing.
          Geschillen leggen we voor aan de {COMPANY.court}, tenzij de wet een andere rechter aanwijst. Vragen? Mail {COMPANY.email}.
        </p>
      </section>
    </>
  );
}

function English() {
  return (
    <>
      <section>
        <h2>1. About these terms</h2>
        <p>
          These terms apply to the use of Corsa IQ, a service of {COMPANY.name} ({COMPANY.legalForm}, Chamber of Commerce {COMPANY.kvk}, {COMPANY.address}). By
          creating an account you agree to them. How we handle personal data is in the{" "}
          <Link href="/privacy?lang=en" className="text-brand-300 underline">
            privacy statement
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>2. Beta</h2>
        <p>
          Corsa IQ is in a closed beta and is free during that period. Features may change, be added or be removed, and the service may sometimes be unavailable.
          We do our best to keep your data safe, but during the beta we give no guarantee of availability. If paid plans come later, you will hear well in advance
          and decide yourself whether to continue.
        </p>
      </section>
      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>An account is for people aged {MIN_ACCOUNT_AGE} and over.</li>
          <li>You keep your password secret and are responsible for what happens with your account.</li>
          <li>
            As the owner of a garage you decide who is a member and with which role. You are responsible for the access you give others and withdraw it when
            someone leaves the team.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Use</h2>
        <ul>
          <li>You use Corsa IQ for your own karting team and within the law.</li>
          <li>You do not try to reach other teams’ data, or to disrupt or overload the service.</li>
          <li>
            You only record data about others when you have good reason to. For drivers under {MIN_ACCOUNT_AGE} you make sure parents or guardians consent.
          </li>
        </ul>
        <p>If you do not keep to this, we may limit your access or end your account.</p>
      </section>
      <section>
        <h2>5. Your data stays yours</h2>
        <p>
          What your team records stays your team’s. You only give us the right to store and process it to provide the service. You can always download your data
          and delete your account in Settings.
        </p>
      </section>
      <section>
        <h2>6. Advice is advice</h2>
        <p>
          Corsa IQ calculates, compares and gives advice on setup, tyre pressure, maintenance and driving, partly with the help of AI. These are aids, not
          guarantees. <strong>Always check the kart yourself</strong>: the mechanic and the driver remain responsible for a safe kart and for the decisions on
          track.
        </p>
      </section>
      <section>
        <h2>7. Liability</h2>
        <p>
          We are not liable for damage from using advice or calculations, from temporary unavailability or from loss of data not caused by us. Where we are liable,
          it is limited to what you paid us in the twelve months before; in the free beta that is zero. This does not apply to intent or gross negligence.
        </p>
      </section>
      <section>
        <h2>8. Stopping</h2>
        <p>
          You can stop at any time by deleting your account. We may end the beta or the service; we will tell you at least 30 days in advance, so you can download
          your data.
        </p>
      </section>
      <section>
        <h2>9. Processing terms for team data</h2>
        <p>
          For the data a team records about drivers, team members and sessions, the owner of the garage is the controller and we are the processor. These terms
          apply, as a processing agreement within the meaning of Article 28 GDPR:
        </p>
        <ul>
          <li>We process the data only to provide the service and according to the instructions the team gives through the app.</li>
          <li>Everyone at our side who works with the data is bound to confidentiality.</li>
          <li>We take appropriate security measures, as described in the privacy statement.</li>
          <li>
            We only use the sub-processors listed in the privacy statement. If one is added, we announce it in advance; the team can then object or stop.
          </li>
          <li>We help the team with requests from data subjects, such as access and deletion, among other things with the export and delete functions.</li>
          <li>We report a data breach affecting the team data without undue delay and at the latest within 48 hours of discovering it.</li>
          <li>After the end of the service or deletion of the garage we erase the data, except backups, which expire within 30 days.</li>
          <li>We give the team the information needed to show that these terms are complied with.</li>
        </ul>
      </section>
      <section>
        <h2>10. Changes and law</h2>
        <p>
          We may change these terms; for important changes we tell you in advance. Dutch law applies to these terms. Disputes go to the {COMPANY.court} in the
          Netherlands, unless the law points to another court. Questions? E-mail {COMPANY.email}.
        </p>
      </section>
    </>
  );
}

/** The terms of use, including the processing terms for team data. Dutch is binding, English a translation. */
export default async function TermsPage({ searchParams }: PageProps<"/voorwaarden">) {
  const [{ lang }, locale] = await Promise.all([searchParams, getLocale()]);
  const english = lang === "en" || (lang !== "nl" && locale !== "nl");
  return english ? (
    <LegalPage
      title="Terms of use"
      version={`Version ${LEGAL_VERSION_EN} · translation; the Dutch text is binding`}
      switchTo={{ href: "/voorwaarden?lang=nl", label: "Nederlands" }}
      draftNotice={draft ? "Draft: the company details are still to be filled in and the text is to be reviewed." : undefined}
    >
      <English />
    </LegalPage>
  ) : (
    <LegalPage
      title="Voorwaarden"
      version={`Versie ${LEGAL_VERSION}`}
      switchTo={{ href: "/voorwaarden?lang=en", label: "English" }}
      draftNotice={draft ? "Concept: de bedrijfsgegevens moeten nog worden ingevuld en de tekst moet nog worden nagekeken." : undefined}
    >
      <Dutch />
    </LegalPage>
  );
}
