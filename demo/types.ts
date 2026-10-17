import type { Board } from "@/lib/board";

export interface DemoBoard extends Board {
  isDemo: true;
  name: string;
  description: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
}

export type DemoMapMeta = {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  width: number;
  height: number;
  checkpointCount: number;
  features: string[];
};

export type DemoPreset = {
  id: string;
  name: string;
  cardNames: string[];
  description?: string;
  isCustom?: boolean;
  createdAt?: string;
};
