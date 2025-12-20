"use client";

import { InterviewSlotConfig } from "@/lib/models/Interview";
import { User, UserRole } from "@/lib/models/User";
import { InterviewConfigForm } from "./InterviewConfigForm";
import { CreateConfigModal } from "./CreateConfigModal";
import { InitializeSystemButton } from "./InitializeSystemButton";

interface InterviewsTabProps {
  configs: InterviewSlotConfig[];
  calendars: { id: string; summary: string }[];
  teamMembersMap: Record<string, User[]>;
  showCreateButton: boolean;
  leadSystemMissing: boolean;
  userData: User;
}

export function InterviewsTab({
  configs,
  calendars,
  teamMembersMap,
  showCreateButton,
  leadSystemMissing,
  userData,
}: InterviewsTabProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Interview Configuration</h2>
          <p className="text-neutral-400">
            Manage interview settings, interviewers, and availability.
          </p>
        </div>

        {showCreateButton && (
          <CreateConfigModal
            existingConfigs={configs}
            userRole={userData.role}
            userTeam={userData.memberProfile?.team}
          />
        )}
      </div>

      {configs.length === 0 && !leadSystemMissing && !showCreateButton && (
        <div className="p-4 rounded-lg bg-neutral-900 border border-white/10 text-neutral-400">
          You do not have access to any interview configurations.
        </div>
      )}

      {leadSystemMissing && userData.memberProfile && (
        <div className="p-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-orange-500 mb-1">Configuration Missing</h3>
            <p className="text-neutral-400 text-sm">
              The interview configuration for <span className="text-white font-medium">{userData.memberProfile.system}</span> has not been initialized.
            </p>
          </div>
          <InitializeSystemButton
            team={userData.memberProfile.team}
            system={userData.memberProfile.system as string}
          />
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
