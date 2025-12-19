import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getApplication, updateApplication } from "@/lib/firebase/applications";
import { ApplicationStatus } from "@/lib/models/Application";
import pino from "pino";

const logger = pino();

/**
 * POST /api/admin/applications/[id]/reject
 * Reject an applicant from specific systems by removing their interview offers.
 * If no interview offers remain, the application status is set to REJECTED.
 * 
 * Body: { systems: string[] }
 */
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const body = await request.json();
    const { systems } = body;

    if (!systems || !Array.isArray(systems) || systems.length === 0) {
      return NextResponse.json({ error: "Systems array is required" }, { status: 400 });
    }

    const application = await getApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get existing interview offers
    const existingOffers = application.interviewOffers || [];
    
    // Remove offers for the specified systems
    const remainingOffers = existingOffers.filter(
      offer => !systems.includes(offer.system)
    );

    // Determine if application should be marked as REJECTED
    // Only if no offers remain
    const hasActiveOffers = remainingOffers.length > 0;
    
    const updates: Partial<{ interviewOffers: typeof remainingOffers; status: ApplicationStatus }> = {
      interviewOffers: remainingOffers,
    };

    // Only set status to REJECTED if no active offers remain
    if (!hasActiveOffers) {
      updates.status = ApplicationStatus.REJECTED;
    }

    const updatedApp = await updateApplication(id, updates);

    return NextResponse.json({ 
      application: updatedApp,
      fullyRejected: !hasActiveOffers 
    }, { status: 200 });

  } catch (error) {
    logger.error(error, "Failed to reject application");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
