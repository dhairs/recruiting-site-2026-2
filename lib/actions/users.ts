"use server";

import { adminDb } from "@/lib/firebase/admin";
import { User, Team } from "@/lib/models/User";

const USERS_COLLECTION = "users";

/**
 * Fetch all users who are members of a specific team.
 * Used to populate the "Interviewer" dropdown.
 */
export async function getTeamMembers(team: Team): Promise<User[]> {
  const snapshot = await adminDb
    .collection(USERS_COLLECTION)
    .where("memberProfile.team", "==", team)
    .get();

  return snapshot.docs.map((doc) => doc.data() as User);
}
