import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform-shell";
import { requireUser } from "@/server/current-user";
import { notificationPreview } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  const notifications = await notificationPreview(user.id);

  return (
    <PlatformShell
      user={{ name: user.name, email: user.email, organization: user.organization?.name ?? "", jobTitle: user.jobTitle ?? "" }}
      unread={notifications.unread}
      notices={notifications.items}
    >
      {children}
    </PlatformShell>
  );
}
