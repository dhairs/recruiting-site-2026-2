import { Team, ElectricSystem, SolarSystem, CombustionSystem } from "./User";

export enum ApplicationStatus {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface ApplicationFormData {
  whyJoin?: string;
  relevantExperience?: string;
  availability?: string;
  resumeUrl?: string;
  // Team-specific question answers, keyed by question ID
  teamQuestions?: Record<string, string>;
}

export interface Application {
  id: string;
  userId: string;
  team: Team;
  preferredSystem?: ElectricSystem | SolarSystem | CombustionSystem;
  status: ApplicationStatus;

  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;

  formData: ApplicationFormData;
}

export interface ApplicationCreateData {
  userId: string;
  team: Team;
}
