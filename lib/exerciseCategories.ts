export interface Subcategory {
  value: string;
  label: string;
}

export interface Category {
  value: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  subcategories: Subcategory[];
}

export const CATEGORIES: Category[] = [
  {
    value: "inf", label: "Tren inferior", emoji: "🦵", color: "#854F0B", bg: "#FAEEDA",
    subcategories: [
      { value: "rodilla",    label: "Rodilla dominante" },
      { value: "cadera",     label: "Cadera dominante" },
      { value: "unilateral", label: "Unilateral" },
    ],
  },
  {
    value: "sup", label: "Tren superior", emoji: "💪", color: "#185FA5", bg: "#E6F1FB",
    subcategories: [
      { value: "empuje-h", label: "Empuje horizontal" },
      { value: "empuje-v", label: "Empuje vertical" },
      { value: "tiron-h",  label: "Tirón horizontal" },
      { value: "tiron-v",  label: "Tirón vertical" },
    ],
  },
  {
    value: "core", label: "Core", emoji: "🎯", color: "#993C1D", bg: "#FAECE7",
    subcategories: [
      { value: "antiextension",  label: "Antiextensión 🛡️" },
      { value: "antirotacion",   label: "Antirrotación 🔄" },
      { value: "flexion-lumbar", label: "Flexión lumbar ↩️" },
      { value: "rotacion",       label: "Rotación 🌀" },
    ],
  },
  {
    value: "pot", label: "Potencia / Pliométricos", emoji: "⚡", color: "#E24B4A", bg: "#FCEBEB",
    subcategories: [
      { value: "saltos",       label: "Saltos 🦘" },
      { value: "lanzamientos", label: "Lanzamientos 🏀" },
      { value: "balisticos",   label: "Balísticos 💥" },
      { value: "sprint",       label: "Sprint / Aceleración 🏃" },
    ],
  },
  {
    value: "mov", label: "Movilidad / Elongación", emoji: "🧘", color: "#0F6E56", bg: "#E1F5EE",
    subcategories: [
      { value: "movilidad-cadera",          label: "Movilidad de cadera" },
      { value: "movilidad-toracica",        label: "Movilidad torácica" },
      { value: "elongacion-isquiotibiales", label: "Elongación isquiotibiales" },
      { value: "movilidad-hombros",         label: "Movilidad de hombros" },
    ],
  },
  {
    value: "calent", label: "Calentamiento / Activación", emoji: "🔆", color: "#639922", bg: "#EAF3DE",
    subcategories: [
      { value: "activacion-gluteos",   label: "Activación de glúteos" },
      { value: "activacion-core",      label: "Activación de core" },
      { value: "activacion-escapular", label: "Activación escapular" },
    ],
  },
  {
    value: "func", label: "Funcional / Cardio", emoji: "🔥", color: "#854F0B", bg: "#FAEEDA",
    subcategories: [
      { value: "funcional", label: "Funcional" },
      { value: "cardio",    label: "Cardio" },
    ],
  },
];

export function getCategoryInfo(value: string): Category | undefined {
  return CATEGORIES.find(c => c.value === value);
}

export function getSubcategoryLabel(catValue: string, subValue: string): string {
  const cat = getCategoryInfo(catValue);
  return cat?.subcategories.find(s => s.value === subValue)?.label ?? subValue;
}
