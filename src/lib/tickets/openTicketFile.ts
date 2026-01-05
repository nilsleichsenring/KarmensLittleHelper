import { supabase } from "../supabaseClient";

/**
 * Opens a ticket PDF in a new browser tab.
 * Resolves Supabase storage paths to public URLs.
 */
export function openTicketFile(fileUrl: string | null) {
  if (!fileUrl) return;

  // absolute URL → open directly
  if (fileUrl.startsWith("http")) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // Supabase storage path → resolve public URL
  const { data } = supabase.storage
    .from("tickets") // ⚠️ Bucket-Name prüfen
    .getPublicUrl(fileUrl);

  if (data?.publicUrl) {
    window.open(data.publicUrl, "_blank", "noopener,noreferrer");
  } else {
    console.warn("Could not resolve public URL for ticket file:", fileUrl);
  }
}
