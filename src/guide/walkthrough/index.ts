// The walkthrough in play order. Each part file is written separately.
import type { Section } from "../types";
import { PART_1 } from "./part1";
import { PART_2 } from "./part2";
import { PART_3 } from "./part3";

export const WALKTHROUGH: Section[] = [...PART_1, ...PART_2, ...PART_3];
