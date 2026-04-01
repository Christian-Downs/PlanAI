import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getComplexityColor(score: number): string {
  if (score < 0.3) return "text-green-500";
  if (score < 0.6) return "text-yellow-500";
  if (score < 0.8) return "text-orange-500";
  return "text-red-500";
}

export function getComplexityLabel(score: number): string {
  if (score < 0.3) return "Easy";
  if (score < 0.6) return "Medium";
  if (score < 0.8) return "Hard";
  return "Very Hard";
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "URGENT": return "bg-red-500";
    case "HIGH": return "bg-orange-500";
    case "MEDIUM": return "bg-yellow-500";
    case "LOW": return "bg-green-500";
    default: return "bg-gray-500";
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
