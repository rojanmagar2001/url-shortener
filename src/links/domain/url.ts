import { err } from "@/shared/errors";

// Minimal safe URL validation for creation time.
// Redirect-time SSRF protections will be stricter (Step 13).
export function validateOriginalUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw err("VALIDATION_ERROR", {
      details: { field: "originalUrl", reason: "invalid_url" },
    });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw err("VALIDATION_ERROR", {
      details: { field: "originalUrl", reason: "invalid_protocol" },
    });
  }

  // avoid javascript: etc. Also avoid empty hostname.
  if (!url.hostname) {
    throw err("VALIDATION_ERROR", {
      details: { field: "originalUrl", reason: "missing_host" },
    });
  }

  // Normalize by stripping fragment; keep query.
  url.hash = "";

  return url.toString();
}
