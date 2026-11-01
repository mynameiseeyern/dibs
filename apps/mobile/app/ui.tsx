import { ScrollView } from "react-native";
import { BasicsGallery } from "@/components/gallery/basics";
import { DibbyGallery } from "@/components/gallery/dibby";
import { FeedbackGallery } from "@/components/gallery/feedback";
import { FormsGallery } from "@/components/gallery/forms";
import { OverlaysGallery } from "@/components/gallery/overlays";

/** Every component, in both themes (switch the phone's appearance). Like /ui on the web. */
export default function Gallery() {
  return (
    <ScrollView contentContainerClassName="gap-8 p-4 pb-16">
      <BasicsGallery />
      <FormsGallery />
      <FeedbackGallery />
      <OverlaysGallery />
      <DibbyGallery />
    </ScrollView>
  );
}
