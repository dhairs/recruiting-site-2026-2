import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/guard";
import {
  getAllApplicationsPaginated,
  getSystemApplicationsPaginated,
  getTeamApplicationsPaginated,
  PaginatedApplicationsResult,
} from "@/lib/firebase/applications";
import { adminDb } from "@/lib/firebase/admin";
import { getUser } from "@/lib/firebase/users";
import { UserRole, Team } from "@/lib/models/User";
import { RecruitingStep } from "@/lib/models/Config";
import pino from "pino";

const logger = pino();

// Default page size for pagination
const DEFAULT_PAGE_SIZE = 50;

// Valid sort options
type SortBy = "date" | "name" | "rating" | "interviewRating";
type SortDirection = "asc" | "desc";

// Helper to check if recruiting step is at or past a certain stage
const RECRUITING_STEP_ORDER: RecruitingStep[] = [
  RecruitingStep.OPEN,
  RecruitingStep.REVIEWING,
  RecruitingStep.RELEASE_INTERVIEWS,
  RecruitingStep.INTERVIEWING,
  RecruitingStep.RELEASE_TRIAL,
  RecruitingStep.TRIAL_WORKDAY,
  RecruitingStep.RELEASE_DECISIONS,
];

function isRecruitingStepAtOrPast(currentStep: RecruitingStep | null, targetStep: RecruitingStep): boolean {
  if (!currentStep) return false;
  const currentIndex = RECRUITING_STEP_ORDER.indexOf(currentStep);
  const targetIndex = RECRUITING_STEP_ORDER.indexOf(targetStep);
  return currentIndex >= targetIndex;
}


export async function GET(request: NextRequest) {
  try {
    const { user } = await requireStaff();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse pagination and sorting parameters from query string
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor") || undefined;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : DEFAULT_PAGE_SIZE;
    const sortBy = (searchParams.get("sortBy") as SortBy) || "date";
    const sortDirection = (searchParams.get("sortDirection") as SortDirection) || "desc";

    // Get the user's system for rating lookups
    const userSystem = user.memberProfile?.system;

    // Determine what applications to return based on role
    let paginatedResult: PaginatedApplicationsResult;

    switch (user.role) {
      case UserRole.ADMIN:
        // Admins see everything
        paginatedResult = await getAllApplicationsPaginated(limit, cursor);
        break;

      case UserRole.TEAM_CAPTAIN_OB:
        // Team Captains see their team's applications
        if (!user.memberProfile?.team) {
           // Fallback/Error if profile is incomplete
           return NextResponse.json({ error: "Team profile missing" }, { status: 403 });
        }
        paginatedResult = await getTeamApplicationsPaginated(user.memberProfile.team, limit, cursor);
        // Filter out in_progress applications - non-admins shouldn't see drafts
        paginatedResult.applications = paginatedResult.applications.filter(app => app.status !== "in_progress");
        break;

      case UserRole.SYSTEM_LEAD:
      case UserRole.REVIEWER:
        // System Leads and Reviewers see their system's applications
         if (!user.memberProfile?.team || !user.memberProfile?.system) {
           return NextResponse.json({ error: "System profile missing" }, { status: 403 });
        }
        paginatedResult = await getSystemApplicationsPaginated(user.memberProfile.team, user.memberProfile.system, limit, cursor);
        // Filter out in_progress applications - non-admins shouldn't see drafts
        paginatedResult.applications = paginatedResult.applications.filter(app => app.status !== "in_progress");
        break;


      default:
        // Applicants or no role shouldn't be here
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const applications = paginatedResult.applications;

    // Enrich applications with user data
    // optimization: unique userIds to avoid duplicate fetches
    const userIds = Array.from(new Set(applications.map((app) => app.userId)));
    const userMap = new Map();

    await Promise.all(
      userIds.map(async (uid) => {
        const userAppProfile = await getUser(uid);
        if (userAppProfile) {
          userMap.set(uid, userAppProfile);
        }
      })
    );

    // Get current recruiting step to determine if interview ratings should be shown
    const recruitingConfigDoc = await adminDb.collection("config").doc("recruiting").get();
    const currentStep = recruitingConfigDoc.exists 
      ? (recruitingConfigDoc.data()?.currentStep as RecruitingStep | null)
      : null;
    const showInterviewRatings = isRecruitingStepAtOrPast(currentStep, RecruitingStep.RELEASE_INTERVIEWS);

    // Build enriched applications using stored aggregate ratings
    const enrichedApplications = applications.map((app) => {
      // Get stored ratings for the user's system (or first preferred system for admins)
      const targetSystem = userSystem || app.preferredSystems?.[0];
      const systemRatings = targetSystem && app.aggregateRatings 
        ? app.aggregateRatings[targetSystem] 
        : undefined;
      
      return {
        ...app,
        user: userMap.get(app.userId) || { name: "Unknown", email: "", role: "applicant" },
        aggregateRating: systemRatings?.reviewRating ?? null,
        interviewAggregateRating: showInterviewRatings ? (systemRatings?.interviewRating ?? null) : null,
      };
    });

    // Apply client-side sorting for rating sorts (since Firestore can't sort by nested field + filter)
    // For date sorting, Firestore already returns in createdAt order
    if (sortBy === "rating" || sortBy === "interviewRating") {
      const ratingField = sortBy === "rating" ? "aggregateRating" : "interviewAggregateRating";
      enrichedApplications.sort((a, b) => {
        const aRating = a[ratingField] ?? -1;
        const bRating = b[ratingField] ?? -1;
        return sortDirection === "desc" ? bRating - aRating : aRating - bRating;
      });
    } else if (sortBy === "name") {
      enrichedApplications.sort((a, b) => {
        const aName = a.user?.name?.toLowerCase() || "";
        const bName = b.user?.name?.toLowerCase() || "";
        return sortDirection === "desc" 
          ? bName.localeCompare(aName) 
          : aName.localeCompare(bName);
      });
    }
    // date sorting is already handled by Firestore's orderBy

    return NextResponse.json({ 
      applications: enrichedApplications,
      nextCursor: paginatedResult.nextCursor,
      hasMore: paginatedResult.hasMore,
    }, { status: 200 });

  } catch (error) {
    logger.error(error, "Failed to fetch admin applications");
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Forbidden"))) {
         return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

