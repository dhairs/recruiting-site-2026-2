"use client";

import { useEffect, useState } from "react";
import { TeamDescription } from "@/lib/models/Config";

interface TeamsData {
  teams: Record<string, TeamDescription>;
}

// Team color configuration using brand hex codes
const TEAM_COLORS: Record<string, { accent: string; bg: string; shadow: string; border: string }> = {
  Electric: {
    accent: "text-[#FFB526]",
    bg: "bg-[#FFB526]",
    shadow: "shadow-[#FFB526]/25",
    border: "hover:border-[#FFB526]/50",
  },
  Solar: {
    accent: "text-[#FF9404]",
    bg: "bg-[#FF9404]",
    shadow: "shadow-[#FF9404]/25",
    border: "hover:border-[#FF9404]/50",
  },
  Combustion: {
    accent: "text-[#FFC871]",
    bg: "bg-[#FFC871]",
    shadow: "shadow-[#FFC871]/25",
    border: "hover:border-[#FFC871]/50",
  },
};

export default function TeamsPage() {
  const [teamsData, setTeamsData] = useState<TeamsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<string>("Electric");

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await fetch("/api/teams");
        if (response.ok) {
          const data = await response.json();
          setTeamsData(data);
          const teamNames = Object.keys(data.teams);
          if (teamNames.length > 0) {
            setActiveTeam(teamNames[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  const teamOrder = ["Electric", "Solar", "Combustion"];
  const sortedTeams = teamsData 
    ? teamOrder.filter(t => teamsData.teams[t]).map(t => teamsData.teams[t])
    : [];

  const getTeamColors = (teamName: string) => TEAM_COLORS[teamName] || TEAM_COLORS.Electric;

  return (
    <main className="min-h-screen bg-black pt-24 pb-20">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-6">
            Our <span className="text-orange-500">Teams</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-3xl mx-auto">
            Longhorn Racing is divided into three specialized teams, each focused on a different powertrain technology.
            Explore our teams and their sub-systems below.
          </p>
        </section>

        {/* Teams Section */}
        <section className="mb-20">
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-pulse flex flex-col items-center gap-4 w-full max-w-4xl">
                <div className="flex gap-4 justify-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 w-32 bg-neutral-800 rounded-lg" />
                  ))}
                </div>
                <div className="h-32 w-full bg-neutral-800 rounded-2xl" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-32 bg-neutral-800 rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          ) : sortedTeams.length === 0 ? (
            <p className="text-center text-neutral-400">No team information available.</p>
          ) : (
            <>
              {/* Team Tabs */}
              <div className="flex justify-center gap-2 mb-8 flex-wrap">
                {sortedTeams.map((team) => {
                  const colors = getTeamColors(team.name);
                  const isActive = activeTeam === team.name;
                  return (
                    <button
                      key={team.name}
                      onClick={() => setActiveTeam(team.name)}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        isActive
                          ? `${colors.bg} text-white shadow-lg ${colors.shadow}`
                          : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-white/5"
                      }`}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>

              {/* Active Team Content */}
              {teamsData?.teams[activeTeam] && (
                <div className="animate-fadeIn">
                  {/* Team Description */}
                  <div className="mb-10 p-8 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className={getTeamColors(activeTeam).accent}>Longhorn Racing</span> {activeTeam}
                    </h3>
                    <p className="text-neutral-300 leading-relaxed">
                      {teamsData.teams[activeTeam].description}
                    </p>
                  </div>

                  {/* Subsystems Grid */}
                  <h4 className="text-xl font-bold text-white mb-6 text-center">Sub-teams</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamsData.teams[activeTeam].subsystems.map((subsystem, index) => (
                      <div 
                        key={index} 
                        className={`p-6 rounded-2xl bg-neutral-900 border border-white/5 ${getTeamColors(activeTeam).border} transition-all duration-300 hover:transform hover:scale-[1.02]`}
                      >
                        <h5 className="text-lg font-bold text-white mb-3">{subsystem.name}</h5>
                        <p className="text-neutral-400 text-sm leading-relaxed">{subsystem.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
