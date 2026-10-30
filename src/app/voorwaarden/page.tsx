import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n/server";
import { COMPANY, LEGAL_REVIEWED, LEGAL_VERSION, LEGAL_VERSION_EN, MIN_ACCOUNT_AGE, SUBPROCESSOR_NOTICE_DAYS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Voorwaarden — CorsaIQ",
};

const draft = !LEGAL_REVIEWED;

function Dutch() {
  return (
    <>
      <section>
        <h2>1. Over deze voorwaarden</h2>
        <p>
          Deze voorwaarden gelden voor het gebruik van CorsaIQ, een dienst van {COMPANY.name} ({COMPANY.legalForm}, KvK {COMPANY.kvk},{" "}
          {COMPANY.address}). Met het maken van een account ga je ermee akkoord. Hoe we met persoonsgegevens omgaan, staat in de{" "}
          <Link href="/privacy" className="text-brand-300 underline">
            privacyverklaring
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>2. Abonnementen en betalen</h2>
        <ul>
          <li>
            Er is een gratis abonnement en er zijn betaalde abonnementen. Wat elk abonnement bevat en kost, staat op de{" "}
            <Link href="/pricing" className="text-brand-300 underline">
              prijzenpagina
            </Link>
            . Zolang CorsaIQ in de opstartfase is, kun je alle functies gratis gebruiken; dat staat dan ook op de prijzenpagina.
          </li>
          <li>
            Een betaald abonnement sluit de eigenaar van de garage af, per maand of per jaar, en betaal je vooruit. Je koopt het via Stripe, dat met
            zijn dienst Link de betaling en de factuur verzorgt als verkoper. Daarom staat Link op je bon en factuur; daarvoor gelden ook de voorwaarden
            van Stripe en Link.
          </li>
          <li>
            Het abonnement wordt telkens met dezelfde periode verlengd. Je kunt het altijd opzeggen via Instellingen → Abonnement; het loopt dan door
            tot het einde van de betaalde periode, daarna ga je terug naar Gratis. Wat je al betaalde, krijg je niet terug, behalve waar de wet dat
            voorschrijft.
          </li>
          <li>
            Ga je naar een kleiner abonnement, dan blijven je gegevens bewaard. Je kunt dan alleen niet meer toevoegen dan het kleinere abonnement
            toestaat, en functies die er niet in zitten, zijn niet meer te gebruiken.
          </li>
          <li>Veranderen de prijzen, dan laten we het minstens 30 dagen van tevoren weten; je kunt dan opzeggen voordat de nieuwe prijs ingaat.</li>
        </ul>
        <p>
          CorsaIQ is volop in ontwikkeling: functies kunnen veranderen, erbij komen of verdwijnen, en de dienst kan soms niet beschikbaar zijn. We
          doen ons best om de dienst beschikbaar en je gegevens veilig te houden, maar geven geen garantie op ononderbroken beschikbaarheid.
        </p>
      </section>
      <section>
        <h2>3. Je account</h2>
        <ul>
          <li>Een account is voor mensen van {MIN_ACCOUNT_AGE} jaar en ouder.</li>
          <li>Je houdt je wachtwoord geheim en bent verantwoordelijk voor wat er met je account gebeurt.</li>
          <li>
            Als eigenaar van een garage bepaal je wie er lid is en met welke rol. Je bent verantwoordelijk voor de toegang die je anderen geeft en
            trekt die in als iemand het team verlaat.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Gebruik</h2>
        <ul>
          <li>Je gebruikt CorsaIQ voor je eigen kartteam en volgens de wet.</li>
          <li>Je probeert niet bij gegevens van andere teams te komen, de dienst te verstoren of te overbelasten.</li>
          <li>
            Je legt alleen gegevens over anderen vast als je daar een goede reden voor hebt. Voor coureurs onder de {MIN_ACCOUNT_AGE} zorg je voor
            toestemming van de ouders of verzorgers.
          </li>
        </ul>
        <p>Houd je je hier niet aan, dan kunnen we je toegang beperken of je account beëindigen.</p>
      </section>
      <section>
        <h2>5. Jouw gegevens blijven van jou</h2>
        <p>
          Wat je team vastlegt, blijft van je team. Je geeft ons alleen het recht om die gegevens te bewaren en te verwerken om de dienst te leveren.
          Je kunt je gegevens altijd downloaden en je account verwijderen via Instellingen.
        </p>
      </section>
      <section>
        <h2>6. Advies is advies</h2>
        <p>
          CorsaIQ rekent, vergelijkt en geeft adviezen over afstelling, bandenspanning, onderhoud en rijstijl, deels met behulp van AI. Dat zijn
          hulpmiddelen, geen garanties. <strong>Controleer de kart altijd zelf</strong>: de monteur en de coureur blijven verantwoordelijk voor een
          veilige kart en voor de beslissingen op de baan.
        </p>
      </section>
      <section>
        <h2>7. Aansprakelijkheid</h2>
        <p>
          We zijn niet aansprakelijk voor schade door het gebruik van adviezen of berekeningen, door tijdelijke onbeschikbaarheid of door verlies van
          gegevens buiten onze schuld. Voor zover we wel aansprakelijk zijn, is dat beperkt tot het bedrag dat je in de twaalf maanden daarvoor voor
          CorsaIQ betaalde; bij het gratis abonnement is dat nul. Dit geldt niet bij opzet of grove nalatigheid.
        </p>
      </section>
      <section>
        <h2>8. Stoppen</h2>
        <p>
          Je kunt altijd stoppen door je account te verwijderen; een lopend abonnement stopt dan ook. Wij kunnen de dienst beëindigen; dan laten we
          het minstens 30 dagen van tevoren weten, zodat je je gegevens kunt downloaden, en betaal je niet voor de periode daarna.
        </p>
      </section>
      <section>
        <h2>9. Verwerkersafspraken voor teamgegevens</h2>
        <p>
          Dit artikel is de verwerkersovereenkomst in de zin van artikel 28 AVG tussen de eigenaar van de garage (het team,
          verwerkingsverantwoordelijke) en {COMPANY.name} (wij, verwerker). Het geldt voor de persoonsgegevens die het team in CorsaIQ vastlegt en
          waarvan het team doel en middelen bepaalt.
        </p>

        <h3>9.1 Onderwerp, duur, aard en doel</h3>
        <p>
          We bewaren, ordenen, tonen, doorzoeken, exporteren en verwijderen de teamgegevens en doen wat technisch nodig is om de functies van CorsaIQ
          te leveren en te beveiligen. Dat duurt zolang het team CorsaIQ gebruikt, en daarna zolang de gegevens volgens deze afspraken of de wet nog
          bewaard moeten worden.
        </p>
        <ul>
          <li>
            <strong>Betrokkenen:</strong> coureurs, teamleden, de eigenaar en anderen van wie het team gegevens invoert.
          </li>
          <li>
            <strong>Gegevens:</strong> namen en accountgegevens, rollen en uitnodigingen, coureursgegevens (zoals startnummer, gewicht en
            licentienummer), kart- en sessiegegevens, rondetijden, telemetrie, setups, feedback, kosten, bonnetjes en de technische gegevens die bij
            het gebruik ontstaan.
          </li>
          <li>
            <strong>Bijzondere gegevens:</strong> CorsaIQ is niet bedoeld voor bijzondere persoonsgegevens, zoals gegevens over gezondheid. Het team
            legt die er niet in vast.
          </li>
        </ul>

        <h3>9.2 Instructies en doorgifte</h3>
        <p>
          We verwerken de teamgegevens alleen volgens de instructies van het team. Die instructies zijn deze afspraken en wat het team in de app
          instelt en doet. Verplicht de wet ons tot iets anders, dan laten we het team dat vooraf weten, tenzij de wet dat verbiedt. Vinden we dat een
          instructie in strijd is met de AVG, dan zeggen we dat meteen. We geven teamgegevens alleen door buiten de Europese Economische Ruimte met
          een geldige grondslag uit hoofdstuk V van de AVG, zoals beschreven in de privacyverklaring.
        </p>

        <h3>9.3 Geheimhouding en beveiliging</h3>
        <p>
          Wie bij ons met teamgegevens werkt, heeft een geheimhoudingsplicht en krijgt alleen toegang voor zover dat voor het werk nodig is. We nemen
          passende technische en organisatorische maatregelen volgens artikel 32 AVG, waaronder versleutelde verbindingen, toegang per team en rol,
          afgeschermde opslag per team, back-ups en een vaste aanpak bij incidenten. De maatregelen staan in de privacyverklaring.
        </p>

        <h3>9.4 Subverwerkers</h3>
        <p>
          Het team geeft algemene toestemming voor de subverwerkers die in de privacyverklaring staan. We leggen hun minstens dezelfde verplichtingen
          op als in deze afspraken. Willen we een subverwerker toevoegen of vervangen, dan mailen we de eigenaar minstens {SUBPROCESSOR_NOTICE_DAYS}{" "}
          dagen van tevoren. Het team kan binnen die termijn met redenen bezwaar maken. We zoeken dan samen een oplossing; lukt dat niet, dan mag het
          team de dienst opzeggen en betaalt het niets meer voor de resterende periode.
        </p>

        <h3>9.5 Hulp aan het team</h3>
        <p>
          We helpen het team bij verzoeken van betrokkenen, zoals inzage en verwijdering, onder meer met de export- en verwijderfuncties in de app.
          Krijgen wij zo een verzoek over teamgegevens, dan sturen we het door naar het team. We helpen het team ook, voor zover dat bij onze rol
          past, met beveiliging, datalekken, een gegevensbeschermingseffectbeoordeling (DPIA) en een voorafgaande raadpleging van de Autoriteit
          Persoonsgegevens (artikelen 32 tot en met 36 AVG).
        </p>

        <h3>9.6 Datalekken</h3>
        <p>
          Een inbreuk op de beveiliging die de teamgegevens raakt, melden we het team zonder onredelijke vertraging nadat we ervan weten. We vertellen
          dan wat we op dat moment weten: wat er is gebeurd, de waarschijnlijke gevolgen, wat we eraan doen en wie het team kan bereiken. Wat later
          bekend wordt, sturen we na. Het team beslist zelf of het de Autoriteit Persoonsgegevens en de betrokkenen informeert.
        </p>

        <h3>9.7 Na afloop</h3>
        <p>
          Het team kan zijn gegevens altijd downloaden. Na het einde van de dienst of na verwijdering van de garage wissen we de teamgegevens, tenzij
          de wet ons verplicht ze te bewaren. In back-ups verdwijnen ze binnen 30 dagen.
        </p>

        <h3>9.8 Informatie en audits</h3>
        <p>
          We geven het team de informatie die nodig is om aan te tonen dat we deze afspraken nakomen, zoals een beschrijving van de beveiliging en de
          subverwerkers. Is dat niet genoeg, dan mag het team een audit laten doen: hooguit eens per jaar, minstens 30 dagen van tevoren aangekondigd,
          door een onafhankelijke deskundige met geheimhoudingsplicht en zonder toegang tot gegevens van andere teams. De kosten zijn voor het team.
          Bij een datalek of op verzoek van een toezichthouder gelden de beperking van eens per jaar en de termijn van 30 dagen niet.
        </p>
      </section>
      <section>
        <h2>10. Wijzigingen en recht</h2>
        <p>
          We kunnen deze voorwaarden wijzigen; bij belangrijke wijzigingen laten we het je vooraf weten. Op deze voorwaarden is Nederlands recht van
          toepassing. Geschillen leggen we voor aan de {COMPANY.court} (’s-Hertogenbosch), tenzij de wet een andere rechter aanwijst. Vragen? Mail{" "}
          {COMPANY.email}.
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
          These terms apply to the use of CorsaIQ, a service of {COMPANY.name} ({COMPANY.legalForm}, Chamber of Commerce {COMPANY.kvk},{" "}
          {COMPANY.address}). By creating an account you agree to them. How we handle personal data is in the{" "}
          <Link href="/privacy?lang=en" className="text-brand-300 underline">
            privacy statement
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>2. Plans and payment</h2>
        <ul>
          <li>
            There is a free plan and there are paid plans. What each plan includes and costs is on the{" "}
            <Link href="/pricing" className="text-brand-300 underline">
              pricing page
            </Link>
            . As long as CorsaIQ is in its launch phase, you can use every feature for free; the pricing page then says so too.
          </li>
          <li>
            A paid plan is taken out by the owner of the garage, per month or per year, and paid in advance. You buy it through Stripe, which, with
            its Link service, handles the payment and the invoice as the seller. That is why Link appears on your receipt and invoice; the terms of Stripe
            and Link apply to that as well.
          </li>
          <li>
            The plan renews for the same period each time. You can cancel at any time in Settings → Subscription; it then runs until the end of the
            paid period, after which you are back on Free. What you already paid is not refunded, except where the law requires it.
          </li>
          <li>
            If you move to a smaller plan, your data is kept. You just cannot add more than the smaller plan allows, and features it does not include
            can no longer be used.
          </li>
          <li>If prices change, we tell you at least 30 days in advance; you can then cancel before the new price applies.</li>
        </ul>
        <p>
          CorsaIQ is under active development: features may change, be added or be removed, and the service may sometimes be unavailable. We do our
          best to keep the service available and your data safe, but we give no guarantee of uninterrupted availability.
        </p>
      </section>
      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>An account is for people aged {MIN_ACCOUNT_AGE} and over.</li>
          <li>You keep your password secret and are responsible for what happens with your account.</li>
          <li>
            As the owner of a garage you decide who is a member and with which role. You are responsible for the access you give others and withdraw
            it when someone leaves the team.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Use</h2>
        <ul>
          <li>You use CorsaIQ for your own karting team and within the law.</li>
          <li>You do not try to reach other teams’ data, or to disrupt or overload the service.</li>
          <li>
            You only record data about others when you have good reason to. For drivers under {MIN_ACCOUNT_AGE} you make sure parents or guardians
            consent.
          </li>
        </ul>
        <p>If you do not keep to this, we may limit your access or end your account.</p>
      </section>
      <section>
        <h2>5. Your data stays yours</h2>
        <p>
          What your team records stays your team’s. You only give us the right to store and process it to provide the service. You can always download
          your data and delete your account in Settings.
        </p>
      </section>
      <section>
        <h2>6. Advice is advice</h2>
        <p>
          CorsaIQ calculates, compares and gives advice on setup, tyre pressure, maintenance and driving, partly with the help of AI. These are aids,
          not guarantees. <strong>Always check the kart yourself</strong>: the mechanic and the driver remain responsible for a safe kart and for the
          decisions on track.
        </p>
      </section>
      <section>
        <h2>7. Liability</h2>
        <p>
          We are not liable for damage from using advice or calculations, from temporary unavailability or from loss of data not caused by us. Where
          we are liable, it is limited to what you paid for CorsaIQ in the twelve months before; on the free plan that is zero. This does not apply to
          intent or gross negligence.
        </p>
      </section>
      <section>
        <h2>8. Stopping</h2>
        <p>
          You can stop at any time by deleting your account; a running subscription then stops too. We may end the service; we will tell you at least
          30 days in advance, so you can download your data, and you do not pay for the period after that.
        </p>
      </section>
      <section>
        <h2>9. Processing terms for team data</h2>
        <p>
          This section is the processing agreement within the meaning of Article 28 GDPR between the owner of the garage (the team, controller) and{" "}
          {COMPANY.name} (we, processor). It applies to the personal data the team records in CorsaIQ and whose purposes and means the team
          determines.
        </p>

        <h3>9.1 Subject, duration, nature and purpose</h3>
        <p>
          We store, organise, show, search, export and delete the team data and do what is technically needed to provide and secure the features of
          CorsaIQ. This lasts as long as the team uses CorsaIQ, and after that as long as the data must still be kept under these terms or the law.
        </p>
        <ul>
          <li>
            <strong>Data subjects:</strong> drivers, team members, the owner and others whose data the team enters.
          </li>
          <li>
            <strong>Data:</strong> names and account details, roles and invitations, driver details (such as race number, weight and licence number),
            kart and session data, lap times, telemetry, setups, feedback, costs, receipts and the technical data that arises from use.
          </li>
          <li>
            <strong>Special categories:</strong> CorsaIQ is not meant for special categories of personal data, such as health data. The team does not
            record them in it.
          </li>
        </ul>

        <h3>9.2 Instructions and transfers</h3>
        <p>
          We process the team data only on the team’s instructions. Those instructions are these terms and what the team sets and does in the app. If
          the law requires us to do otherwise, we tell the team in advance, unless the law forbids that. If we think an instruction breaks the GDPR,
          we say so at once. We transfer team data outside the European Economic Area only on a valid basis under Chapter V of the GDPR, as described
          in the privacy statement.
        </p>

        <h3>9.3 Confidentiality and security</h3>
        <p>
          Anyone at our side who works with team data is bound to confidentiality and gets access only as far as the work needs. We take appropriate
          technical and organisational measures under Article 32 GDPR, including encrypted connections, access per team and role, protected storage
          per team, backups and a set approach to incidents. The measures are in the privacy statement.
        </p>

        <h3>9.4 Sub-processors</h3>
        <p>
          The team gives general authorisation for the sub-processors listed in the privacy statement. We impose at least the same obligations on them
          as in these terms. If we want to add or replace a sub-processor, we e-mail the owner at least {SUBPROCESSOR_NOTICE_DAYS} days in advance.
          Within that period the team can object with reasons. We then look for a solution together; if that fails, the team may cancel the service
          and pays nothing more for the remaining period.
        </p>

        <h3>9.5 Help for the team</h3>
        <p>
          We help the team with requests from data subjects, such as access and deletion, among other things with the export and delete functions in
          the app. If we receive such a request about team data, we pass it on to the team. As far as our role allows, we also help the team with
          security, data breaches, a data protection impact assessment (DPIA) and prior consultation of the Dutch Data Protection Authority (Articles
          32 to 36 GDPR).
        </p>

        <h3>9.6 Data breaches</h3>
        <p>
          We report a security breach affecting the team data to the team without undue delay after we become aware of it. We tell what we know at
          that moment: what happened, the likely consequences, what we do about it and whom the team can reach. What becomes known later, we send on.
          The team decides itself whether to inform the Dutch Data Protection Authority and the data subjects.
        </p>

        <h3>9.7 Afterwards</h3>
        <p>
          The team can always download its data. After the end of the service or deletion of the garage we erase the team data, unless the law
          requires us to keep it. In backups it disappears within 30 days.
        </p>

        <h3>9.8 Information and audits</h3>
        <p>
          We give the team the information needed to show that we keep to these terms, such as a description of the security and the sub-processors.
          If that is not enough, the team may have an audit done: at most once a year, announced at least 30 days in advance, by an independent expert
          bound to confidentiality and without access to other teams’ data. The costs are for the team. In case of a data breach or at the request of
          a supervisory authority, the once-a-year limit and the 30-day period do not apply.
        </p>
      </section>
      <section>
        <h2>10. Changes and law</h2>
        <p>
          We may change these terms; for important changes we tell you in advance. Dutch law applies to these terms. Disputes go to the{" "}
          {COMPANY.court} (’s-Hertogenbosch) in the Netherlands, unless the law points to another court. Questions? E-mail {COMPANY.email}.
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
      draftNotice={draft ? "Draft: this text is still being reviewed." : undefined}
    >
      <English />
    </LegalPage>
  ) : (
    <LegalPage
      title="Voorwaarden"
      version={`Versie ${LEGAL_VERSION}`}
      switchTo={{ href: "/voorwaarden?lang=en", label: "English" }}
      draftNotice={draft ? "Concept: deze tekst wordt nog juridisch nagekeken." : undefined}
    >
      <Dutch />
    </LegalPage>
  );
}
