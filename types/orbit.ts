/**
 * SATAT Orbit Types & Primitives
 * Architecture ready for AI Agent capabilities, structured responses,
 * recommendations, and contextual insights.
 */

export type OrbitMessageType =
  | "text"
  | "markdown"
  | "action"
  | "insight"
  | "recommendation"
  | "error"
  | "loading";

export type OrbitDomain = "workout" | "nutrition" | "tasks" | "momentum";

export interface OrbitAction {
  id: string;
  label: string;
  type: "workout" | "meal" | "task" | "link";
  href?: string;
  primary?: boolean;
  payload?: Record<string, any>;
}

export interface OrbitInsight {
  id: string;
  title: string;
  category: OrbitDomain;
  content: string;
  action?: OrbitAction;
}

export interface OrbitRecommendation {
  id: string;
  category: OrbitDomain;
  title: string;
  subtitle?: string;
  details?: string[];
  actions: OrbitAction[];
}

export interface OrbitMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  type?: OrbitMessageType;
  insight?: OrbitInsight;
  recommendation?: OrbitRecommendation;
}

export type OrbitFocusMode = "all" | "workout" | "diet" | "tasks";

