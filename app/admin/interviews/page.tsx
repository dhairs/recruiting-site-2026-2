import { requireStaff } from "@/lib/auth/guard";
import { getInterviewConfigsForUser, createInterviewConfig } from "@/lib/actions/interview-config";
import { InterviewConfigForm } from "./InterviewConfigForm";
import { User, UserRole } from "@/lib/models/User";
import { InterviewSlotConfig } from "@/lib/models/Interview";
import { listAccessibleCalendars } from "@/lib/google/calendar";
import { getTeamMembers } from "@/lib/actions/users";

export default async function InterviewsPage() {
  const { uid, user } = await requireStaff();
  const userData = user as User;

  // Fetch configs accessible to this user
  const configs = await getInterviewConfigsForUser(uid);

  // Fetch data for the form (calendars, users)
  // Optimization: We could defer this, but for simplicity, we load it here.
  // Note: 'listAccessibleCalendars' requires service account creds which might fail in dev without setup.
  // We handle errors gracefully.
  let calendars: { id: string; summary: string }[] = [];
  try {
    calendars = await listAccessibleCalendars();
  } catch (e) {
    console.error("Failed to list calendars:", e);
  }

  // If user is a System Lead but has no config, we might want to propose creating one.
  const showCreateOption = configs.length === 0 &&
    (userData.role === UserRole.SYSTEM_LEAD || userData.role === UserRole.TEAM_CAPTAIN_OB);

  // For the dropdowns, we need users.
  // If we are admin, we might need all users? Or just load on demand?
  // The requirements say "dropdown that has only members from that team".
  // So we pass the user fetching logic to the client component or fetch all needed here.
  // Since we have multiple configs (potentially), each config belongs to a team.
  // We should fetch members for relevant teams.

  const relevantTeams = new Set<string>();
  if (userData.memberProfile?.team) {
    relevantTeams.add(userData.memberProfile.team);
  }
  configs.forEach(c => relevantTeams.add(c.team));

  // Fetch members for all relevant teams
  const teamMembersMap: Record<string, User[]> = {};
  for (const team of relevantTeams) {
    // Cast string to Team enum if valid, skip if not
    // We assume the team string in config matches Team enum
    // @ts-ignore
    teamMembersMap[team] = await getTeamMembers(team);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Interview Configuration</h1>
        <p className="text-neutral-400">
          Manage interview settings, interviewers, and availability for your system.
        </p>
      </div>

      {configs.length === 0 && !showCreateOption && (
        <div className="p-4 rounded-lg bg-neutral-900 border border-white/10 text-neutral-400">
          You do not have access to any interview configurations.
        </div>
      )}

      {showCreateOption && configs.length === 0 && (
         <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
           No configuration found for your system. Please contact an administrator to initialize it.
           {/*
             Ideally we would have a "Create" button here, but the plan focused on "Edit".
             We can add a simple "Initialize" server action if needed, but for now we follow the plan.
           */}
         </div>
      )}

      <div className="grid gap-8">
        {configs.map((config) => (
          <InterviewConfigForm
            key={config.id}
            config={config}
            calendars={calendars}
            availableUsers={teamMembersMap[config.team] || []}
          />
        ))}
      </div>
    </div>
  );
}
