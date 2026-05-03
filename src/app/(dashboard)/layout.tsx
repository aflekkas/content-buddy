import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <div className="h-svh overflow-hidden flex flex-col">{children}</div>;
}
