import { adminDb } from "@/lib/firebase/admin";
import {
  Application,
  ApplicationCreateData,
  ApplicationFormData,
  ApplicationStatus,
  InterviewOffer,
  InterviewEventStatus,
} from "@/lib/models/Application";
import { Team } from "@/lib/models/User";
import { FieldValue } from "firebase-admin/firestore";

const APPLICATIONS_COLLECTION = "applications";
const USERS_COLLECTION = "users";

/**
 * Helper to safely convert a Firestore timestamp or date value to a Date
 */
function safeToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  
  // Firestore Timestamp with toDate method
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  
  // Already a Date
  if (value instanceof Date) {
    return value;
  }
  
  // ISO string or other parseable format
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  // Fallback for unparseable values
  return undefined;
}

/**
 * Helper to convert Firestore timestamps in InterviewOffer to Dates
 */
function convertInterviewOfferDates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  offer: any
): InterviewOffer {
  return {
    ...offer,
    createdAt: safeToDate(offer.createdAt) || new Date(),
    scheduledAt: safeToDate(offer.scheduledAt),
    scheduledEndAt: safeToDate(offer.scheduledEndAt),
    scheduledOnDate: safeToDate(offer.scheduledOnDate),
    cancelledAt: safeToDate(offer.cancelledAt),
  };
}

/**
 * Helper to remove undefined values from an object before writing to Firestore.
 * Firestore doesn't accept undefined values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Prepare an InterviewOffer for writing to Firestore by stripping undefined values
 */
function prepareOfferForFirestore(offer: InterviewOffer): Record<string, unknown> {
  return stripUndefined({
    system: offer.system,
    status: offer.status,
    eventId: offer.eventId,
    scheduledAt: offer.scheduledAt,
    scheduledEndAt: offer.scheduledEndAt,
    createdAt: offer.createdAt,
    scheduledOnDate: offer.scheduledOnDate,
    cancelledAt: offer.cancelledAt,
    cancelReason: offer.cancelReason,
  });
}

/**
 * Create a new in-progress application for a user and team.
 * If an application already exists for this user and team, returns the existing one.
 * Uses a Firestore transaction to prevent race conditions.
 */
export async function createApplication(
  data: ApplicationCreateData
): Promise<Application> {
  // Use transaction to atomically check for existing and create if not exists
  return await adminDb.runTransaction(async (transaction) => {
    // Check if user already has an application for this team (within transaction)
    const existingSnapshot = await transaction.get(
      adminDb
        .collection(APPLICATIONS_COLLECTION)
        .where("userId", "==", data.userId)
        .where("team", "==", data.team)
        .limit(1)
    );

    if (!existingSnapshot.empty) {
      // Return existing application
      const doc = existingSnapshot.docs[0];
      const existingData = doc.data();
      return {
        ...existingData,
        id: doc.id,
        createdAt: existingData.createdAt?.toDate() || new Date(),
        updatedAt: existingData.updatedAt?.toDate() || new Date(),
        submittedAt: existingData.submittedAt?.toDate(),
        interviewOffers: normalizeInterviewOffers(existingData.interviewOffers),
      } as Application;
    }

    // No existing application - create new one
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
    transaction.set(applicationRef, {
      ...application,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Add the application ID to the user's applications array
    const userRef = adminDb.collection(USERS_COLLECTION).doc(data.userId);
    transaction.update(userRef, {
      applications: FieldValue.arrayUnion(applicationRef.id),
    });

    return application;
  });
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
    interviewOffers: normalizeInterviewOffers(data.interviewOffers),
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
      interviewOffers: normalizeInterviewOffers(data.interviewOffers),
    } as Application;
  });
}

/**
 * Helper to normalize interviewOffers - handles both array and single object forms
 */
function normalizeInterviewOffers(offers: unknown): InterviewOffer[] | undefined {
  if (!offers) return undefined;
  
  // Already an array
  if (Array.isArray(offers)) {
    return offers.map(convertInterviewOfferDates);
  }
  
  // Single object - wrap in array
  if (typeof offers === 'object') {
    return [convertInterviewOfferDates(offers)];
  }
  
  return undefined;
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
    interviewOffers: normalizeInterviewOffers(data.interviewOffers),
  } as Application;
}

/**
 * Update an application's form data and other fields
 */
