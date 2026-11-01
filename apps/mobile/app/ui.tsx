import { ScrollView } from "react-native";
import { BasicsGallery } from "@/components/gallery/basics";

/** Every component, in both themes (switch the phone's appearance). Like /ui on the web. */
export default function Gallery() {
  return (
    <ScrollView contentContainerClassName="gap-8 p-4 pb-16">
      <BasicsGallery />
    </ScrollView>
  );
}
