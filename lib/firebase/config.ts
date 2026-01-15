import { adminDb } from "./admin";
import { RecruitingConfig, RecruitingStep, Announcement, ApplicationQuestionsConfig, ApplicationQuestion } from "@/lib/models/Config";
import { COMMON_QUESTIONS, TEAM_QUESTIONS } from "@/lib/models/teamQuestions";
import { Team } from "@/lib/models/User";

const CONFIG_COLLECTION = "config";
const RECRUITING_DOC = "recruiting";
const ANNOUNCEMENT_DOC = "announcement";
const QUESTIONS_DOC = "application_questions";

export async function getRecruitingConfig(): Promise<RecruitingConfig> {
  const doc = await adminDb.collection(CONFIG_COLLECTION).doc(RECRUITING_DOC).get();
  
  if (doc.exists) {
    const data = doc.data();
    return {
      currentStep: data?.currentStep || RecruitingStep.OPEN,
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      updatedBy: data?.updatedBy || "system",
    };
  }

  // Default config if none exists
  return {
    currentStep: RecruitingStep.OPEN,
    updatedAt: new Date(),
    updatedBy: "system",
  };
}

export async function updateRecruitingStep(step: RecruitingStep, adminId: string): Promise<void> {
  await adminDb.collection(CONFIG_COLLECTION).doc(RECRUITING_DOC).set({
    currentStep: step,
    updatedAt: new Date(),
    updatedBy: adminId,
  }, { merge: true });
}

export async function getAnnouncement(): Promise<Announcement | null> {
  const doc = await adminDb.collection(CONFIG_COLLECTION).doc(ANNOUNCEMENT_DOC).get();
  
  if (doc.exists) {
    const data = doc.data();
    return {
      message: data?.message || "",
      enabled: data?.enabled || false,
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      updatedBy: data?.updatedBy || "system",
    };
  }

  return null;
}

export async function updateAnnouncement(message: string, enabled: boolean, adminId: string): Promise<void> {
  await adminDb.collection(CONFIG_COLLECTION).doc(ANNOUNCEMENT_DOC).set({
    message,
    enabled,
    updatedAt: new Date(),
    updatedBy: adminId,
  });
}

// Application Questions Functions

/**
 * Get application questions config from Firestore, falling back to hardcoded defaults
 */
export async function getApplicationQuestions(): Promise<ApplicationQuestionsConfig> {
  const doc = await adminDb.collection(CONFIG_COLLECTION).doc(QUESTIONS_DOC).get();
  
  if (doc.exists) {
    const data = doc.data();
    return {
      commonQuestions: data?.commonQuestions || [],
      teamQuestions: data?.teamQuestions || {},
      systemQuestions: data?.systemQuestions,
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      updatedBy: data?.updatedBy || "system",
    };
  }

  // Return hardcoded defaults if no Firestore config exists
  return getDefaultApplicationQuestions();
}

/**
 * Get hardcoded default questions from teamQuestions.ts
 */
export function getDefaultApplicationQuestions(): ApplicationQuestionsConfig {
  const teamQuestionsRecord: Record<string, ApplicationQuestion[]> = {};
  
  Object.values(Team).forEach((team) => {
    teamQuestionsRecord[team] = TEAM_QUESTIONS[team] || [];
  });

  return {
    commonQuestions: COMMON_QUESTIONS,
    teamQuestions: teamQuestionsRecord,
    updatedAt: new Date(),
    updatedBy: "system",
  };
}

/**
 * Update the entire application questions config (admin only)
 */
export async function updateApplicationQuestions(
  config: Omit<ApplicationQuestionsConfig, "updatedAt" | "updatedBy">,
  adminId: string
): Promise<void> {
  await adminDb.collection(CONFIG_COLLECTION).doc(QUESTIONS_DOC).set({
    ...config,
    updatedAt: new Date(),
    updatedBy: adminId,
  });
}

/**
 * Update questions for a specific team
 */
export async function updateTeamQuestions(
  team: Team,
  questions: ApplicationQuestion[],
  adminId: string
): Promise<void> {
  const currentConfig = await getApplicationQuestions();
  
  await adminDb.collection(CONFIG_COLLECTION).doc(QUESTIONS_DOC).set({
    ...currentConfig,
    teamQuestions: {
      ...currentConfig.teamQuestions,
      [team]: questions,
    },
    updatedAt: new Date(),
    updatedBy: adminId,
  });
}

/**
 * Update common questions (shared across all applications)
 */
export async function updateCommonQuestions(
  questions: ApplicationQuestion[],
  adminId: string
): Promise<void> {
  const currentConfig = await getApplicationQuestions();
  
  await adminDb.collection(CONFIG_COLLECTION).doc(QUESTIONS_DOC).set({
    ...currentConfig,
    commonQuestions: questions,
    updatedAt: new Date(),
    updatedBy: adminId,
  });
}

/**
 * Update questions for a specific system (optional feature)
 */
export async function updateSystemQuestions(
  system: string,
  questions: ApplicationQuestion[],
  adminId: string
): Promise<void> {
  const currentConfig = await getApplicationQuestions();
  
  await adminDb.collection(CONFIG_COLLECTION).doc(QUESTIONS_DOC).set({
    ...currentConfig,
    systemQuestions: {
      ...currentConfig.systemQuestions,
      [system]: questions,
    },
    updatedAt: new Date(),
    updatedBy: adminId,
  });
}

