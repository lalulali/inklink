/**
 * Feature: Branding Constants
 * Purpose: Creative and casual fallbacks for UI elements
 */

export const FUN_WORDS = [
  'Brain Dump', 'Thought Bubble', 'Idea Nest', 'My Mind', 'The Big Picture',
  'Sparkle', 'Head Space', 'Idea Patch', 'Brain Wave', 'The Lab',
  'Creative Corner', 'Mind Field', 'Idea Hub', 'Workspace', 'The Nest'
];

export function getRandomFunWord(): string {
  const randomIndex = Math.floor(Math.random() * FUN_WORDS.length);
  return FUN_WORDS[randomIndex];
}
