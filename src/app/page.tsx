import { redirect } from "next/navigation";

export default function Home() {
  // The middleware handles auth checking in production.
  // Redirect to login directly without accessing localStorage on the server.
  redirect("/login");
}