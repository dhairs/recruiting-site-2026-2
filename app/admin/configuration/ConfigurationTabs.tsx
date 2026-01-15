"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InterviewSlotConfig } from "@/lib/models/Interview";
import { User } from "@/lib/models/User";
import { InterviewsTab } from "./InterviewsTab";
import { ScorecardsTab } from "./ScorecardsTab";
import { QuestionsTab } from "./QuestionsTab";
import { Calendar, ClipboardList, FileQuestion } from "lucide-react";

type TabType = "interviews" | "scorecards" | "questions";

interface ConfigurationTabsProps {
  configs: InterviewSlotConfig[];
  calendars: { id: string; summary: string }[];
  teamMembersMap: Record<string, User[]>;
  showCreateButton: boolean;
  leadSystemMissing: boolean;
  userData: User;
}

export function ConfigurationTabs({
  configs,
  calendars,
  teamMembersMap,
  showCreateButton,
  leadSystemMissing,
  userData,
}: ConfigurationTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam === "scorecards" ? "scorecards" : tabParam === "questions" ? "questions" : "interviews"
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/admin/configuration?tab=${tab}`, { scroll: false });
  };

  const tabs = [
    { id: "interviews" as TabType, label: "Interviews", icon: Calendar },
    { id: "scorecards" as TabType, label: "Scorecards", icon: ClipboardList },
    { id: "questions" as TabType, label: "Questions", icon: FileQuestion },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuration</h1>
        <p className="text-neutral-400">
          Manage interview, scorecard, and application question settings for your teams.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
                isActive
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-neutral-400 hover:text-white hover:border-white/20"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "interviews" && (
        <InterviewsTab
          configs={configs}
          calendars={calendars}
          teamMembersMap={teamMembersMap}
          showCreateButton={showCreateButton}
          leadSystemMissing={leadSystemMissing}
          userData={userData}
        />
      )}
      
      {activeTab === "scorecards" && <ScorecardsTab />}
      
      {activeTab === "questions" && <QuestionsTab userData={userData} />}
    </div>
  );
}
