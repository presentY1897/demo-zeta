import type { Metadata } from "next";
import { CreateWizard } from "@/components/create/CreateWizard";
import { getCurrentUser } from "@/server/auth/current-user";
import { toPublicUser } from "@/server/auth/http";

export const metadata: Metadata = { title: "만들기" };

export default async function CreatePage() {
  const user = await getCurrentUser();
  return <CreateWizard user={user ? toPublicUser(user) : null} />;
}
