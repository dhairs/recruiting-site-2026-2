import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getApplication } from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import { getScorecardConfig } from "@/lib/scorecards/config";
import { ScorecardSubmission } from "@/lib/models/Scorecard";
import pino from "pino";

const logger = pino();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedToken.uid;

    const application = await getApplication(id);
    if (!application) {
       return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Get config for the application's team
    const config = getScorecardConfig(application.team);
    
    // Get existing submission by THIS user
    const snapshot = await adminDb
        .collection("applications")
        .doc(id)
        .collection("scorecards")
        .where("reviewerId", "==", userId)
        .limit(1)
        .get();
        
    let submission = null;
    if (!snapshot.empty) {
        submission = snapshot.docs[0].data();
    }

    return NextResponse.json({ config, submission });

  } catch (error) {
    logger.error(error, "Failed to fetch scorecard data");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userId = decodedToken.uid;
    const user = await getUser(userId);

    const body = await request.json();
    const { data } = body;

    const collectionRef = adminDb.collection("applications").doc(id).collection("scorecards");
    
    // Check for existing
    const snapshot = await collectionRef.where("reviewerId", "==", userId).limit(1).get();
    
    if (!snapshot.empty) {
        // Update
        const docId = snapshot.docs[0].id;
        await collectionRef.doc(docId).update({
            data,
            updatedAt: new Date()
        });
    } else {
        // Create
        const docRef = collectionRef.doc();
        const submission: ScorecardSubmission = {
            id: docRef.id,
            applicationId: id,
            reviewerId: userId,
            reviewerName: user?.name || "Unknown",
            data,
            submittedAt: new Date(),
            updatedAt: new Date(),
        };
        await docRef.set(submission);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error(error, "Failed to save scorecard");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
