import { redirect } from "next/navigation";

// The plan form is the home page now. Old links and sign-in "next" values still land on it.
export default function NewPlan() {
  redirect("/");
}
