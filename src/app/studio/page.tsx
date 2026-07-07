import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "استودیوی محتوا",
  robots: { index: false },
};

export default function StudioPage() {
  return <Studio />;
}
