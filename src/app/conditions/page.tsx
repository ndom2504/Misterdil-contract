import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

const CONTACT = "contact@misterdil.ca";

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      updated="29 septembre 2026"
      intro="Ces conditions encadrent l'utilisation de Misterdil, la plateforme pour créer, discuter, valider, signer et archiver des ententes professionnelles. En créant un compte ou en utilisant le service, vous les acceptez."
      sections={[
        {
          title: "Le service",
          body: (
            <p>
              Misterdil fournit des espaces de travail, un éditeur d&apos;ententes structuré par sections, des outils de discussion, de validation et de signature, un assistant de rédaction (Misterdil AI) et une connexion facultative à Microsoft 365 pour Outlook et Teams.
            </p>
          ),
        },
        {
          title: "Compte",
          body: (
            <ul>
              <li>Vous fournissez des renseignements exacts et les tenez à jour.</li>
              <li>Vous gardez vos identifiants confidentiels et nous avisez de tout accès non autorisé.</li>
              <li>Vous êtes responsable des actions effectuées depuis votre compte.</li>
              <li>Lorsque vous utilisez Misterdil pour une organisation, vous confirmez avoir l&apos;autorité de l&apos;engager.</li>
            </ul>
          ),
        },
        {
          title: "Votre contenu",
          body: (
            <>
              <p>
                Vous restez propriétaire des documents, commentaires et fichiers que vous déposez. Vous accordez à Misterdil une licence limitée pour les héberger, les afficher aux participants que vous invitez et les traiter afin de fournir le service.
              </p>
              <p>Vous garantissez disposer des droits nécessaires sur ce contenu et du consentement des personnes dont vous partagez les renseignements.</p>
            </>
          ),
        },
        {
          title: "Rôles et collaboration",
          body: (
            <p>
              Le modérateur d&apos;un document décide du texte, des participants et de leurs permissions. Les participants commentent, proposent et valident selon leur rôle. Chaque modification est consignée dans l&apos;historique du document.
            </p>
          ),
        },
        {
          title: "Assistant Misterdil AI",
          body: (
            <p>
              Les propositions de l&apos;assistant sont des suggestions de rédaction. Elles ne constituent pas un avis juridique. Relisez chaque proposition et consultez un professionnel du droit pour toute question de portée juridique avant de signer.
            </p>
          ),
        },
        {
          title: "Microsoft 365",
          body: (
            <p>
              La connexion à Microsoft 365 est facultative. Elle affiche vos courriels et réunions dans le tableau de bord et exécute uniquement les actions que vous déclenchez. L&apos;usage de Microsoft 365 reste soumis aux conditions de Microsoft. Le traitement des données est décrit dans la{" "}
              <Link href="/confidentialite">politique de confidentialité</Link>.
            </p>
          ),
        },
        {
          title: "Usage acceptable",
          body: (
            <>
              <p>Vous vous engagez à ne pas :</p>
              <ul>
                <li>utiliser le service à des fins illégales, frauduleuses ou trompeuses ;</li>
                <li>tenter d&apos;accéder aux comptes ou documents d&apos;autrui sans autorisation ;</li>
                <li>perturber, surcharger ou contourner la sécurité de la plateforme ;</li>
                <li>déposer du contenu malveillant ou portant atteinte aux droits de tiers.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Abonnement et paiement",
          body: (
            <p>
              Les forfaits et leurs prix figurent sur la page <Link href="/#tarifs">Tarifs</Link>. Les abonnements payants se renouvellent automatiquement jusqu&apos;à résiliation. Vous pouvez résilier à tout moment ; la résiliation prend effet à la fin de la période en cours.
            </p>
          ),
        },
        {
          title: "Disponibilité et responsabilité",
          body: (
            <>
              <p>
                Nous travaillons à offrir un service fiable et sécurisé. Le service est fourni tel quel ; des interruptions pour maintenance ou des incidents indépendants de notre volonté peuvent survenir.
              </p>
              <p>
                Dans la mesure permise par la loi, la responsabilité de Misterdil se limite aux sommes payées pour le service au cours des 12 mois précédant l&apos;événement. Rien dans ces conditions ne limite les droits que vous confère la Loi sur la protection du consommateur du Québec.
              </p>
            </>
          ),
        },
        {
          title: "Suspension et fermeture",
          body: (
            <p>
              Vous pouvez fermer votre compte à tout moment. Nous pouvons suspendre un compte qui enfreint ces conditions, après avis sauf urgence. Avant la fermeture, vous pouvez exporter vos documents en PDF ou Word.
            </p>
          ),
        },
        {
          title: "Droit applicable",
          body: <p>Ces conditions sont régies par les lois du Québec et les lois fédérales du Canada qui s&apos;y appliquent. Les tribunaux du district judiciaire de Montréal sont compétents, sous réserve des droits des consommateurs.</p>,
        },
        {
          title: "Modifications et contact",
          body: (
            <p>
              Toute modification importante est annoncée dans la plateforme au moins 30 jours avant son entrée en vigueur. Pour toute question : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
