import { adminDb } from "@/lib/firebase/admin";
import {
  Application,
  ApplicationCreateData,
  ApplicationFormData,
  ApplicationStatus,
} from "@/lib/models/Application";
import { Team } from "@/lib/models/User";
import { FieldValue } from "firebase-admin/firestore";

const APPLICATIONS_COLLECTION = "applications";
const USERS_COLLECTION = "users";

/**
 * Create a new in-progress application for a user and team.
 * If an application already exists for this user and team, returns the existing one.
 */
export async function createApplication(
  data: ApplicationCreateData
): Promise<Application> {
  // Check if user already has an application for this team
  const existingApp = await getUserApplicationForTeam(data.userId, data.team);
  if (existingApp) {
    return existingApp;
  }

  const now = new Date();

  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc();
  const application: Application = {
    id: applicationRef.id,
    userId: data.userId,
    team: data.team,
    status: ApplicationStatus.IN_PROGRESS,
    createdAt: now,
    updatedAt: now,
    formData: {},
  };

  // Create the application document
  await applicationRef.set({
    ...application,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Add the application ID to the user's applications array
  await adminDb
    .collection(USERS_COLLECTION)
    .doc(data.userId)
    .update({
      applications: FieldValue.arrayUnion(applicationRef.id),
    });

  return application;
}

/**
 * Get a single application by ID
 */
export async function getApplication(
  applicationId: string
): Promise<Application | null> {
  const doc = await adminDb
    .collection(APPLICATIONS_COLLECTION)
    .doc(applicationId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    submittedAt: data.submittedAt?.toDate(),
  } as Application;
}

/**
 * Get all applications for a specific user
 */
export async function getUserApplications(
  userId: string
): Promise<Application[]> {
  const snapshot = await adminDb
    .collection(APPLICATIONS_COLLECTION)
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;
  });
}

/**
 * Get a user's application for a specific team
 */
export async function getUserApplicationForTeam(
  userId: string,
  team: Team
): Promise<Application | null> {
  const snapshot = await adminDb
    .collection(APPLICATIONS_COLLECTION)
    .where("userId", "==", userId)
    .where("team", "==", team)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    submittedAt: data.submittedAt?.toDate(),
  } as Application;
}

/**
 * Update an application's form data and other fields
 */
export async function updateApplication(
  applicationId: string,
  updates: Partial<Pick<Application, "formData" | "preferredSystem" | "status">>
): Promise<Application | null> {
  const applicationRef = adminDb
    .collection(APPLICATIONS_COLLECTION)
    .doc(applicationId);

  const doc = await applicationRef.get();
  if (!doc.exists) {
    return null;
  }

  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // If submitting, set submittedAt
  if (updates.status === ApplicationStatus.SUBMITTED) {
    updateData.submittedAt = FieldValue.serverTimestamp();
  }

  await applicationRef.update(updateData);

  return getApplication(applicationId);
}

/**
 * Update just the form data of an application (merge with existing)
 */
export async function updateApplicationFormData(
  applicationId: string,
  formData: Partial<ApplicationFormData>
): Promise<Application | null> {
  const application = await getApplication(applicationId);
  if (!application) {
    return null;
  }

  const mergedFormData = {
    ...application.formData,
    ...formData,
  };

  return updateApplication(applicationId, { formData: mergedFormData });
}
