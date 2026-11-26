/** Apart from the filter, so the native app gets the list without the word-matching library. */
export const REPORT_REASONS = [
  { id: "harassment", label: "Bullying or harassment" },
  { id: "hate", label: "Hate or slurs" },
  { id: "sexual", label: "Sexual content" },
  { id: "violence", label: "Threats or violence" },
  { id: "spam", label: "Spam or a scam" },
  { id: "copyright", label: "Copyright" },
  { id: "underage", label: "Someone under 16" },
  { id: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];
export const isReportReason = (v: unknown): v is ReportReason => REPORT_REASONS.some((r) => r.id === v);
export const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
