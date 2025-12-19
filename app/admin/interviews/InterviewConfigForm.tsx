"use client";

import { useState } from "react";
import { InterviewSlotConfig } from "@/lib/models/Interview";
import { User } from "@/lib/models/User";
import { updateInterviewConfig } from "@/lib/actions/interview-config"; // We need to make this a Server Action or wrap it
import { Calendar, Save, Loader2, Check, Clock, Users, Globe } from "lucide-react";
import { toast } from "react-hot-toast";

interface Props {
  config: InterviewSlotConfig;
  calendars: { id: string; summary: string }[];
  availableUsers: User[];
}

export function InterviewConfigForm({ config, calendars, availableUsers }: Props) {
  const [formData, setFormData] = useState<InterviewSlotConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Filter and Sort Users
  // Req: "show a drop down that has only members from that team, not necessarily system"
  // Req: "sort so that members of the specified system are highest on the list"
  const sortedUsers = [...availableUsers].sort((a, b) => {
    const aInSystem = a.memberProfile?.system === config.system;
    const bInSystem = b.memberProfile?.system === config.system;

    if (aInSystem && !bInSystem) return -1;
    if (!aInSystem && bInSystem) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleChange = (field: keyof InterviewSlotConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Note: 'updateInterviewConfig' is imported. Ensure it's treated as a server action.
      // If it's a direct import of the function I wrote in 'lib/actions', it needs 'use server' at top of that file,
      // OR we import it from a file that has 'use server'.
      // I need to check 'lib/actions/interview-config.ts' for 'use server'.
      // If I missed it, this will fail. I will check in next turn.
      await updateInterviewConfig(formData);
      toast.success("Configuration saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-neutral-800/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-8 bg-orange-500 rounded-full inline-block"></span>
            {config.team} - {config.system}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 pl-4">ID: {config.id}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            hasChanges
              ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
          }`}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Logistics */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Scheduling Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Google Calendar
              </label>
              <select
                value={formData.calendarId}
                onChange={(e) => handleChange("calendarId", e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">Select a calendar...</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => handleChange("durationMinutes", parseInt(e.target.value))}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Buffer (min)
                </label>
                <input
                  type="number"
                  value={formData.bufferMinutes}
                  onChange={(e) => handleChange("bufferMinutes", parseInt(e.target.value))}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1 flex items-center gap-2">
                 <Globe className="h-4 w-4" /> Timezone
              </label>
              <input
                type="text"
                value={formData.timezone || ""}
                onChange={(e) => handleChange("timezone", e.target.value)}
                placeholder="e.g., America/Chicago"
                className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Availability & People */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Availability Window
          </h3>

          <div className="space-y-4">
             <div className="flex gap-4 items-center">
               <div className="flex-1">
                 <label className="block text-sm font-medium text-neutral-400 mb-1">Start Hour (0-23)</label>
                 <input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.availableStartHour}
                    onChange={(e) => handleChange("availableStartHour", parseInt(e.target.value))}
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
               </div>
               <div className="flex-1">
                 <label className="block text-sm font-medium text-neutral-400 mb-1">End Hour (0-23)</label>
                 <input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.availableEndHour}
                    onChange={(e) => handleChange("availableEndHour", parseInt(e.target.value))}
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-neutral-400 mb-2">Available Days</label>
               <div className="flex flex-wrap gap-2">
                 {daysOfWeek.map((day) => {
                   const isSelected = formData.availableDays.includes(day.value);
                   return (
                     <button
                       key={day.value}
                       onClick={() => {
                         const newDays = isSelected
                           ? formData.availableDays.filter((d) => d !== day.value)
                           : [...formData.availableDays, day.value];
                         handleChange("availableDays", newDays);
                       }}
                       className={`px-3 py-1 text-sm rounded-full transition-colors ${
                         isSelected
                           ? "bg-orange-500 text-white"
                           : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                       }`}
                     >
                       {day.label.slice(0, 3)}
                     </button>
                   );
                 })}
               </div>
             </div>

             <div className="pt-4 border-t border-white/10">
               <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                 <Users className="h-5 w-5 text-orange-500" />
                 Interviewers
               </h3>

               <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                 {sortedUsers.map((user) => {
                   const isSelected = formData.interviewerEmails.includes(user.email);
                   const isSystemMember = user.memberProfile?.system === config.system;

                   return (
                     <div
                        key={user.uid}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-orange-500/10 border border-orange-500/20" : "hover:bg-neutral-800"
                        }`}
                        onClick={() => {
                          const newEmails = isSelected
                            ? formData.interviewerEmails.filter(e => e !== user.email)
                            : [...formData.interviewerEmails, user.email];
                          handleChange("interviewerEmails", newEmails);
                        }}
                     >
                       <div className="flex items-center gap-3">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                           isSelected ? "bg-orange-500 border-orange-500" : "border-neutral-500"
                         }`}>
                           {isSelected && <Check className="h-3 w-3 text-white" />}
                         </div>
                         <div>
                           <div className="text-sm font-medium text-white">{user.name}</div>
                           <div className="text-xs text-neutral-500">{user.email}</div>
                         </div>
                       </div>
                       {isSystemMember && (
                         <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                           {config.system}
                         </span>
                       )}
                     </div>
                   );
                 })}
               </div>
               <p className="text-xs text-neutral-500 mt-2">
                 Select users who will receive calendar invites for interviews.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
