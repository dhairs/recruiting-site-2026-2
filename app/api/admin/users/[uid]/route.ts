import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { updateUser, getUser } from "@/lib/firebase/users";
import pino from "pino";
import { UserRole } from "@/lib/models/User";
import { FieldValue } from "firebase-admin/firestore";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const uid = await getCurrentUserUid(request);

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch current user to check permissions
    const currentUser = await getUser(uid);
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { role, team, system, isMember } = body;
    const { uid: targetUid } = await params;

    const updateData: any = {};
    
    if (role) {
        // Only Admins can update roles
        if (currentUser.role !== UserRole.ADMIN) {
             return NextResponse.json({ error: "Only admins can update roles" }, { status: 403 });
        }

        // Validate user role
        if (!Object.values(UserRole).includes(role)) {
             return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        updateData.role = role;
    }

    if (isMember !== undefined) {
        updateData.isMember = isMember;
    }



    if (team) {
        // We will need to merge this with existing memberProfile or create new
        // Ideally we fetch the user first, but for now let's assume we are passing full member profile or merging carefully
        // Simplified: update memberProfile with provided fields
        updateData['memberProfile.team'] = team;
        updateData['memberProfile.system'] = system || null;
        
        // Ensure isMember is true if we are setting team/system
        updateData.isMember = true;
    } else if (team === null || team === "") {
        // Explicitly remove member profile if team is cleared
        updateData.isMember = false;
        updateData.memberProfile = FieldValue.delete();
    }

    await updateUser(targetUid, updateData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Failed to update user");
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
