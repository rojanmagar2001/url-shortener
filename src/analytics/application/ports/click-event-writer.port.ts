import type { ClickEvent } from "@/analytics/domain/click-event.js";

export type ClickEventWriterPort = {
  writeClickEvent(event: ClickEvent): Promise<void>;
};
