import { notFound, redirect } from "next/navigation";
import { configured, supabaseServer } from "@/lib/supabase/server";
import { Portal } from "@/components/portal";
import { canAccessProfile, normalizeProfile } from "@/lib/auth-profile";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug?.join("/") || "";
  if (!["","login","register","forgot-password","reset-password","dashboard","admin","demo"].includes(slug)) notFound();
  const ready = configured();
  let profile = null;
  if (ready && slug !== "demo") {
    const client = await supabaseServer();
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      const { data } = await client.from("profiles").select("*").eq("id", user.id).single();
      if (data && canAccessProfile(data)) profile = normalizeProfile({ ...data, email: data.email || user.email || "" });
    }
  }
  if (["dashboard","admin"].includes(slug) && !profile) redirect("/login");
  if (slug === "admin" && profile?.role !== "admin") redirect("/dashboard");
  return <Portal initialProfile={profile} initialScreen={slug} configured={ready} />;
}
