import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  createApplication,
  getUserApplications,
} from "@/lib/firebase/applications";
import { Team } from "@/lib/models/User";
import pino from "pino";

const logger = pino();

/**
 * Helper to get the current user's UID from the session cookie
 */
async function getCurrentUserUid(request: NextRequest): Promise<string | null> {
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
    logger.error("Failed to verify session cookie", error);
    return null;
  }
}

/**
 * GET /api/applications
 * Get all applications for the current user
 */
export async function GET(request: NextRequest) {
  const uid = await getCurrentUserUid(request);

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await getUserApplications(uid);
    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    logger.error("Failed to get applications", error);
    return NextResponse.json(
      { error: "Failed to get applications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications
 * Create a new application for a team
 * Body: { team: "Electric" | "Solar" | "Combustion" }
 */
export async function POST(request: NextRequest) {
  const uid = await getCurrentUserUid(request);

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { team } = body;

    // Validate team
    if (!team || !Object.values(Team).includes(team)) {
      return NextResponse.json(
        { error: "Invalid team. Must be Electric, Solar, or Combustion" },
        { status: 400 }
      );
    }

    const application = await createApplication({
      userId: uid,
      team: team as Team,
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create application", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
