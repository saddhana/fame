import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return <ImportClient />;
}
