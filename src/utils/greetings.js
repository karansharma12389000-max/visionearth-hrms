// src/utils/greetings.js
//
// Returns a greeting based on the current IST hour.

import { getCurrentISTHour } from './timeUtils';

export const getGreeting = () => {
  const hour = getCurrentISTHour();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const getGreetingEmoji = () => {
  const hour = getCurrentISTHour();
  if (hour < 12) return '🌅';
  if (hour < 17) return '☀️';
  return '🌙';
};

export default { getGreeting, getGreetingEmoji };