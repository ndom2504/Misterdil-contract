import Link from "next/link";
import { FileText, ShieldCheck, Users } from "lucide-react";
import { MicrosoftButton } from "@/components/auth-forms";
import { AuthStage } from "@/components/auth-stage";
import { Logo } from "@/components/logo";
import { partyLabel } from "@/lib/domain";
import { getCurrentUser } from "@/server/current-user";
import { invitationPreview } from "@/server/invitations";

export const metadata = { title: "Invitation à une entente" };

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] bg-white p-7 text-[#12151a] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="flex justify-center">
        <Logo stack />
      </div>
      {children}
    </div>
  );
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([invitationPreview(token), getCurrentUser()]);
  const accept = `/invitation/${encodeURIComponent(token)}/accepter`;
  const suivant = encodeURIComponent(accept);

  if (!invitation || invitation.status === "REVOKED") {
    return (
      <AuthStage>
        <Panel>
          <h2 className="mt-5 text-center text-xl font-semibold">Invitation introuvable</h2>
          <p className="mt-2 text-center text-sm leading-6 text-[#5e6875]">Ce lien n&apos;est plus valide. Il a peut-être été annulé par la personne qui vous a invité. Demandez-lui de vous renvoyer l&apos;entente.</p>
          <Link href="/connexion" className="mt-6 flex h-11 items-center justify-center rounded-xl border border-[#e6e8ee] text-sm font-medium">Aller à la connexion</Link>
        </Panel>
      </AuthStage>
    );
  }

  const accepted = invitation.status === "ACCEPTED";

  return (
    <AuthStage>
      <Panel>
        <div className="mt-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-[#2f7cf6]">Invitation</p>
          <h2 className="mt-2 text-xl font-semibold">
            {invitation.inviterName} vous invite à rejoindre une entente
          </h2>
          {invitation.inviterOrganization ? <p className="mt-1 text-sm text-[#5e6875]">{invitation.inviterOrganization}</p> : null}
        </div>

        <div className="mt-6 rounded-2xl border border-[#e6eef8] bg-[#f7faff] p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-[#10233f]">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7cf6]" />
            <span>
              {invitation.title}
              {invitation.typeLabel ? <span className="block text-xs font-normal text-[#5e6875]">{invitation.typeLabel}</span> : null}
            </span>
          </p>
          {invitation.parties.length ? (
            <div className="mt-3 border-t border-[#e6eef8] pt-3">
              <p className="flex items-center gap-1.5 text-xs text-[#8b939e]"><Users className="h-3.5 w-3.5" />Parties</p>
              <ul className="mt-2 space-y-1.5">
                {invitation.parties.map((party, index) => (
                  <li key={`${party.name}-${index}`} className="text-sm text-[#243040]">
                    <span className="font-medium">{party.name}</span>
                    {party.organization && party.organization !== party.name ? <span className="text-[#5e6875]"> · {party.organization}</span> : null}
                    <span className="text-xs text-[#8b939e]"> · {partyLabel(party.partyType)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {user ? (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-[#5e6875]">Connecté en tant que <span className="font-medium text-[#12151a]">{user.email}</span></p>
            <a href={accept} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2f7cf6] text-sm font-medium text-white hover:bg-[#1d68e0]">
              {accepted ? "Ouvrir l'entente →" : "Rejoindre l'entente →"}
            </a>
          </div>
        ) : accepted ? (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-[#5e6875]">Cette invitation a déjà été acceptée. Connectez-vous pour ouvrir l&apos;entente.</p>
            <Link href={`/connexion?suivant=${suivant}`} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2f7cf6] text-sm font-medium text-white hover:bg-[#1d68e0]">Se connecter →</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm leading-5 text-[#5e6875]">
              Pour participer, créez votre compte Misterdil avec <span className="font-medium text-[#12151a]">{invitation.email}</span>.
            </p>
            <Link href={`/inscription?suivant=${suivant}`} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2f7cf6] text-sm font-medium text-white hover:bg-[#1d68e0]">Créer mon compte →</Link>
            <Link href={`/connexion?suivant=${suivant}`} className="flex h-11 w-full items-center justify-center rounded-xl border border-[#e6e8ee] text-sm font-medium hover:bg-[#f7f8fb]">J&apos;ai déjà un compte</Link>
            <div className="pt-2">
              <MicrosoftButton next={accept} />
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3 rounded-2xl bg-[#f4f8ff] p-4 text-sm text-[#3f4854]">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2f7cf6]" />
          <p>Seules les personnes invitées accèdent à l&apos;entente. Vous verrez les modifications des autres parties en direct.</p>
        </div>
      </Panel>
    </AuthStage>
  );
}
