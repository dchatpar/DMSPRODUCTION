import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/server";

export default async function Page() {
  const supabase = createClient();

  // Check if user is authenticated
  const { data: { session } } = await (await supabase).auth.getSession();

  if (session) {
    // If logged in, go to dashboard
    redirect("/dashboard");
  } else {
    // If not logged in, go to login
    redirect("/login");
  }
}