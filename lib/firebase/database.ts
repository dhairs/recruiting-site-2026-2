import { adminDb } from "@/lib/firebase/admin";
import { UserRecord } from "firebase-admin/auth";
import { User } from "@/lib/models/User";

export async function userExists(user: UserRecord) {
  if ((await adminDb.doc(`users/${user.uid}`).get()).exists) {
    return true;
  }

  return false;
}

export async function updateUserData(user: User) {
  await adminDb.doc(`users/${user.uid}`).set(user, { merge: true });
}
