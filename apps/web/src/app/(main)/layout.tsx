import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";
import { getCurrentUser } from "@/server/auth/current-user";
import { toPublicUser } from "@/server/auth/http";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <Header user={user ? toPublicUser(user) : null} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:pb-10">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
