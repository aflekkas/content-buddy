import type { AudienceStage, PrimaryGoal } from "@/lib/db/types";

export const AUDIENCE_LABEL: Record<AudienceStage, string> = {
  starting: "just starting (0-1k followers)",
  growing: "growing (1k-10k followers)",
  established: "established (10k-100k followers)",
  large: "large (100k+ followers)",
};

export const GOAL_LABEL: Record<PrimaryGoal, string> = {
  grow: "grow followers",
  monetize: "monetize",
  brand: "build personal brand",
  traffic: "drive traffic to something off-platform",
  experiment: "experiment without a fixed goal",
};
