import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { updateApplication } from "@/lib/firebase/applications";
import { ApplicationStatus } from "@/lib/models/Application";
import pino from "pino";

const logger = pino();

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> } // Correct Next.js 15 params type
) {
  const { id } = await params;
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
    // TODO: Add refined permission check (can this user edit this app?)

    const body = await request.json();
    const { status } = body;

    if (!Object.values(ApplicationStatus).includes(status)) {
       return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updatedApp = await updateApplication(id, { status });

    return NextResponse.json({ application: updatedApp }, { status: 200 });

  } catch (error) {
    logger.error(error, "Failed to update application status");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
