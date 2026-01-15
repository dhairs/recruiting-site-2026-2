export enum RecruitingStep {
  OPEN = "open",
  REVIEWING = "reviewing",
  RELEASE_INTERVIEWS = "release_interviews",
  INTERVIEWING = "interviewing",
  RELEASE_TRIAL = "release_trial",
  TRIAL_WORKDAY = "trial_workday",
  RELEASE_DECISIONS = "release_decisions",
}

export interface Announcement {
  message: string;
  enabled: boolean;
  updatedAt: Date;
  updatedBy: string;
}

export interface RecruitingConfig {
  currentStep: RecruitingStep;
  updatedAt: Date;
  updatedBy: string;
}

// Application Questions Configuration
export interface ApplicationQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface ApplicationQuestionsConfig {
  commonQuestions: ApplicationQuestion[];
  teamQuestions: Record<string, ApplicationQuestion[]>; // Keyed by Team enum value
  systemQuestions?: Record<string, ApplicationQuestion[]>; // Optional system-specific questions
  updatedAt: Date;
  updatedBy: string;
}

