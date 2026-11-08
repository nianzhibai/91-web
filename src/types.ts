export * from "@91/client/types";

export type PreviewState = "idle" | "intent" | "loading" | "playing" | "error";

export type PromoItem = {
  id: string;
  kind: "channel" | "topic" | "event";
  label: string;
  title: string;
  meta?: string;
};
