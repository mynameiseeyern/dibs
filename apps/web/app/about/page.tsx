import { permanentRedirect } from "next/navigation";

// What Dibby is lives on the home page now, with the chat's first question in it.
export default function About() {
  permanentRedirect("/");
}
