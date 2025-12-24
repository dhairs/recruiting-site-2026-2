import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/guard";
import { getApplication } from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import pino from "pino";

const logger = pino();

/**
 * GET /api/admin/applications/[id]/details
 * Get a single application with user data for sidebar display
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;

    const application = await getApplication(id);
    
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Fetch user data
    const user = await getUser(application.userId);

    const enrichedApplication = {
      ...application,
      user: user || { name: "Unknown", email: "", role: "applicant" },
      aggregateRating: null,
      interviewAggregateRating: null,
    };

    return NextResponse.json({ application: enrichedApplication }, { status: 200 });
  } catch (error) {
    logger.error(error, "Failed to fetch application details");
    
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Forbidden"))) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
