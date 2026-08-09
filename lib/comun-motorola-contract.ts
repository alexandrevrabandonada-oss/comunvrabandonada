export const COMUN_MOTOROLA_PRIMARY_ACTION = {
  href: "/comun/relatar",
  label: "Vi um problema",
  mobileLabel: "Relatar",
  accessibleLabel: "Vi um problema",
} as const;

export const COMUN_MOTOROLA_SIDEWALK_CONTRIBUTION_HREF =
  "/comun/calcadas/contribuir" as const;

export const COMUN_MOTOROLA_RULES = {
  access: "one_intentional_gesture",
  bureaucracyBeforeCapture: "none",
  optionalDetails: "after_primary_action",
  primaryLanguage: [
    "Vi um problema",
    "Guardar",
    "Meus registros",
    "Ver andamento",
  ],
} as const;
