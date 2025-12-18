export enum RecruitingStep {
  OPEN = "open",
  REVIEWING = "reviewing",
  RELEASE_INTERVIEWS = "release_interviews",
  INTERVIEWING = "interviewing",
  RELEASE_TRIAL = "release_trial",
  TRIAL_WORKDAY = "trial_workday",
  RELEASE_DECISIONS = "release_decisions",
}

export interface RecruitingConfig {
  currentStep: RecruitingStep;
  updatedAt: Date;
  updatedBy: string;
}
