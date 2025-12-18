import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  getApplication,
  updateInterviewOfferStatus,
} from "@/lib/firebase/applications";
import {
  ApplicationStatus,
  InterviewEventStatus,
} from "@/lib/models/Application";
import { Team } from "@/lib/models/User";
import { InterviewSlotConfig } from "@/lib/models/Interview";
import {
  createInterviewEvent,
  cancelInterviewEvent,
} from "@/lib/google/calendar";
import pino from "pino";

const logger = pino();
const INTERVIEW_CONFIGS_COLLECTION = "interviewConfigs";
const USERS_COLLECTION = "users";

/**
 * Helper to get the current user's UID from the session cookie
 */
async function getCurrentUserUid(
  request: NextRequest
): Promise<string | null> {
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    return decodedToken.uid;
  } catch (error) {
    logger.error({ err: error }, "Failed to verify session cookie");
    return null;
  }
}

/**
 * Get user info (name, email) from Firestore
 */
async function getUserInfo(
  uid: string
): Promise<{ name: string; email: string } | null> {
  const doc = await adminDb.collection(USERS_COLLECTION).doc(uid).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    name: data.name || "Applicant",
    email: data.email,
  };
}

/**
 * Get interview config for a team/system
 */
async function getInterviewConfig(
  team: Team,
  system: string
): Promise<InterviewSlotConfig | null> {
  const configId = `${team.toLowerCase()}-${system
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  const doc = await adminDb
    .collection(INTERVIEW_CONFIGS_COLLECTION)
    .doc(configId)
    .get();

  if (!doc.exists) {
    // Try querying by team and system
    const snapshot = await adminDb
      .collection(INTERVIEW_CONFIGS_COLLECTION)
      .where("team", "==", team)
      .where("system", "==", system)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as InterviewSlotConfig;
  }

  return { id: doc.id, ...doc.data() } as InterviewSlotConfig;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/[id]/interview/schedule
 * Schedule an interview at a specific time slot
 * Body: { system: "Electronics", slotStart: ISO date string, slotEnd: ISO date string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const uid = await getCurrentUserUid(request);
  const { id } = await params;

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const application = await getApplication(id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Ensure user owns this application
    if (application.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if application is in interview status
    if (application.status !== ApplicationStatus.INTERVIEW) {
      return NextResponse.json(
        { error: "Application is not in interview stage" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { system, slotStart, slotEnd } = body;

    if (!system || !slotStart || !slotEnd) {
      return NextResponse.json(
        { error: "system, slotStart, and slotEnd are required" },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(slotStart);
    const endDate = new Date(slotEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Verify the offer exists
    const offers = application.interviewOffers || [];
    const offer = offers.find((o) => o.system === system);

    if (!offer) {
      return NextResponse.json(
        { error: `No interview offer found for system: ${system}` },
        { status: 400 }
      );
    }

    // Check if already scheduled (but allow rescheduling cancelled interviews)
    if (offer.status === InterviewEventStatus.SCHEDULED) {
      return NextResponse.json(
        { error: "Interview is already scheduled. Cancel it first to reschedule." },
        { status: 400 }
      );
    }

    // For Combustion/Electric, verify this is the selected system
    if (application.team !== Team.SOLAR && offers.length > 1) {
      if (application.selectedInterviewSystem !== system) {
        return NextResponse.json(
          { error: "Must select this system first before scheduling" },
          { status: 400 }
        );
      }
    }

    // Get interview config
    const config = await getInterviewConfig(application.team, system);
    if (!config) {
      return NextResponse.json(
        { error: `Interview configuration not found for ${system}` },
        { status: 500 }
      );
    }

    // Get user info for the calendar event
    const userInfo = await getUserInfo(uid);
    if (!userInfo) {
      return NextResponse.json(
        { error: "User information not found" },
        { status: 500 }
      );
    }

    // Create calendar event
    const eventId = await createInterviewEvent(
      config,
      system,
      userInfo.email,
      userInfo.name,
      startDate,
      endDate
    );

    // Update the interview offer status
    const updatedApplication = await updateInterviewOfferStatus(id, system, {
      status: InterviewEventStatus.SCHEDULED,
      eventId,
      scheduledAt: startDate,
      scheduledEndAt: endDate,
    });

    return NextResponse.json({
      success: true,
      eventId,
      scheduledAt: startDate.toISOString(),
      scheduledEndAt: endDate.toISOString(),
      application: updatedApplication,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to schedule interview");
    const message =
      error instanceof Error ? error.message : "Failed to schedule interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/applications/[id]/interview/schedule
 * Cancel a scheduled interview
 * Body: { system: "Electronics", reason?: "string" }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const uid = await getCurrentUserUid(request);
  const { id } = await params;

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const application = await getApplication(id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Ensure user owns this application
    if (application.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { system, reason } = body;

    if (!system) {
      return NextResponse.json(
        { error: "system is required" },
        { status: 400 }
      );
    }

    // Find the offer
    const offers = application.interviewOffers || [];
    const offer = offers.find((o) => o.system === system);

    if (!offer) {
      return NextResponse.json(
        { error: `No interview offer found for system: ${system}` },
        { status: 400 }
      );
    }

    // Check if there's an event to cancel
    if (
      offer.status !== InterviewEventStatus.SCHEDULED ||
      !offer.eventId
    ) {
      return NextResponse.json(
        { error: "No scheduled interview to cancel" },
        { status: 400 }
      );
    }

    // Get interview config to find the calendar ID
    const config = await getInterviewConfig(application.team, system);
    if (!config) {
      return NextResponse.json(
        { error: `Interview configuration not found for ${system}` },
        { status: 500 }
      );
    }

    // Cancel the calendar event
    try {
      await cancelInterviewEvent(config.calendarId, offer.eventId, true);
    } catch (calendarError) {
      logger.error({ err: calendarError }, "Failed to cancel calendar event");
      // Continue anyway - the event might have been manually deleted
    }

    // Update the interview offer status
    const updatedApplication = await updateInterviewOfferStatus(id, system, {
      status: InterviewEventStatus.CANCELLED,
      cancelReason: reason || "Cancelled by applicant",
    });

    return NextResponse.json({
      success: true,
      application: updatedApplication,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to cancel interview");
    const message =
      error instanceof Error ? error.message : "Failed to cancel interview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
