// Utility functions for the application

// Simple className combination utility for MUI
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
