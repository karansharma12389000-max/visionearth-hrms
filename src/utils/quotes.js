// src/utils/quotes.js
//
// Daily rotating motivational quotes for the Vision Earth HRMS app.
// Based on the day of the month so the same quote appears all day.

const TOP_QUOTES = [
  'Small steps create a greener tomorrow.',
  'Every check-in is a step toward a better future.',
  'Together for a greener tomorrow.',
  'Consistency today, growth tomorrow.',
  'One earth, one team, one vision.',
  'Discipline is the bridge to success.',
  'Great teams build great tomorrows.',
];

const BOTTOM_QUOTES = [
  'Discipline today builds a better tomorrow.',
  'Every action counts. Every day matters.',
  'Small habits, big impact.',
  'Stay focused. Stay green. Stay growing.',
  'Your effort today shapes tomorrow.',
  'Show up. Grow. Repeat.',
  'The best project is the one you finish.',
];

const getDailyIndex = (array, seed = 0) => {
  // ✅ Read the current date AS INDIA SEES IT (IST)
  const istDateStr = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  }); // "YYYY-MM-DD"
  const [istYear, istMonth, istDay] = istDateStr.split('-').map(Number);

  // ✅ Day-of-year computed from the IST calendar date
  const startOfISTYear = Date.UTC(istYear, 0, 0); // Jan 0 = Dec 31 prev year
  const currentISTDay = Date.UTC(istYear, istMonth - 1, istDay);
  const dayOfYear =
    Math.floor((currentISTDay - startOfISTYear) / (1000 * 60 * 60 * 24)) +
    seed;

  return dayOfYear % array.length;
};

export const getTopQuote = () => TOP_QUOTES[getDailyIndex(TOP_QUOTES, 0)];
export const getBottomQuote = () => BOTTOM_QUOTES[getDailyIndex(BOTTOM_QUOTES, 3)];

export default {
  getTopQuote,
  getBottomQuote,
};