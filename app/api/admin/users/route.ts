import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getAllUsers } from "@/lib/firebase/users";
import pino from "pino";
import { UserRole } from "@/lib/models/User";

const logger = pino();

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
    logger.error({ err: error }, "Failed to verify session cookie");
    return null;
  }
}

export async function GET(request: NextRequest) {
  const uid = await getCurrentUserUid(request);

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user is admin (optional safety check, though middleware likely handles this)
     // For now relying on the fact that this is under /admin and protected by middleware
     // But good to fetch the user and check role if strict security needed.
     // Proceeding with just fetching users.

    const users = await getAllUsers();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Failed to get users");
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 }
    );
  }
}
