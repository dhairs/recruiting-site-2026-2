import { ScorecardConfig } from "@/lib/models/Scorecard";
import { Team } from "@/lib/models/User";

export const SCORECARD_CONFIGS: ScorecardConfig[] = [
  {
    team: Team.ELECTRIC,
    fields: [
      {
        id: "technical_knowledge",
        label: "Technical Knowledge",
        type: "rating",
        min: 1,
        max: 5,
        description: "Depth of understanding in relevant EE/CS concepts.",
        required: true,
      },
      {
        id: "problem_solving",
        label: "Problem Solving",
        type: "rating",
        min: 1,
        max: 5,
        description: "Approach to debugging and logic.",
        required: true,
      },
      {
        id: "culture_fit",
        label: "Culture Fit",
        type: "rating",
        min: 1,
        max: 5,
        description: "Enthusiasm, communication, and teamwork.",
        required: true,
      },
      {
        id: "comments",
        label: "Additional Comments",
        type: "long_text",
        required: false,
      },
      {
        id: "recommendation",
        label: "Recommend for Interview?",
        type: "boolean",
        required: true,
      },
    ],
  },
  {
    team: Team.COMBUSTION,
    fields: [
      {
        id: "mech_aptitude",
        label: "Mechanical Aptitude",
        type: "rating",
        min: 1,
        max: 5,
        description: "Understanding of mechanics and physical systems.",
        required: true,
      },
      {
        id: "hands_on",
        label: "Hands-on Experience",
        type: "rating",
        min: 1,
        max: 5,
        description: "Fabrication, tools, and project experience.",
        required: true,
      },
      {
        id: "dedication",
        label: "Dedication",
        type: "rating",
        min: 1,
        max: 5,
        description: "Willingness to commit time and effort.",
        required: true,
      },
      {
        id: "comments",
        label: "Comments",
        type: "long_text",
        required: false,
      },
    ],
  },
  {
     team: Team.SOLAR,
     fields: [
       {
         id: "innovation",
         label: "Innovation",
         type: "rating",
         min: 1,
         max: 5,
         description: "Creativity in solving unique solar challenges.",
         required: true,
       },
       {
         id: "reliability",
         label: "Reliability",
         type: "rating",
         min: 1,
         max: 5,
         required: true,
       },
       {
         id: "comments",
         label: "General Comments",
         type: "long_text",
       }
     ]
  }
];

export function getScorecardConfig(team: Team, system?: string): ScorecardConfig | undefined {
  // In the future, can filter by system as well
  return SCORECARD_CONFIGS.find((c) => c.team === team);
}
