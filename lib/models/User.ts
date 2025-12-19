export enum UserRole {
  ADMIN = "admin",
  TEAM_CAPTAIN_OB = "team_captain_ob",
  SYSTEM_LEAD = "system_lead",
  APPLICANT = "applicant",
  REVIEWER = "reviewer",
}

export enum Team {
  ELECTRIC = "Electric",
  SOLAR = "Solar",
  COMBUSTION = "Combustion",
}

export enum ElectricSystem {
  ELECTRONICS = "Electronics",
  VEHICLE_MODELING = "Vehicle Modeling",
  POWERTRAIN = "Powertrain",
  DYNAMICS = "Dynamics",

  // TRACKSIDE_ENGINEERING = "Trackside Engineering",
}

export enum SolarSystem {
  // Placeholder - to be defined
  AERODYNAMICS = "Aerodynamics",
  SOLAR_ARRAY = "Solar Array",
  STRATEGY = "Strategy",
  ELECTRICAL = "Electrical",
}

export enum CombustionSystem {
  // Placeholder - to be defined
  ENGINE = "Engine",
  CHASSIS = "Chassis",
  SUSPENSION = "Suspension",
  DRIVETRAIN = "Drivetrain",
}

export interface Member {
  team: Team;
  system: ElectricSystem | SolarSystem | CombustionSystem;
}

export interface User {
  name: string;
  role: UserRole;
  blacklisted: boolean;
  applications: string[];
  uid: string;
  email: string;
  phoneNumber: string | null;
  isMember: boolean;
  memberProfile?: Member;
}
