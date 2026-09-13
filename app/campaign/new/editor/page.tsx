import { redirect } from "next/navigation";

export default function CampaignEditorRedirect() {
  redirect("/campaign/new/preview");
}
