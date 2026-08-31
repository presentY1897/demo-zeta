import type { Metadata } from "next";
import { CreateWizard } from "@/components/create/CreateWizard";

export const metadata: Metadata = { title: "만들기" };

export default function CreatePage() {
  return <CreateWizard />;
}
