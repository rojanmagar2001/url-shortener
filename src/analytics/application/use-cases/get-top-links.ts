import type { AnalyticsReaderPort } from "@/analytics/application/ports/analytics-reader.port";

export async function getTopLinks(
  deps: { analytics: AnalyticsReaderPort },
  input: { minutes: number; limit: number },
) {
  return deps.analytics.getTopLinks(input.minutes, input.limit);
}
