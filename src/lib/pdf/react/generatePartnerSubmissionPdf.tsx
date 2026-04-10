import { pdf } from "@react-pdf/renderer";
import { PartnerSubmissionDocument } from "./PartnerSubmissionDocument";

export async function generatePartnerSubmissionPdf(data: {
  submission: any;
  project: any;
  participants: any[];
  tickets: any[];
}) {
  const doc = <PartnerSubmissionDocument {...data} />;

  const blob = await pdf(doc).toBlob();

  const filename = `reimbursement_${String(
    data.submission?.organisation_name || "submission"
  ).replace(/\s+/g, "_")}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}