export async function updateApplication(
  applicationId: string,
  updates: Partial<Pick<Application, "formData" | "preferredSystem" | "preferredSystems" | "status" | "interviewOffers" | "selectedInterviewSystem" | "rejectedBySystems">>
): Promise<Application | null> {
  const applicationRef = adminDb
    .collection(APPLICATIONS_COLLECTION)
    .doc(applicationId);

  const doc = await applicationRef.get();
  if (!doc.exists) {
    return null;
  }

  // Prepare update data, stripping undefined from interviewOffers
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // If interviewOffers is being updated, strip undefined values from each offer
  if (updates.interviewOffers) {
    updateData.interviewOffers = updates.interviewOffers.map(prepareOfferForFirestore);
  }

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

/**
 * Add an interview offer to an application.
 * This is typically called by an admin/reviewer when extending an interview.
 * The system parameter is the name of the system offering the interview (e.g., "Electronics").
 * Calendar and interviewer info is looked up from interviewConfigs when scheduling.
 * Uses a Firestore transaction to prevent race conditions.
 */
export async function addInterviewOffer(
  applicationId: string,
  system: string
): Promise<Application | null> {
  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc(applicationId);

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(applicationRef);
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    const existingOffers = normalizeInterviewOffers(data.interviewOffers) || [];

    // Check if offer for this system already exists
    if (existingOffers.some((o) => o.system === system)) {
      throw new Error(`Interview offer for ${system} already exists`);
    }

    const newOffer: InterviewOffer = {
      system,
      status: InterviewEventStatus.PENDING,
      createdAt: new Date(),
    };

    const updatedOffers = [...existingOffers, newOffer];

    // Prepare update data
    const updateData: Record<string, unknown> = {
      interviewOffers: updatedOffers.map(prepareOfferForFirestore),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Also update status to INTERVIEW if not already
    if (data.status !== ApplicationStatus.INTERVIEW) {
      updateData.status = ApplicationStatus.INTERVIEW;
    }

    transaction.update(applicationRef, updateData);

    // Return the updated application data
    return {
      ...data,
      id: doc.id,
      interviewOffers: updatedOffers,
      status: updateData.status || data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;
  });
}

/**
 * Add multiple interview offers to an application atomically.
 * Also handles un-rejecting systems and updating status.
 * Uses a single Firestore transaction to prevent race conditions.
 */
export async function addMultipleInterviewOffers(
  applicationId: string,
  systems: string[]
): Promise<Application | null> {
  if (systems.length === 0) {
    return getApplication(applicationId);
  }

  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc(applicationId);

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(applicationRef);
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    const existingOffers = normalizeInterviewOffers(data.interviewOffers) || [];
    const existingOfferSystems = new Set(existingOffers.map((o) => o.system));
    
    // Create new offers only for systems that don't already have one
    const newOffers: InterviewOffer[] = [];
    for (const system of systems) {
      if (!existingOfferSystems.has(system)) {
        newOffers.push({
          system,
          status: InterviewEventStatus.PENDING,
          createdAt: new Date(),
        });
      }
    }

    const updatedOffers = [...existingOffers, ...newOffers];

    // Un-reject systems that are getting offers
    const currentRejections = (data.rejectedBySystems || []) as string[];
    const updatedRejections = currentRejections.filter(
      (sys) => !systems.includes(sys)
    );

    // Prepare update data
    const updateData: Record<string, unknown> = {
      interviewOffers: updatedOffers.map(prepareOfferForFirestore),
      rejectedBySystems: updatedRejections,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Update status to INTERVIEW if not already
    if (data.status !== ApplicationStatus.INTERVIEW) {
      updateData.status = ApplicationStatus.INTERVIEW;
    }

    transaction.update(applicationRef, updateData);

    // Return the updated application data
    return {
      ...data,
      id: doc.id,
      interviewOffers: updatedOffers,
      rejectedBySystems: updatedRejections,
      status: updateData.status || data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;
  });
}

/**
 * Select a single interview system for Combustion/Electric teams.
 * For Solar, this is not needed as all systems can be interviewed.
 */
export async function selectInterviewSystem(
  applicationId: string,
  system: string
): Promise<Application | null> {
  const application = await getApplication(applicationId);
  if (!application) {
    return null;
  }

  // Verify the system is in the offers
  const offers = application.interviewOffers || [];
  if (!offers.some((o) => o.system === system)) {
    throw new Error(`No interview offer found for system: ${system}`);
  }

  // Verify this is for Combustion or Electric (not Solar)
  if (application.team === Team.SOLAR) {
    throw new Error("Solar team does not require system selection - all systems can be interviewed");
  }

  return updateApplication(applicationId, { selectedInterviewSystem: system });
}

/**
 * Update the status of a specific interview offer.
 * Used when scheduling, cancelling, or marking interviews as complete.
 * Uses a Firestore transaction to prevent race conditions.
 */
export async function updateInterviewOfferStatus(
  applicationId: string,
  system: string,
  statusUpdate: {
    status: InterviewEventStatus;
    eventId?: string;
    scheduledAt?: Date;
    scheduledEndAt?: Date;
    cancelReason?: string;
  }
): Promise<Application | null> {
  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc(applicationId);

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(applicationRef);

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    const offers = normalizeInterviewOffers(data.interviewOffers) || [];
    const offerIndex = offers.findIndex((o) => o.system === system);

    if (offerIndex === -1) {
      throw new Error(`No interview offer found for system: ${system}`);
    }

    const updatedOffer: InterviewOffer = {
      ...offers[offerIndex],
      status: statusUpdate.status,
    };

    // Add additional fields based on status
    if (statusUpdate.status === InterviewEventStatus.SCHEDULED) {
      updatedOffer.eventId = statusUpdate.eventId;
      updatedOffer.scheduledAt = statusUpdate.scheduledAt;
      updatedOffer.scheduledEndAt = statusUpdate.scheduledEndAt;
      updatedOffer.scheduledOnDate = new Date();
    } else if (statusUpdate.status === InterviewEventStatus.CANCELLED) {
      updatedOffer.cancelledAt = new Date();
      updatedOffer.cancelReason = statusUpdate.cancelReason;
    }

    const updatedOffers = [...offers];
    updatedOffers[offerIndex] = updatedOffer;

    transaction.update(applicationRef, {
      interviewOffers: updatedOffers.map(prepareOfferForFirestore),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Return the updated application data
    return {
      ...data,
      id: doc.id,
      interviewOffers: updatedOffers,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;
  });
}

/**
 * Reserve an interview slot atomically (optimistic locking).
 * Sets status to SCHEDULING to prevent concurrent booking attempts.
 * Returns the reservation or throws if already scheduled/scheduling.
 */
export async function reserveInterviewSlot(
  applicationId: string,
  system: string,
  scheduledAt: Date,
  scheduledEndAt: Date
): Promise<Application> {
  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc(applicationId);

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(applicationRef);

    if (!doc.exists) {
      throw new Error("Application not found");
    }

    const data = doc.data()!;
    const offers = normalizeInterviewOffers(data.interviewOffers) || [];
    const offerIndex = offers.findIndex((o) => o.system === system);

    if (offerIndex === -1) {
      throw new Error(`No interview offer found for system: ${system}`);
    }

    const offer = offers[offerIndex];

    // Check if already scheduled or currently being scheduled
    if (offer.status === InterviewEventStatus.SCHEDULED) {
      throw new Error("Interview is already scheduled. Cancel it first to reschedule.");
    }

    if (offer.status === InterviewEventStatus.SCHEDULING) {
      throw new Error("Another scheduling attempt is in progress. Please try again.");
    }

    // Set status to SCHEDULING (acquire the lock)
    const updatedOffer: InterviewOffer = {
      ...offer,
      status: InterviewEventStatus.SCHEDULING,
      scheduledAt,
      scheduledEndAt,
      scheduledOnDate: new Date(),
    };

    const updatedOffers = [...offers];
    updatedOffers[offerIndex] = updatedOffer;

    transaction.update(applicationRef, {
      interviewOffers: updatedOffers.map(prepareOfferForFirestore),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ...data,
      id: doc.id,
      interviewOffers: updatedOffers,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;
  });
}

/**
 * Confirm an interview reservation after calendar event is created.
 * Finalizes the reservation by setting status to SCHEDULED with event details.
 */
export async function confirmInterviewReservation(
  applicationId: string,
  system: string,
  eventId: string
): Promise<Application | null> {
  return updateInterviewOfferStatus(applicationId, system, {
    status: InterviewEventStatus.SCHEDULED,
    eventId,
  });
}

/**
 * Rollback a failed interview reservation.
 * Resets status back to PENDING if calendar event creation failed.
 */
export async function rollbackInterviewReservation(
  applicationId: string,
  system: string
): Promise<Application | null> {
  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc(applicationId);

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(applicationRef);

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    const offers = normalizeInterviewOffers(data.interviewOffers) || [];
    const offerIndex = offers.findIndex((o) => o.system === system);

    if (offerIndex === -1) {
      return null;
    }

    const offer = offers[offerIndex];

    // Only rollback if still in SCHEDULING status
    if (offer.status !== InterviewEventStatus.SCHEDULING) {
      return null;
    }

    const updatedOffer: InterviewOffer = {
      ...offer,
      status: InterviewEventStatus.PENDING,
      scheduledAt: undefined,
      scheduledEndAt: undefined,
      scheduledOnDate: undefined,
    };

    const updatedOffers = [...offers];
    updatedOffers[offerIndex] = updatedOffer;

    transaction.update(applicationRef, {
      interviewOffers: updatedOffers.map(prepareOfferForFirestore),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ...data,
      id: doc.id,
      interviewOffers: updatedOffers,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;
  });
}

/**
 * Reject an applicant from specific systems atomically.
 * Removes interview offers for the specified systems and updates rejectedBySystems.
 * If no interview offers remain, sets status to REJECTED.
 * Uses a Firestore transaction to prevent race conditions.
 */
export async function rejectApplicationFromSystems(
  applicationId: string,
  systems: string[]
): Promise<{ application: Application | null; fullyRejected: boolean }> {
  if (systems.length === 0) {
    const app = await getApplication(applicationId);
    return { application: app, fullyRejected: false };
  }

  const applicationRef = adminDb.collection(APPLICATIONS_COLLECTION).doc(applicationId);

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(applicationRef);

    if (!doc.exists) {
      return { application: null, fullyRejected: false };
    }

    const data = doc.data()!;
    const existingOffers = normalizeInterviewOffers(data.interviewOffers) || [];
    
    // Remove offers for the specified systems
    const remainingOffers = existingOffers.filter(
      (offer) => !systems.includes(offer.system)
    );

    // Track rejected systems (add to existing list, avoid duplicates)
    const existingRejections = (data.rejectedBySystems || []) as string[];
    const newRejections = [...new Set([...existingRejections, ...systems])];

    // Determine if application should be marked as REJECTED
    const hasActiveOffers = remainingOffers.length > 0;

    const updateData: Record<string, unknown> = {
      interviewOffers: remainingOffers.map(prepareOfferForFirestore),
      rejectedBySystems: newRejections,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Only set status to REJECTED if no active offers remain
    if (!hasActiveOffers) {
      updateData.status = ApplicationStatus.REJECTED;
    }

    transaction.update(applicationRef, updateData);

    const updatedApplication = {
      ...data,
      id: doc.id,
      interviewOffers: remainingOffers,
      rejectedBySystems: newRejections,
      status: hasActiveOffers ? data.status : ApplicationStatus.REJECTED,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
      submittedAt: data.submittedAt?.toDate(),
    } as Application;

    return { application: updatedApplication, fullyRejected: !hasActiveOffers };
  });
}

/**
 * Get ALL applications (for Admin)
 */
export async function getAllApplications(): Promise<Application[]> {
  const snapshot = await adminDb.collection(APPLICATIONS_COLLECTION).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      interviewOffers: normalizeInterviewOffers(data.interviewOffers),
    } as Application;
  });
}

/**
 * Get applications for a specific Team (for Team Captain)
 */
export async function getTeamApplications(team: Team): Promise<Application[]> {
  const snapshot = await adminDb
    .collection(APPLICATIONS_COLLECTION)
    .where("team", "==", team)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      interviewOffers: normalizeInterviewOffers(data.interviewOffers),
    } as Application;
  });
}

/**
 * Get applications for a specific System (for System Lead/Reviewer)
 * Filters by preferredSystems (array-contains).
 */
export async function getSystemApplications(
  team: Team,
  system: string
): Promise<Application[]> {
  const snapshot = await adminDb
    .collection(APPLICATIONS_COLLECTION)
    .where("team", "==", team)
    .where("preferredSystems", "array-contains", system)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      interviewOffers: normalizeInterviewOffers(data.interviewOffers),
    } as Application;
  });
}

