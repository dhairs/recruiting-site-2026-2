import { adminDb } from "./admin";
import { getScorecardConfig } from "./scorecards";
import { calculateOverallRating } from "@/lib/scorecards/aggregates";
import { ScorecardSubmission, ScorecardConfig } from "@/lib/models/Scorecard";
import { Team } from "@/lib/models/User";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Atomically update the aggregate rating for a specific system on an application.
 * Uses a Firestore transaction to prevent race conditions when multiple reviewers
 * submit scorecards concurrently.
 * 
 * @param applicationId - The application document ID
 * @param system - The system the scorecard is for (e.g., "Electronics")
 * @param type - "review" for application scorecards, "interview" for interview scorecards
 * @param team - The team the application is for
 */
export async function updateAggregateRating(
  applicationId: string,
  system: string,
  type: "review" | "interview",
  team: Team
): Promise<void> {
  const applicationRef = adminDb.collection("applications").doc(applicationId);
  
  // Determine which subcollection to query
  const scorecardCollection = type === "review" ? "scorecards" : "interviewScorecards";
  const ratingField = type === "review" ? "reviewRating" : "interviewRating";
  
  await adminDb.runTransaction(async (transaction) => {
    // Fetch all scorecards for this system
    const scorecardsRef = applicationRef
      .collection(scorecardCollection)
      .where("system", "==", system);
    
    const scorecardsSnapshot = await transaction.get(scorecardsRef);
    
    const submissions: ScorecardSubmission[] = scorecardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        submittedAt: data.submittedAt?.toDate?.() || data.submittedAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as ScorecardSubmission;
    });
    
    // Get the scorecard config for this system
    const config: ScorecardConfig | null = await getScorecardConfig(
      team, 
      system, 
      type === "interview" ? "interview" : "application"
    );
    
    // Calculate the aggregate rating (returns null if no config or no submissions)
    const rating = calculateOverallRating(submissions, config);
    
    // Get current application data to preserve other aggregate ratings
    const appDoc = await transaction.get(applicationRef);
    const appData = appDoc.data() || {};
    const existingRatings = appData.aggregateRatings || {};
    
    // Build the update - preserve other ratings, update this one
    const systemRatings = existingRatings[system] || {};
    systemRatings[ratingField] = rating;
    systemRatings.lastUpdated = new Date();
    
    // Update the application document
    transaction.update(applicationRef, {
      [`aggregateRatings.${system}`]: systemRatings,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Recalculate all aggregate ratings for an application.
 * Useful for backfilling existing data or fixing inconsistencies.
 */
export async function recalculateAllAggregateRatings(
  applicationId: string,
  team: Team,
  systems: string[]
): Promise<void> {
  for (const system of systems) {
    try {
      await updateAggregateRating(applicationId, system, "review", team);
      await updateAggregateRating(applicationId, system, "interview", team);
    } catch (error) {
      console.error(`Failed to recalculate ratings for ${applicationId}/${system}:`, error);
    }
  }
}


