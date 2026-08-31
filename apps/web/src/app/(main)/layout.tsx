import { Header } from "@/components/Header";
import { TabBar } from "@/components/TabBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:pb-10">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
