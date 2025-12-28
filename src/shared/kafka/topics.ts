export const TOPICS = {
  linkCreated: "url.events.link-created",
  linkClicked: "url.events.link-clicked",
  audit: "url.events.audit",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
