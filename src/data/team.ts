import type { TeamMember, TeamRole } from "../types";

export function rolEtiket(rol: TeamRole): string {
  switch (rol) {
    case "mudur":
      return "Müdür";
    case "yardimci":
      return "Müdür yrd.";
    case "personel":
      return "Personel";
  }
}

export function uyeBul(ekip: TeamMember[], id: string): TeamMember | undefined {
  return ekip.find((u) => u.id === id);
}
