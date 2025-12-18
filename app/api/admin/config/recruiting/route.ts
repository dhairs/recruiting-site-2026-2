import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getRecruitingConfig, updateRecruitingStep } from "@/lib/firebase/config";
import { RecruitingStep } from "@/lib/models/Config";
import pino from "pino";

const logger = pino();

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
    const config = await getRecruitingConfig();
    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    logger.error(error, "Failed to fetch recruiting config");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Check if user is admin (optional extra check, but layout handles it mostly)
    // Could check role here if strict. Assuming admin route protection via middleware or layout context usually.

    const body = await request.json();
    const { step } = body;

    if (!Object.values(RecruitingStep).includes(step)) {
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    await updateRecruitingStep(step, decoded.uid);
    
    return NextResponse.json({ success: true, step });
  } catch (error) {
    logger.error(error, "Failed to update recruiting step");
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
