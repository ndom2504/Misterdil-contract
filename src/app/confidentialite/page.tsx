import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Politique de confidentialité" };

const CONTACT = "contact@misterdil.ca";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updated="29 septembre 2026"
      intro="Misterdil vous aide à créer, discuter, valider, signer et archiver vos ententes professionnelles. Cette politique explique quels renseignements personnels nous recueillons, pourquoi, avec qui nous les partageons et comment exercer vos droits, conformément à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25) et à la LPRPDE."
      sections={[
        {
          title: "Responsable de la protection des renseignements",
          body: (
            <p>
              Le responsable de la protection des renseignements personnels de Misterdil répond à toute question ou demande à l&apos;adresse{" "}
              <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          ),
        },
        {
          title: "Renseignements recueillis",
          body: (
            <>
              <p>Nous recueillons uniquement ce qui sert au fonctionnement du service :</p>
              <ul>
                <li>Compte : nom, adresse courriel, organisation, rôle et mot de passe chiffré.</li>
                <li>Contenu : espaces, documents, sections, commentaires, propositions, validations et signatures.</li>
                <li>Journal : dates de connexion, historique des modifications et actions réalisées sur les documents.</li>
                <li>Microsoft 365, si vous le connectez : adresse du compte, courriels récents et réunions Teams de votre calendrier.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Connexion à Microsoft 365",
          body: (
            <>
              <p>
                La connexion Microsoft est facultative. Elle affiche vos courriels Outlook et vos réunions Teams dans votre tableau de bord. Les autorisations demandées sont : profil, lecture et gestion des courriels, envoi de réponses et lecture du calendrier.
              </p>
              <p>
                Les courriels et réunions sont lus à la demande auprès de Microsoft Graph et affichés à vous seul. Misterdil conserve uniquement les jetons d&apos;accès nécessaires, sur ses serveurs. Une action (marquer comme lu, archiver, répondre) est exécutée uniquement lorsque vous la déclenchez.
              </p>
              <p>
                Vous pouvez retirer l&apos;accès à tout moment depuis la page{" "}
                <a href="https://myapps.microsoft.com" target="_blank" rel="noreferrer">Mes applications Microsoft</a>.
              </p>
            </>
          ),
        },
        {
          title: "Utilisation des renseignements",
          body: (
            <ul>
              <li>Fournir le service : créer vos ententes, gérer la collaboration, la validation et la signature.</li>
              <li>Sécuriser les comptes : authentification, prévention de la fraude, journal des modifications.</li>
              <li>Proposer des formulations avec Misterdil AI lorsque vous le demandez.</li>
              <li>Vous informer des activités de vos documents par notifications.</li>
            </ul>
          ),
        },
        {
          title: "Assistant Misterdil AI",
          body: (
            <p>
              Lorsque vous utilisez l&apos;assistant, le passage concerné est transmis à OpenAI pour générer une proposition. Les données envoyées par l&apos;API ne servent pas à entraîner les modèles d&apos;OpenAI. Le modérateur du document reste maître du texte final.
            </p>
          ),
        },
        {
          title: "Partage et fournisseurs",
          body: (
            <>
              <p>Nous ne vendons aucun renseignement personnel. Nous partageons les renseignements uniquement avec :</p>
              <ul>
                <li>Les participants que vous invitez dans un espace ou un document, selon leur rôle.</li>
                <li>Microsoft, lorsque vous connectez votre compte Microsoft 365.</li>
                <li>OpenAI, pour les demandes adressées à l&apos;assistant.</li>
                <li>Notre hébergeur, pour le stockage sécurisé des données.</li>
              </ul>
              <p>
                Certains fournisseurs traitent des données hors du Québec, notamment aux États-Unis. Avant tout transfert, nous évaluons le niveau de protection offert et encadrons le transfert par contrat.
              </p>
            </>
          ),
        },
        {
          title: "Témoins (cookies)",
          body: (
            <p>
              Misterdil utilise uniquement des témoins essentiels : la session de connexion et une preuve temporaire de sécurité lors de la connexion Microsoft (10 minutes). Aucun témoin publicitaire ni de pistage n&apos;est utilisé.
            </p>
          ),
        },
        {
          title: "Conservation et sécurité",
          body: (
            <>
              <p>
                Les renseignements sont conservés tant que votre compte est actif, puis supprimés ou anonymisés dans un délai de 90 jours après la fermeture du compte, sauf obligation légale de conservation (par exemple pour une entente signée).
              </p>
              <p>
                Les mots de passe sont chiffrés, les échanges passent par HTTPS et l&apos;accès aux documents dépend du rôle de chaque participant. En cas d&apos;incident de confidentialité présentant un risque de préjudice sérieux, nous avisons les personnes concernées et la Commission d&apos;accès à l&apos;information.
              </p>
            </>
          ),
        },
        {
          title: "Vos droits",
          body: (
            <>
              <p>Vous pouvez en tout temps :</p>
              <ul>
                <li>Accéder à vos renseignements et en obtenir une copie dans un format technologique structuré.</li>
                <li>Faire rectifier des renseignements inexacts ou incomplets.</li>
                <li>Retirer votre consentement, notamment à la connexion Microsoft.</li>
                <li>Demander la suppression de votre compte.</li>
              </ul>
              <p>
                Écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Nous répondons dans un délai de 30 jours. Vous pouvez aussi porter plainte auprès de la{" "}
                <a href="https://www.cai.gouv.qc.ca" target="_blank" rel="noreferrer">Commission d&apos;accès à l&apos;information du Québec</a>.
              </p>
            </>
          ),
        },
        {
          title: "Modifications",
          body: <p>Toute modification importante de cette politique est annoncée dans la plateforme avant son entrée en vigueur. La date de mise à jour figure en haut de cette page.</p>,
        },
      ]}
    />
  );
}
