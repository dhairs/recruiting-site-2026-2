import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { ReviewTask } from "@/lib/models/ApplicationExtras";
import pino from "pino";

const logger = pino();

// GET tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const snapshot = await adminDb
      .collection("applications")
      .doc(id)
      .collection("tasks")
      .orderBy("createdAt", "asc")
      .get();

    const tasks = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.error(error, "Failed to fetch tasks");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST new task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const body = await request.json();
    const { description } = body;

    const taskRef = adminDb.collection("applications").doc(id).collection("tasks").doc();
    
    const taskData: ReviewTask = {
      id: taskRef.id,
      applicationId: id,
      description,
      isCompleted: false,
      createdAt: new Date(),
    };

    await taskRef.set(taskData);

    return NextResponse.json({ task: taskData });
  } catch (error) {
    logger.error(error, "Failed to create task");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PATCH toggle task
// Note: Handled via a separate dynamic route or query param, but simpler to put PATCH here for ID
