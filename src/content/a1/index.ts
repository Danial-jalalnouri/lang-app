import type { LevelContent } from "../types";
import { unit1 } from "./unit-1-greetings";
import { unit2 } from "./unit-2-numbers";
import { unit3 } from "./unit-3-family";
import { unit4 } from "./unit-4-food";
import { unit5 } from "./unit-5-city";
import { unit6 } from "./unit-6-travel";

export const levelA1: LevelContent = {
  id: "a1",
  code: "A1",
  name: "A1 — Beginner",
  units: [unit1, unit2, unit3, unit4, unit5, unit6],
};
