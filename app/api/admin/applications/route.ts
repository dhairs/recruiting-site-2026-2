import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  getAllApplications,
  getSystemApplications,
  getTeamApplications,
} from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import { UserRole } from "@/lib/models/User";
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
    logger.error(error, "Failed to verify session cookie");
    return null;
  }
}

export async function GET(request: NextRequest) {
  const uid = await getCurrentUserUid(request);

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUser(uid);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine what applications to return based on role
    let applications = [];

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins see everything
        applications = await getAllApplications();
        break;

      case UserRole.TEAM_CAPTAIN_OB:
        // Team Captains see their team's applications
        if (!user.memberProfile?.team) {
           // Fallback/Error if profile is incomplete
           return NextResponse.json({ error: "Team profile missing" }, { status: 403 });
        }
        applications = await getTeamApplications(user.memberProfile.team);
        break;

      case UserRole.SYSTEM_LEAD:
      case UserRole.REVIEWER:
        // System Leads and Reviewers see their system's applications
         if (!user.memberProfile?.team || !user.memberProfile?.system) {
           return NextResponse.json({ error: "System profile missing" }, { status: 403 });
        }
        applications = await getSystemApplications(user.memberProfile.team, user.memberProfile.system);
        break;


      default:
        // Applicants or no role shouldn't be here
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Enrich applications with user data
    // optimization: unique userIds to avoid duplicate fetches
    const userIds = Array.from(new Set(applications.map((app) => app.userId)));
    const userMap = new Map();

    await Promise.all(
      userIds.map(async (uid) => {
        const userAppProfile = await getUser(uid);
        if (userAppProfile) {
          userMap.set(uid, userAppProfile);
        }
      })
    );

    const enrichedApplications = applications.map((app) => ({
      ...app,
      user: userMap.get(app.userId) || { name: "Unknown", email: "", role: "applicant" },
    }));

    return NextResponse.json({ applications: enrichedApplications }, { status: 200 });
  } catch (error) {
    logger.error(error, "Failed to fetch admin applications");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
