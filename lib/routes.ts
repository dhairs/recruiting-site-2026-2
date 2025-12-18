export const routes = {
  login: "/auth/login",
  apply: "/apply",
  applyTeam: (team: string) => `/apply/${team.toLowerCase()}`,
  dashboard: "/dashboard",
};
