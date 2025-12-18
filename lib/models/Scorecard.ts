import { Team } from "./User";

export type ScorecardFieldType = "rating" | "boolean" | "text" | "long_text";

export interface ScorecardFieldConfig {
  id: string;
  label: string;
  type: ScorecardFieldType;
  min?: number; // for rating
  max?: number; // for rating
  description?: string;
  required?: boolean;
}

export interface ScorecardConfig {
  team: Team; // "Electric", "Solar", "Combustion"
  system?: string; // Optional: specific system override
  fields: ScorecardFieldConfig[];
}

export interface ScorecardSubmission {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  data: Record<string, string | number | boolean>;
  submittedAt: Date;
  updatedAt: Date;
}
