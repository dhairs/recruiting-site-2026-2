"use client";

import { useState, useEffect } from "react";
import { User, UserRole, Team } from "@/lib/models/User";
import { ApplicationQuestion, ApplicationQuestionsConfig } from "@/lib/models/Config";
import { Plus, Trash2, Save, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

interface QuestionsTabProps {
  userData: User;
}

export function QuestionsTab({ userData }: QuestionsTabProps) {
  const [config, setConfig] = useState<ApplicationQuestionsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    common: true,
  });

  const isAdmin = userData.role === UserRole.ADMIN;
  const isTeamCaptain = userData.role === UserRole.TEAM_CAPTAIN_OB;
  const isSystemLead = userData.role === UserRole.SYSTEM_LEAD;
  const userTeam = userData.memberProfile?.team;
  const userSystem = userData.memberProfile?.system;

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/admin/config/questions");
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setConfig(data.config);

      // Set default expanded sections based on role
      const defaultExpanded: Record<string, boolean> = { common: isAdmin };
      if (isTeamCaptain && userTeam) {
        defaultExpanded[userTeam] = true;
      }
      if (isSystemLead && userSystem) {
        defaultExpanded[userSystem] = true;
      }
      if (isAdmin) {
        Object.values(Team).forEach(team => {
          defaultExpanded[team] = false;
        });
      }
      setExpandedSections(defaultExpanded);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const canEditCommon = isAdmin;
  const canEditTeam = (team: string) => isAdmin || (isTeamCaptain && team === userTeam);
  const canEditSystem = (system: string) => isAdmin || (isSystemLead && system === userSystem);

  const updateQuestion = (
    scope: "common" | "team" | "system",
    key: string,
    index: number,
    field: keyof ApplicationQuestion,
    value: string | boolean | string[] | number | undefined
  ) => {
    if (!config) return;

    setConfig(prev => {
      if (!prev) return prev;

      if (scope === "common") {
        const newQuestions = [...prev.commonQuestions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        return { ...prev, commonQuestions: newQuestions };
      } else if (scope === "team") {
        const newTeamQuestions = { ...prev.teamQuestions };
        newTeamQuestions[key] = [...(newTeamQuestions[key] || [])];
        newTeamQuestions[key][index] = { ...newTeamQuestions[key][index], [field]: value };
        return { ...prev, teamQuestions: newTeamQuestions };
      } else {
        const newSystemQuestions = { ...prev.systemQuestions };
        newSystemQuestions[key] = [...(newSystemQuestions[key] || [])];
        newSystemQuestions[key][index] = { ...newSystemQuestions[key][index], [field]: value };
        return { ...prev, systemQuestions: newSystemQuestions };
      }
    });
  };

  const addQuestion = (scope: "common" | "team" | "system", key?: string) => {
    if (!config) return;

    const newQuestion: ApplicationQuestion = {
      id: `q_${Date.now()}`,
      label: "",
      type: "text",
      required: false,
      placeholder: "",
    };

    setConfig(prev => {
      if (!prev) return prev;

      if (scope === "common") {
        return { ...prev, commonQuestions: [...prev.commonQuestions, newQuestion] };
      } else if (scope === "team" && key) {
        const newTeamQuestions = { ...prev.teamQuestions };
        newTeamQuestions[key] = [...(newTeamQuestions[key] || []), newQuestion];
        return { ...prev, teamQuestions: newTeamQuestions };
      } else if (scope === "system" && key) {
        const newSystemQuestions = { ...prev.systemQuestions };
        newSystemQuestions[key] = [...(newSystemQuestions[key] || []), newQuestion];
        return { ...prev, systemQuestions: newSystemQuestions };
      }
      return prev;
    });
  };

  const removeQuestion = (scope: "common" | "team" | "system", key: string, index: number) => {
    if (!config) return;

    setConfig(prev => {
      if (!prev) return prev;

      if (scope === "common") {
        const newQuestions = prev.commonQuestions.filter((_, i) => i !== index);
        return { ...prev, commonQuestions: newQuestions };
      } else if (scope === "team") {
        const newTeamQuestions = { ...prev.teamQuestions };
        newTeamQuestions[key] = newTeamQuestions[key].filter((_, i) => i !== index);
        return { ...prev, teamQuestions: newTeamQuestions };
      } else {
        const newSystemQuestions = { ...prev.systemQuestions };
        newSystemQuestions[key] = newSystemQuestions[key].filter((_, i) => i !== index);
        return { ...prev, systemQuestions: newSystemQuestions };
      }
    });
  };

  const saveSection = async (scope: "common" | "team" | "system", key?: string) => {
    if (!config) return;
    setSaving(true);

    try {
      const body: Record<string, unknown> = { scope };

      if (scope === "common") {
        body.questions = config.commonQuestions;
      } else if (scope === "team" && key) {
        body.team = key;
        body.questions = config.teamQuestions[key] || [];
      } else if (scope === "system" && key) {
        body.system = key;
        body.questions = config.systemQuestions?.[key] || [];
      }

      const res = await fetch("/api/admin/config/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Questions saved successfully");
    } catch (error) {
      console.error("Error saving questions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionEditor = (
    question: ApplicationQuestion,
    index: number,
    scope: "common" | "team" | "system",
    key: string,
    canEdit: boolean
  ) => (
    <div
      key={question.id}
      className="bg-neutral-800/50 rounded-lg p-4 border border-white/5"
    >
      <div className="flex items-start gap-3">
        <div className="text-neutral-500 cursor-move">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Question Label</label>
              <input
                type="text"
                value={question.label}
                onChange={(e) => updateQuestion(scope, key, index, "label", e.target.value)}
                disabled={!canEdit}
                className="w-full bg-neutral-900 border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
                placeholder="Enter question label..."
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Type</label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(scope, key, index, "type", e.target.value)}
                disabled={!canEdit}
                className="w-full bg-neutral-900 border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="select">Dropdown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Placeholder</label>
              <input
                type="text"
                value={question.placeholder || ""}
                onChange={(e) => updateQuestion(scope, key, index, "placeholder", e.target.value)}
                disabled={!canEdit}
                className="w-full bg-neutral-900 border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
                placeholder="Optional placeholder text..."
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(scope, key, index, "required", e.target.checked)}
                  disabled={!canEdit}
                  className="rounded border-white/20 bg-neutral-900"
                />
                Required
              </label>
            </div>
          </div>

          {(question.type === "text" || question.type === "textarea") && (
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Max Word Count (optional)</label>
              <input
                type="number"
                min={1}
                value={question.maxWordCount || ""}
                onChange={(e) => updateQuestion(scope, key, index, "maxWordCount", e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={!canEdit}
                className="w-full bg-neutral-900 border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
                placeholder="No limit"
              />
            </div>
          )}

          {question.type === "select" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Options (comma-separated)</label>
                <input
                  type="text"
                  value={question.options?.join(", ") || ""}
                  onChange={(e) => updateQuestion(scope, key, index, "options", e.target.value.split(",").map(s => s.trim()))}
                  disabled={!canEdit}
                  className="w-full bg-neutral-900 border border-white/10 rounded px-3 py-2 text-sm disabled:opacity-50"
                  placeholder="Option 1, Option 2, Option 3..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.allowOther || false}
                  onChange={(e) => updateQuestion(scope, key, index, "allowOther", e.target.checked)}
                  disabled={!canEdit}
                  className="rounded border-white/10 bg-neutral-900"
                />
                <label className="text-xs text-neutral-400">
                  Allow &quot;Other&quot; option (adds a text input for custom answers)
                </label>
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <button
            onClick={() => removeQuestion(scope, key, index)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderSection = (
    title: string,
    questions: ApplicationQuestion[],
    scope: "common" | "team" | "system",
    key: string,
    canEdit: boolean,
    color?: string
  ) => {
    const isExpanded = expandedSections[key] ?? false;

    return (
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className={clsx(
            "w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors",
            color && "border-l-4",
          )}
          style={color ? { borderLeftColor: color } : undefined}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">{title}</span>
            <span className="text-sm text-neutral-500">({questions.length} questions)</span>
          </div>
          {canEdit && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
              Can Edit
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="p-4 pt-0 space-y-4 border-t border-white/10">
            <div className="space-y-3 mt-4">
              {questions.map((q, i) => renderQuestionEditor(q, i, scope, key, canEdit))}
            </div>

            {canEdit && (
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => addQuestion(scope, key)}
                  className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300"
                >
                  <Plus className="h-4 w-4" />
                  Add Question
                </button>
                <button
                  onClick={() => saveSection(scope, key)}
                  disabled={saving}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-400 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-neutral-500">
        <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mr-3" />
        Loading questions...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center p-12 text-neutral-500">
        Failed to load questions configuration.
      </div>
    );
  }

  // Team colors for visual distinction
  const teamColors: Record<string, string> = {
    [Team.ELECTRIC]: "#FFB526",
    [Team.SOLAR]: "#FF9404",
    [Team.COMBUSTION]: "#FFC871",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Application Questions</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Configure the questions shown on application forms. Resume upload is always required.
          </p>
          <p className="text-xs text-amber-500/80 mt-2">
            ⏱ Note: Changes may take up to 2 hours to appear for applicants due to caching.
          </p>
        </div>
      </div>

      {/* Info Banner for non-admins */}
      {!isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
          {isTeamCaptain && (
            <>You can edit questions for your team: <strong>{userTeam}</strong></>
          )}
          {isSystemLead && (
            <>You can edit system-specific questions for: <strong>{userSystem}</strong></>
          )}
        </div>
      )}

      {/* Common Questions - Admin only */}
      {(isAdmin || config.commonQuestions.length > 0) && (
        renderSection(
          "Common Questions (All Applications)",
          config.commonQuestions,
          "common",
          "common",
          canEditCommon
        )
      )}

      {/* Team Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-neutral-300">Team-Specific Questions</h3>
        {Object.values(Team).map(team => {
          const questions = config.teamQuestions[team] || [];
          // Only show if admin, or if it's the user's team, or if it has questions
          if (!isAdmin && team !== userTeam && questions.length === 0) return null;

          return (
            <div key={team}>
              {renderSection(
                `${team} Team`,
                questions,
                "team",
                team,
                canEditTeam(team),
                teamColors[team]
              )}
            </div>
          );
        })}
      </div>

      {/* System Questions - if any exist */}
      {config.systemQuestions && Object.keys(config.systemQuestions).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-300">System-Specific Questions</h3>
          {Object.entries(config.systemQuestions).map(([system, questions]) => {
            if (!isAdmin && system !== userSystem && questions.length === 0) return null;

            return (
              <div key={system}>
                {renderSection(
                  `${system} System`,
                  questions,
                  "system",
                  system,
                  canEditSystem(system)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
