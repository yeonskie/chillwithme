// ---------- The rat race (the arcade, page 2) ----------
// Three screens, then the race:
//   1. the title screen (single player / multi-player / how it works)
//   2. pick your rat (diego, charlotte or stitch, each with speed / jump / hunger)
//   3. place your bet (a pop-up over the track), then the race
// The race never shows an end: the track just keeps scrolling past you until the flag shows up.
// First rat over the flag wins: 2x your bet in rounds 1-2, 3x in rounds 3-4, 5x from round 5 on. A tie gives your bet back. Anything else is 0x.
// Jump the traps (tap the track or press space), jump up to grab cheese (0.5s boost each).
// Every trip costs a gerber puff and a second. Out of puffs = out of the race.
//
// All the numbers to play with are in TUNING below. Distances are in "units": the stage is 1920 units
// wide on a big screen (the same size as the drawings), and everything scales down from there.

(function () {
  const page = document.querySelector('.page[data-page="ratrace"]');
  if (!page) return;

  const TUNING = {
    trackLen: 13000,       // how far the flag is
    baseSpeed: 540,        // units per second at speed 5 (about 24 seconds for a clean run)
    lives: 4,              // 3 gerber puffs and 1 more life after
    tripTime: 1.0,         // seconds lost when you trip
    cheeseBoost: 0.5,      // seconds of boost per piece of cheese (at full hunger)
    boostMul: 1.7,         // how much faster a boost is
    payTie: 1, gameRounds: 3,
    puffPrice: 450, puffMax: 1,
    cheesePrice: 200, cheeseMax: 8,
    opponents: 4,          // computer rats in the race
    // the hit boxes match the drawings: you trip when the rat is over the trap and not high enough
    trapHalf: 86,          // how close (left and right) counts as "over the trap"
    clearAt: 52,           // how high the rat's feet need to be to clear a trap
    ratH: 75,              // how tall the rat counts as when grabbing cheese
    cheeseHalf: 98,        // how close counts as reaching a piece of cheese
    highCheese: [150, 208],// the height of floating cheese
    groundCheese: [0, 58], // the height of cheese on the ground
  };
  // what the stats do (1 to 10)
  const speedOf = (s) => 0.88 + 0.024 * s;             // speed 5 = normal, 10 = 12% faster
  const airOf = (j) => 0.62 + 0.022 * j;               // jump: seconds in the air (0.8s at 8)
  const peakOf = (j) => 120 + 7 * j;                   // jump: how high (176 units at 8)
  const boostOf = (h) => TUNING.cheeseBoost * (0.5 + 0.05 * h);   // hunger: how long a cheese boost lasts (0.5s at 10)

  // how hard the rats are in a given round (1 = easy, goes up each win, stops at round 8)
  const level = (r) => Math.min(r, 8);
  const ratSpeed = (r) => 0.99 + 0.03 * (Math.min(level(r), 7) - 1);          // 99% of normal speed up to 117%
  const ratTrip = (r) => Math.max(0.025, 0.2 - 0.025 * (level(r) - 1));         // chance a rat trips on a trap
  const ratCheese = (r) => Math.min(0.5, 0.08 + 0.05 * (level(r) - 1));        // chance a rat grabs a piece of cheese

  const ART = {"rat": ["M431.85,574.47c-1.43.08-2.88.07-4.28.28,0,0,0,.01.09-.05.33-.17-.04-.87-.03-.67-.05-.03-.01,0,.01,0,0,0,.09.02.09.02,1.62.2,3.57.25,5.2.46,0,0,.26.04.26.04.08.01.17.03.25.06.04.02.09.03.18.08.19-.28.49,1.1.02,1.13-.15.09-.19.09-.24.11-.09.03-.14.03-.19.04-1.54.2-3.08.2-4.61.27-5.05.08-10.09.38-15.16.67-12.72.72-25.78,1.4-38.25-2-5.23-1.38-10.13-4.52-13.21-9.07-4.11-5.83-4.14-13.37-1.64-19.86,1.38-3.75,3.47-7.22,5.77-10.43,3.9-5.43,8.92-10.61,15.46-12.81,4.16-1.35,8.63-1.48,12.84.14,8.88,3.4,11.3,13.95,9.37,22.37-1.73,8.24-7.74,16.39-16.47,17.88-5.84.9-12-1.26-15.61-6.03-3.65-4.75-3.03-12.37,1.86-16.04,6.62-4.89,16.55.72,12.72,8.99-.63,1.21-1.65,2.23-2.9,2.74,0,0-.22-.46-.22-.46,3.05-1.79,3.48-6.61,1.02-9-2.3-2.27-6.57-2.14-8.82-.04-1.56,1.39-2.43,3.52-2.53,5.64-.33,6.91,7.57,10.93,13.65,9.61,2.02-.39,3.99-1.45,5.66-2.85,6.36-5.4,9.25-16.87,4.87-24.28-2.22-3.68-6.58-5.17-10.79-4.82-9.18.71-16.46,9.91-20.75,17.53-3.32,6.07-4.69,13.75-.6,19.8,2.58,3.94,6.66,6.7,11.18,8.02,17.04,5.02,35.03,2.4,52.55,2.71,1.48.04,2.95.12,4.41.04.02,0,.05,0,.04,0,0,0-.02,0-.13.07-.41,0-.14,1.34.01,1.04.06.04.07.03.07.04,0,0,0,0-.01,0,0,0-.08-.02-.08-.02-1.74-.37-3.77-.51-5.52-.92-.05-.02-.09-.02-.21-.09-.03.19-.43-.56-.06-.76.12-.08.16-.08.2-.09.07-.02.12-.02.17-.03,1.46-.09,2.9.02,4.34.06,0,0,0,.51,0,.51h0Z", "M676.58,576.67h-249.5s21.27-80.77,124.75-80.77c71.43,0,103.69,38.49,116.82,62.33,2.19,3.98,3.86,7.55,5.07,10.47,2.06,4.92,2.86,7.97,2.86,7.97Z", "M585.43,576.67h-117.04c15.74-6.45,35.01-10.62,58.53-10.62s42.77,4.17,58.51,10.62Z", "M564.89,562.08c23.6,0,34.78,6.11,41.09,14.59", "M605.66,522.39c5.15-20.53,20.12-34.84,33.44-31.97,13.32,2.87,19.94,26.2,14.79,46.73", "M616.89,523.76c3.22-12.85,12.6-21.82,20.94-20.02s12.48,13.68,9.26,26.53", "M589.34,538.72c-4.32-20.69,3.06-39.42,16.48-41.83s27.81,12.41,32.13,33.1", "M600.2,535.73c-2.71-12.96,1.91-24.68,10.32-26.19s17.41,7.77,20.12,20.73", "M676.57,576.67h-7.97c.58-3.3,2.47-6.14,5.12-7.97,2.06,4.92,2.86,7.97,2.86,7.97Z"], "trap": ["M944.72,691.8c4.8.03,9.59.05,14.39.06,1.07,0,1.95.13,2.67.61.75.5,1.24,1.32,1.47,2.64h0c1.19,5.85,2.36,11.27,3.59,16.99,1.26,5.86,2.58,12.04,4.19,19.83.04.18.07.49.1.83.02.32.04.72.04,1.1,0,.79-.43,3.06-.93,4.99-.45,1.74-1.03,3.28-1.54,3.54l-.17.08-135.48-.02c-.94,0-1.89.14-2.64-.56-.48-.45-.92-1.9-1.23-3.46-.38-1.88-.61-4.06-.52-4.75h0s4.3-23.35,4.3-23.35h0c0,.05.02.1.04.13.01.05.03.09.05.14.01.14.05.27.12.39.03.12.09.23.16.33,0,.03.02.06.03.09.03.1.07.19.12.27.05.12.11.22.2.32.05.13.13.26.24.36.06.09.13.18.21.25.03.04.07.07.1.1l-3.96,21.43c-.08.2.19,2.15.56,3.96.25,1.26.54,2.37.73,2.56.16.15.63.13,1.12.12.11,0,.22,0,.36,0l134.95.03c.09-.28.34-1.24.63-2.36.47-1.81.88-3.9.88-4.56,0-.31-.01-.67-.04-.99-.02-.28-.04-.49-.06-.57v-.03c-1.55-7.49-2.9-13.83-4.19-19.83-1.2-5.59-2.34-10.89-3.59-17.03v-.03c-.15-.81-.4-1.28-.76-1.53-.39-.26-.98-.34-1.72-.33h0c-4.8,0-9.6-.03-14.4-.05v-1.68ZM836.23,696.34c-.07,0-.13.02-.19.04-.13,0-.25.04-.36.08-.07,0-.13.02-.2.04v-.03h0c.06-.34.04-.27.15-.86.4-2.25.59-3.34,1.48-4.01.81-.6,1.88-.59,3.96-.56.46,0,.98.01,1.55.01h.95c-.05.05-.09.11-.13.17-.02.01-.04.03-.06.05-.12.07-.23.17-.32.29-.07.07-.13.13-.18.22h0c-.04.05-.08.1-.12.16-.08.08-.15.18-.19.28-.09.16-.12.33-.12.51-.52,0-.99,0-1.4-.01-1.7-.02-2.58-.04-2.93.23-.36.27-.51,1.14-.83,2.95v.08c-.05,0-.1,0-.14,0-.23,0-.45.07-.64.22-.03.02-.07.04-.1.06-.07.02-.13.04-.19.08ZM855.66,691.11c3.55.02,7.13.04,10.73.06,8.06.05,16.91.12,25,.19l-1.06,1.68c-11.07-.1-22.15-.19-33.22-.24-.01-.02-.03-.04-.04-.06-.04-.07-.09-.12-.14-.18-.03-.04-.06-.08-.1-.12-.03-.04-.05-.08-.08-.11-.03-.04-.06-.08-.09-.12-.03-.04-.07-.08-.1-.12-.04-.07-.09-.13-.14-.18-.05-.09-.12-.17-.2-.24-.02-.02-.04-.04-.06-.07l-.49-.49ZM904.05,691.44l1.92.05c12.89.12,25.32.23,36.43.3v1.68c-11.14-.07-23.57-.18-36.45-.3l-7.59-.05,5.68-1.68Z", "M829.46,732.99l140.86.04v1.68l-140.86-.04v-1.68ZM955.55,704.6c.17-.32.35-.59.53-.81.2-.24.41-.44.63-.58.39-.25.78-.36,1.17-.35.4.01.78.16,1.14.42.23.17.45.41.64.69.18.27.34.58.47.93.38.99.62,2.49.63,4.34,0,1.59-.16,3.45-.56,5.49-.07.37-.29.68-.58.87-.29.19-.65.28-1.02.21-.37-.07-.67-.29-.87-.58-.19-.29-.28-.65-.21-1.02.39-1.97.61-3.64.66-5,.05-1.3-.05-2.31-.3-3.01l-.03.04-.91-.52c.13-.22.27-.41.44-.55.16-.13.33-.21.53-.22.22,0,.43.07.61.26.12.12.23.3.32.55.31.83.45,2,.39,3.48-.05,1.43-.27,3.16-.67,5.16-.01.09,0,.17.05.24s.12.12.2.13c.09.02.17,0,.24-.05.07-.04.11-.11.13-.2.39-1.98.55-3.77.55-5.28,0-1.72-.23-3.09-.57-3.98-.11-.28-.23-.52-.36-.72-.12-.18-.25-.33-.39-.43-.19-.14-.37-.21-.56-.22-.18,0-.37.05-.57.18-.13.08-.26.2-.39.36-.14.17-.27.38-.41.63l-.93-.48ZM958.3,708.05c-.62.09-1.25.06-1.84-.1-.55-.16-1.07-.44-1.51-.87-.48-.47-.81-1.01-1.01-1.59-.2-.6-.26-1.25-.19-1.92.03-.38.21-.7.47-.93.27-.23.62-.36.99-.33s.7.21.93.47c.23.27.36.62.33.99-.02.21-.01.4.01.58.04.31.15.56.32.74.15.16.38.26.67.29.13,0,.28,0,.44-.02l.14,1.04c-.24.03-.46.04-.66.02-.57-.04-1.02-.26-1.36-.61-.33-.34-.52-.79-.6-1.32-.03-.25-.04-.52-.02-.8,0-.09-.02-.17-.07-.23-.05-.06-.13-.1-.21-.11-.09,0-.17.02-.23.07-.06.05-.1.13-.11.22v.02c-.06.53-.02,1.04.13,1.49.15.43.39.83.75,1.18.31.3.67.5,1.06.61.44.13.93.14,1.41.08l.14,1.04ZM959.54,704.76c.13-.09.21-.19.28-.3.1-.19.13-.41.1-.63-.03-.24-.12-.49-.26-.7-.12-.17-.26-.31-.43-.41-.37-.2-.89-.35-1.61-.45-.76-.11-1.72-.15-2.92-.14l-80.82.76c-.38,0-.72-.15-.97-.39s-.4-.58-.41-.96c0-.38.15-.72.39-.97s.59-.4.96-.41l80.82-.76c1.41-.01,2.56.05,3.51.2.98.15,1.75.39,2.35.73.79.43,1.37,1.11,1.72,1.87.26.58.39,1.22.39,1.85,0,.64-.16,1.27-.47,1.82-.35.64-.9,1.18-1.65,1.52l-.43-.96c.53-.24.92-.62,1.16-1.07.22-.4.33-.86.34-1.33,0-.47-.09-.96-.3-1.4-.26-.57-.68-1.07-1.26-1.38-.5-.28-1.16-.48-2.01-.61-.89-.14-1.99-.2-3.34-.19l-80.82.76c-.08,0-.16.04-.22.1-.06.06-.09.13-.09.22h0c0,.09.04.16.1.22.06.06.14.09.22.09l80.82-.76c1.25-.01,2.26.04,3.07.15.85.12,1.49.31,1.97.57.31.17.59.43.79.74.23.34.39.75.43,1.16.05.43-.01.87-.23,1.26-.14.25-.34.48-.61.67l-.59-.87ZM889.65,720.85c1.43,0,2.74.27,3.7.72,1.16.53,1.88,1.35,1.88,2.31s-.72,1.78-1.88,2.31c-.96.44-2.27.72-3.7.72s-2.74-.27-3.7-.72c-1.16-.53-1.88-1.35-1.88-2.31s.72-1.77,1.88-2.31c.96-.44,2.27-.72,3.7-.72ZM892.65,723.09c-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.25-.9.53-.9.78s.34.53.9.78c.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.25.9-.53.9-.78s-.34-.53-.9-.78ZM889.65,717.25c1.43,0,2.74.27,3.7.72,1.16.53,1.88,1.35,1.88,2.31s-.72,1.77-1.88,2.31c-.96.44-2.27.72-3.7.72s-2.74-.27-3.7-.72c-1.16-.53-1.88-1.35-1.88-2.31s.72-1.77,1.88-2.31c.96-.44,2.27-.72,3.7-.72ZM892.65,719.49c-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.26-.9.54-.9.78s.34.53.9.78c.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.26.9-.54.9-.78s-.34-.53-.9-.78ZM889.65,713.64c1.43,0,2.74.27,3.7.72,1.16.53,1.88,1.35,1.88,2.31s-.72,1.77-1.88,2.31c-.96.44-2.27.72-3.7.72s-2.74-.27-3.7-.72c-1.16-.53-1.88-1.35-1.88-2.31s.72-1.78,1.88-2.31c.96-.44,2.27-.72,3.7-.72ZM892.65,715.89c-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.25-.9.53-.9.78s.34.53.9.78c.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.26.9-.54.9-.78s-.34-.53-.9-.78ZM889.65,710.04c1.43,0,2.74.27,3.7.72,1.16.53,1.88,1.35,1.88,2.31s-.72,1.77-1.88,2.31c-.96.44-2.27.72-3.7.72s-2.74-.28-3.7-.72c-1.16-.54-1.88-1.35-1.88-2.31s.72-1.77,1.88-2.31c.96-.44,2.27-.72,3.7-.72ZM892.65,712.29c-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.26-.9.54-.9.78s.34.53.9.78c.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.26.9-.54.9-.78s-.34-.53-.9-.78ZM889.65,706.44c1.43,0,2.74.28,3.7.72,1.16.54,1.88,1.35,1.88,2.31s-.72,1.77-1.88,2.31c-.96.44-2.27.72-3.7.72s-2.74-.27-3.7-.72c-1.16-.53-1.88-1.35-1.88-2.31s.72-1.77,1.88-2.31c.96-.44,2.27-.72,3.7-.72ZM892.65,708.69c-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.26-.9.54-.9.78s.34.53.9.78c.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.26.9-.54.9-.78s-.34-.53-.9-.78ZM889.65,702.84c1.43,0,2.74.27,3.7.72,1.16.53,1.88,1.35,1.88,2.31s-.72,1.78-1.88,2.31c-.96.44-2.27.72-3.7.72s-2.74-.27-3.7-.72c-1.16-.53-1.88-1.35-1.88-2.31s.72-1.77,1.88-2.31c.96-.44,2.27-.72,3.7-.72ZM892.65,705.09c-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.25-.9.53-.9.78s.34.53.9.78c.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.25.9-.53.9-.78s-.34-.53-.9-.78ZM894.61,706.54c-.44.13-.91-.13-1.04-.58-.13-.45.13-.91.58-1.04l10.39-2.96c.45-.13.91.13,1.04.58.13.45-.13.91-.58,1.04l-10.39,2.96ZM936.09,724.21c.25-.39.77-.5,1.16-.25s.5.77.25,1.16c-1.01,1.56-2.67,2.78-4.47,3.49-1.83.72-3.84.92-5.46.39l-2.99-.85c-.45-.12,1.06-.04,1.17-.49.12-.45.83-.65,1.28-.53l1.01.26h.05c1.24.42,2.84.25,4.34-.34,1.5-.59,2.86-1.58,3.67-2.83ZM921.79,725.68c.45.13-.24.35-.36.8-.57.24-2.32.23-2.77.1l-25.61-7.14c-.45-.13-.71-.59-.59-1.03.13-.45.59-.71,1.04-.59l28.3,7.87ZM863.65,705.85c-.39-.26-.49-.78-.24-1.16s.78-.49,1.16-.24c1.75,1.16,3.17,1.76,4.45,1.53,1.3-.24,2.58-1.37,4.1-3.69.25-.39.77-.5,1.16-.25.39.25.5.77.25,1.16-1.79,2.74-3.43,4.1-5.2,4.43-1.79.34-3.57-.39-5.68-1.78ZM875.99,700.79c-.26.39-.78.49-1.17.23-.39-.26-.49-.78-.23-1.16.62-.93,1.52-1.52,2.32-1.6.52-.05,1.01.09,1.4.45.35.32.59.8.67,1.45.17,1.47-.53,4.18-3.11,8.53-1.78,3-3.95,4.35-6.23,4.65-2.24.3-4.54-.44-6.68-1.58-.41-.22-.56-.73-.34-1.14.22-.41.73-.56,1.14-.34,1.86,1,3.83,1.64,5.67,1.4,1.79-.24,3.52-1.35,5-3.84,2.36-3.98,3.03-6.31,2.89-7.48-.03-.23-.07-.36-.13-.41-.01-.01-.05-.02-.1-.01-.33.03-.75.35-1.09.86ZM869.57,716.66l-2.35-1.58,1.02-11.87,2.64,2.35-1.12,1.26-.13-.11-.64,7.54,1.53,1.03c.83.69-.1,1.74-.94,1.39ZM861.32,715.13c-3.58,3.91-6.55,2.85-9.25,1.89-1.21-.43-2.35-.84-3.34-.6h0c-.73.19-.98.25-1.22.31-4.93,1.27-6.23,1.61-11.49-1.51-3.88-2.31-4.53-5.76-5.25-9.63-.03-.17-.06-.34-.16-.87-.33-1.71-.54-2.97-.3-4.19.24-1.26.94-2.36,2.41-3.66.4-.35.77-.63,1.17-.88.4-.24.82-.45,1.33-.64h.04c.99-.33,1.74-.46,2.39-.56,1.16-.19,1.95-.32,3.47-1.88,1.16-1.24,2.34-2.47,3.74-3.36,1.47-.93,3.12-1.47,5.13-1.24.92.1,2.11.27,3.27.57,1.22.31,2.39.78,3.2,1.5.43.39.77.81,1.12,1.25.31.4.64.81,1.03,1.18,1.44,1.38,2.18,1.78,3.33,2.41.41.22.87.47,1.42.8,2.27,1.34,2.2,1.79,1.87,3.82-.03.2-.07.41-.11.71h0c-.35,2.45-.32,3.44-.27,5.63v.65c.05,1.43-.1,2.51-.47,3.55-.36,1.02-.91,1.95-1.68,3.1l-.03.04c-.22.29-.44.56-.67.83-.2.23-.44.5-.69.78h0ZM852.63,715.43c2.2.79,4.62,1.64,7.45-1.44h0c.2-.22.41-.46.65-.74.21-.24.41-.49.61-.75.68-1.02,1.17-1.84,1.46-2.69.3-.84.42-1.74.39-2.96v-.64c-.07-2.3-.1-3.33.27-5.9h0c.03-.24.08-.5.12-.74.18-1.1.22-1.35-1.06-2.1-.53-.31-.98-.56-1.38-.78-1.27-.7-2.09-1.15-3.69-2.67-.47-.45-.84-.91-1.19-1.35-.32-.4-.61-.77-.93-1.05-.57-.51-1.5-.87-2.49-1.13-1.04-.27-2.17-.42-3.05-.52-1.58-.18-2.88.25-4.04.99-1.22.78-2.33,1.92-3.42,3.09h-.01c-1.91,1.99-2.92,2.15-4.42,2.4-.59.1-1.26.21-2.13.49-.39.15-.72.3-1.02.49-.31.19-.6.41-.93.7-1.17,1.02-1.7,1.84-1.87,2.71-.18.93.01,2.04.3,3.56l.16.88c.65,3.47,1.22,6.56,4.45,8.48,4.66,2.77,5.83,2.47,10.22,1.33.53-.13,1.1-.28,1.24-.32h0c1.48-.36,2.85.13,4.3.64Z", "M893.67,690.6l44.51-5.96c1.46-.19,2.94-.08,4.19.79,1.43.99,2.06,2.62,2.33,4.28l1.64,9.95h-1.06l-1.61-9.78c-.22-1.36-.72-2.77-1.89-3.58-1.02-.7-2.26-.77-3.45-.61l-44.51,5.96c-2.4.32-4.39,2.38-4.78,4.74h-.39c-.08,0-.18,0-.26.03h-.16c-.09,0-.18.01-.27.03h0s0,0,0,0c.37-2.92,2.77-5.45,5.71-5.84ZM889.14,723.29c0,.09-.06,3.73-.05,3.84.08,1.18.57,2.27,1.46,3.06.97.85,2.24,1.18,3.51,1.02l49.74-6.39c1.94-.32,3.84-1.81,4.49-3.68.21-.59.29-1.22.21-1.85l-2.88-17.55h1.06l2.84,17.24c.01.06.02.12.02.17.21,1.65-.44,3.24-1.54,4.46-1.04,1.14-2.5,1.99-4.02,2.24-.03,0-.06.01-.09.01l-49.68,6.38c-.25.03-.49.05-.73.05-2.94.01-5.23-2.17-5.42-5.1-.01-.22.05-3.97.05-4.19l1.05.28ZM938.6,687.76l-44.51,5.96c-1.34.18-2.5,1.3-2.89,2.59h-1.09c.41-1.81,1.98-3.39,3.84-3.63l44.51-5.97c.91-.12,1.93-.11,2.71.43.92.64,1.28,1.84,1.45,2.88l1.58,9.61h-.73c-.11,0-.23.02-.33.05l-1.56-9.49c-.12-.72-.38-1.75-1.01-2.19-.54-.37-1.36-.34-1.97-.25ZM891.14,716.56v.07l-.52.09.48-.14s.03-.01.04-.01ZM891.17,722.56v.11l-.44.07.16-.07c.1-.02.2-.05.29-.1ZM891.17,722.91c0,.09.03,4.18.04,4.26.15,1.18,1.05,1.99,2.24,1.98.04,0,.1,0,.17,0,.07,0,.13-.01.18-.02l49.57-6.36s0,0,.03,0c.05,0-.02,0,.07-.01.83-.14,1.64-.62,2.2-1.24.47-.52.83-1.22.75-1.93l-2.93-17.83h1.06l2.91,17.68c.13,1.04-.33,2.03-1.01,2.79-.73.8-1.73,1.4-2.81,1.57-.03,0,0,0-.08.01-.06,0-.03,0-.06.01h0s-49.56,6.36-49.56,6.36c-.09.01-.17.02-.24.02-1.82.12-3.3-1.08-3.53-2.89-.02-.13-.05-4.27-.05-4.39h1.05Z", "M895.23,702.27c0,.96-.72,1.77-1.88,2.31-.96.44-2.27.72-3.7.72s-2.74-.27-3.7-.72c-1.16-.53-1.88-1.35-1.88-2.31h1.68c0,.24.34.53.9.78.75.35,1.81.56,3,.56s2.24-.21,3-.56c.56-.26.9-.54.9-.78h1.68ZM886.42,699.76c.46-.17.98-.3,1.53-.39.54-.09,1.11-.13,1.69-.13.53,0,1.05.04,1.54.11.51.07.99.18,1.43.33l-.51,1.15c-.34-.11-.73,0-1.15-.05-.4-.06-.84.03-1.3.03-.51,0-.99.04-1.42.11-.45.07-.87-.12-1.23.01l-.57-1.16Z", "M886.8,700.97c-.61-.25-1.38-.35-1.87-.77-.52-.44-.86-.96-.86-1.53,0-.96.72-1.78,1.88-2.31.96-.44,2.27-.72,3.7-.72s2.74.27,3.7.72c1.16.53,1.88,1.35,1.88,2.31,0,.56-.24,1.07-.67,1.5-.37.37-.99.42-1.61.67l-.69-1.27c.41-.16.9-.37,1.11-.58.12-.12.19-.23.19-.32,0-.25-.34-.53-.9-.78-.75-.35-1.81-.56-3-.56s-2.25.21-3,.56c-.56.25-.9.53-.9.78,0,.02.11.12.27.26.34.29.83.56,1.3.75l-.52,1.3Z"], "cheese": ["M1123.56,717.49c-.79-6.89-4.3-14.78-4.45-15.11-.16-.36-.51-.6-.9-.62l-24.33-1.47h0c-.34,0-.66.16-.86.44l-4.36,6.13c-.33.47-.23,1.13.24,1.46.14.1.56.49.59.87,0,.08.03.31-.31.68-1.21,1.35-3.71,1.46-3.73,1.46-.32.01-.62.17-.81.42l-5.72,7.71c-.24.32-.28.76-.09,1.12,0,.01.65,1.3-.06,2.08-.76.83-2.95,1.68-4.15,2.02-.24.07-.45.22-.58.42l-6.99,10.36c-.32.47-.39,1.06-.17,1.59.22.53.68.92,1.25,1.03l25.3,4.92c.06.01.13.02.2.02.11,0,.23-.02.34-.06l10.66-3.63c.3-.1.54-.33.65-.63.07-.19.09-.4.04-.6.27-.17,1.19-.56,3.95-.54.06,0,.18,0,.28-.04,5.92-1.52,13.6-4.08,13.68-4.1.41-.13.7-.51.72-.94.02-.33.44-8.22-.34-15.04h-.01ZM1075.54,726.62c1-.32,3.57-1.22,4.76-2.51,1.12-1.22,1.01-2.79.65-3.85l5.08-6.85c1.02-.12,3.3-.56,4.7-2.12.8-.89.9-1.76.84-2.33-.07-.66-.38-1.21-.7-1.61l3.51-4.92,22.11,1.34-5.42,8.35c-1.21.27-5.25,1.27-7.02,3.21-1.35,1.47-1.82,3.42-1.15,4.71.25.47.79,1.16,1.99,1.34l-12.31,18.15c-.24.35-.35.74-.34,1.13l-23.14-4.49,6.44-9.53h-.01ZM1106.17,719.97h-.09c-.69.09-1.58.06-1.91-.59-.39-.76,0-2.1.94-3.11,1.32-1.44,4.41-2.33,5.84-2.68.33,1.13.98,3.96-.02,6.04-.74,1.55-2.03,2.25-2.94,2.13-.75-.09-1.03-.72-1.13-1.23-.07-.33-.36-.56-.69-.56h0ZM1104.89,736.01c0-1.34.38-3.53,2.56-5.14.11-.09.2-.19.24-.32.3-.83.87-1.27,1.27-1.32.2-.03.26.05.28.07.13.17.23.75-.25,1.87-.04.1-.06.22-.06.34.16,1.86.1,3.38-.03,3.99-1.76,0-3.08.18-4.01.52h0ZM1121.83,731.69c-1.82.6-6.93,2.25-11.46,3.47.1-1,.08-2.39-.02-3.61.68-1.7.37-2.63,0-3.12-.37-.48-.96-.7-1.61-.6-.94.15-1.82.94-2.29,2.03-3.07,2.38-3.06,5.72-2.92,7.06-.06.07-.12.13-.16.21-.09.16-.15.32-.2.48l-9.48,3.22c-.05-.13-.08-.32.06-.53l12.31-18.15c.42.56,1.03.92,1.75,1.01.12.01.25.02.37.02,1.55,0,3.15-1.16,4.01-2.94,1.29-2.69.38-6.17.04-7.28,0-.01,0-.03.01-.04l5.47-8.44c1.01,2.48,3.18,8.23,3.75,13.24.63,5.47.45,11.85.37,13.96h0Z", "M1082.07,725.61c-1.18.12-2.47.63-3.64,1.45-1.17.82-2.1,1.86-2.61,2.92-.58,1.2-.58,2.31,0,3.13.5.72,1.35,1.1,2.44,1.1.16,0,.33,0,.5-.03,1.18-.12,2.47-.63,3.64-1.45,1.17-.82,2.1-1.86,2.61-2.92.58-1.2.58-2.31,0-3.13-.57-.83-1.62-1.2-2.94-1.07h0ZM1083.74,729.19c-.4.84-1.19,1.71-2.15,2.38-.97.68-2.05,1.11-2.97,1.2-.78.08-1.38-.09-1.65-.47-.27-.38-.22-1,.12-1.71.4-.84,1.19-1.71,2.15-2.38.97-.68,2.05-1.11,2.97-1.2.78-.08,1.38.1,1.65.47.27.38.22,1-.12,1.71Z", "M1094.45,732.13c1.07-.75,1.91-1.69,2.39-2.66.54-1.11.54-2.13,0-2.89-1.02-1.46-3.67-1.32-6.04.33-2.36,1.65-3.41,4.09-2.39,5.56.46.66,1.25,1.01,2.26,1.01.15,0,.3,0,.46-.02,1.07-.1,2.25-.58,3.32-1.32h0ZM1089.56,731.65c-.48-.69.29-2.37,2.04-3.6,1.75-1.22,3.6-1.37,4.08-.68.23.32.18.86-.11,1.47-.36.75-1.06,1.52-1.92,2.13-.86.6-1.83.99-2.65,1.08-.68.07-1.2-.08-1.42-.4h0Z", "M1115.65,718.96h-.08c-1.75,0-3.2,2.18-3.3,5.02-.1,2.88,1.21,5.19,2.99,5.25h.08c1.75,0,3.2-2.18,3.3-5.02.05-1.3-.2-2.55-.69-3.51-.56-1.09-1.38-1.71-2.31-1.75h0ZM1115.35,727.83h-.03c-.84-.03-1.72-1.66-1.64-3.8.08-2.11,1.06-3.66,1.9-3.66h.03c.39.01.79.37,1.11.98.38.74.57,1.77.54,2.82-.08,2.11-1.06,3.66-1.9,3.66h0Z", "M1095.97,718.95c.11,0,.23,0,.34-.01.81-.08,1.69-.43,2.49-.99,1.82-1.27,2.59-3.12,1.77-4.29-.42-.6-1.19-.89-2.14-.8-.81.08-1.69.43-2.49.99-.79.56-1.44,1.27-1.79,2-.41.85-.41,1.68.01,2.29.37.53,1.01.82,1.8.82h0ZM1095.42,716.46c.25-.51.73-1.04,1.32-1.46.6-.42,1.26-.69,1.82-.75.07,0,.14-.01.21-.01.31,0,.54.08.64.22.25.36-.19,1.46-1.42,2.32-.6.42-1.26.69-1.82.75-.42.04-.73-.04-.85-.2-.12-.17-.09-.49.1-.87h0Z", "M1095.45,709.4c.08,0,.15,0,.23-.01.55-.06,1.14-.29,1.68-.66,1.26-.88,1.76-2.19,1.17-3.04-.32-.46-.9-.68-1.58-.61-.55.06-1.14.29-1.68.66-1.26.88-1.76,2.19-1.17,3.04.28.4.76.63,1.35.63h0ZM1096.08,706.89c.49-.34.94-.43,1.16-.43.07,0,.11,0,.13.02.04.12-.16.64-.81,1.09-.65.45-1.2.46-1.29.41-.04-.12.16-.64.81-1.09h0Z"], "trapBB": [828.6405029296875, 684.5606689453125, 142.5294189453125, 57.9093017578125], "cheeseBB": [1066.7525634765625, 700.2900390625, 57.3282470703125, 42.7301025390625]};

  // the rats you can choose from (base stats; they can be upgraded later)
  const ROSTER = [
    { id: "diego", coat: "grey", stats: { speed: 5, jump: 8, hunger: 10 } },
    { id: "charlotte", coat: "white", stats: { speed: 5, jump: 8, hunger: 10 } },
    { id: "stitch", coat: "black", stats: { speed: 5, jump: 8, hunger: 10 } },
  ];
  const OTHERS = [   // the extra computer rats
    { id: "cheddar", coat: "white", pat: "rr-dots" },
    { id: "pip", coat: "grey", pat: "rr-stripes" },
    { id: "gouda", coat: "white", pat: "rr-stripes" },
    { id: "nibbles", coat: "grey", pat: "rr-dots" },
  ];
  const NAMES = ["momo","miso","bean","mochi","olive","diego","stitch","charlotte","rascal","sniffer","gouda","blue cheese","havarti","rapunzel","chez","bob","ketamine","nitrogen","goldfish","phant","penelope","sonnet","geek","piper","annabeth","percy","blue","randy","jake","jungwon","karina","kitty snatcher","nayeon","dahyun","jay","zhang hao","matthew","ted","barney","robin","lily pad","rhaenyra","the flash","batman","muenster","baby shark","lil rem","nancy","fancy rat #1","bella","celsius packet","gyub","wonhee","moka","sakura","chaewon","sprite","dr. pepper","sea monster","angel","devil","drowsy","jupiter","minerva","zeus","poseidon","demeter","hades","persephone","nugget","chicken","goat","bunny","hopper"];   // every rat gets a random name from here (rolled with the stats)
  const COAT = {
    grey: { body: "#b2b2b2", eo: "#b2b2b2", es: "var(--text)", ei: "#000", eye: "#000", belly: true },
    white: { body: "#fff", eo: "#fff", es: "var(--text)", ei: "#000", eye: "#000" },
    black: { body: "#000", eo: "#000", es: "#fff", ei: "#fff", eye: "#fff" },
  };

  const $ = (s) => page.querySelector(s);
  const $$ = (s) => Array.from(page.querySelectorAll(s));
  const screens = { menu: $('[data-screen="menu"]'), pick: $('[data-screen="pick"]'), race: $('[data-screen="race"]') };
  const track = $("#rr-track"), msg = $("#rr-msg"), menuNote = $("#rr-menu-note");
  const betModal = $("#rr-bet-modal"), betIn = $("#rr-bet"), goBtn = $("#rr-go");
  const howModal = $("#rr-how"), countEl = $("#rr-count"), pausedEl = $("#rr-paused");
  const placesEl = $("#rr-places"), resBox = $("#rr-result"), resTitle = $("#rr-result-title"), resText = $("#rr-result-text"), resBtn = $("#rr-result-btn"), resChange = $("#rr-result-change");
  const livesEl = $("#rr-lives"), placeEl = $("#rr-place"), pauseBtn = $("#rr-pause");

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  let round = 1;                                                     // a game starts at round 1 every time the page loads
  let items = Object.assign({ puff: 0, cheese: 0 }, store.get("rr-items", {}));
  let myId = null;
  let locked = false;            // rat can only be changed before the first round begins
  const setLocked = (v) => { locked = v; store.set("rr-locked", v); if (typeof changeBtns === "function") changeBtns(); };
  // ----- power ups (each is good for one race: bought in the upgrade shop or won in "test your luck") and rat levels -----
  const UPS = [
    { id: "train",  name: "training",      desc: "pick one stat to boost by +1 until your game ends", price: 1500 },
    { id: "shield", name: "trap shield",   desc: "your first trip costs nothing", price: 1000 },
    { id: "soft",   name: "soft landing",  desc: "a trip costs 0.5s instead of 1s", price: 250 },
    { id: "magnet", name: "cheese magnet", desc: "grab cheese from further away", price: 1500 },
    { id: "hang",   name: "hang time",     desc: "your jump stays in the air longer", price: 500 },
    { id: "stash",  name: "cheese stash",  desc: "start with a free cheese boost", price: 1000 },
  ];
  const STATS = ["speed", "jump", "hunger"];
  const ups = Object.assign({ shield: 0, soft: 0, magnet: 0, hang: 0, stash: 0 }, store.get("rr-ups", {}));   // held for the next race (0 or 1 each)
  let activeUp = store.get("rr-active", null);                       // the one upgrade switched on for the next race
  if (!activeUp || !ups[activeUp]) activeUp = null;
  const winMult = (r) => r >= 5 ? 5 : r >= 3 ? 3 : 2;   // what a win pays: rounds 1-2 pay 2x, rounds 3-4 pay 3x, round 5 and on pay 5x
  let boughtAt = 0;       // the round you bought a boost in: you can buy one per game, then again 5 rounds later (a new game starts fresh)
  const canBuyBoost = () => !boughtAt || round >= boughtAt + 5;
  let act = {};                                                      // what is switched on in the race that's running
  const saveUps = () => store.set("rr-ups", ups);
  const bonus = { speed: 0, jump: 0, hunger: 0 };                    // +1s from level ups and training: they last until the game ends
  let points = 0;           // stat points waiting to be spent
  let xp = 0, plevel = 1;
  const xpNeed = (l) => 60 + 30 * (l - 1);                           // xp to get from level l to the next one
  const saveProg = () => {};                                         // (level, xp and +1s are not saved: a refresh or a lost game starts fresh)
  let played = !!store.get("rr-played", false);     // after the first round the upgrade shop and "test your luck" show up
  let tries = Math.min(1, Math.max(0, store.get("rr-tries", 1) | 0));   // one try at "test your luck" per round (unused tries do not stack)
  const rnd10 = () => 1 + Math.floor(Math.random() * 8);   // starting stats roll 1-8 (still shown out of 10) so there is room to train
  function applyStats() { ROSTER.forEach((r) => { r.stats = {}; STATS.forEach((k) => { r.stats[k] = Math.min(10, r.base[k] + bonus[k]); }); }); }
  function rollNames() {   // seven different names: the three you choose from, then the computer rats
    const p = NAMES.slice();
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    ROSTER.concat(OTHERS).forEach((r, i) => { r.name = p[i]; });
  }
  function rollStats() {
    rollNames();                                             // every rat gets fresh random stats (1-8) each time; your +1s are added on top
    ROSTER.forEach((r) => { r.base = {}; STATS.forEach((k) => { r.base[k] = rnd10(); }); });
    applyStats();
  }
  rollStats();
  function newGame() {   // a lost game, a restart, leaving mid-race or a refresh: back to round 1 with new random rats and no +1s (power ups you are holding stay)
    round = 1; setLocked(false); boughtAt = 0; store.set("rr-boughtat", 0);
    STATS.forEach((k) => { bonus[k] = 0; });
    points = 0; xp = 0; plevel = 1;
    rollStats();
  }
  const myRat = () => ROSTER.find((r) => r.id === myId) || ROSTER[0];
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const have = () => (window.YB ? window.YB.have() : 0);

  // ----- the drawings -----
  function ratSVG(coatName, pat) {
    const c = COAT[coatName] || COAT.white, d = ART.rat;
    const st = (fill, stroke) => 'fill="' + fill + '" stroke="' + (stroke || "var(--text)") + '"';
    return '<svg viewBox="355 486 325 94" aria-hidden="true" focusable="false">' +
      '<g class="r-tail"><path d="' + d[0] + '" fill="var(--text)"/></g>' +
      '<path d="' + d[1] + '" ' + st(c.body) + '/>' +
      (c.belly ? '<path d="' + d[2] + '" fill="#000"/>' : "") +
      (pat ? '<path d="' + d[1] + '" fill="url(#' + pat + ')" stroke="none"/>' : "") +
      '<path d="' + d[3] + '" fill="none" stroke="' + (coatName === "black" ? "#000" : "var(--text)") + '"/>' +
      '<path d="' + d[4] + '" ' + st(c.eo, c.es) + '/><path d="' + d[5] + '" fill="' + c.ei + '"/>' +
      '<path d="' + d[6] + '" ' + st(c.eo, c.es) + '/><path d="' + d[7] + '" fill="' + c.ei + '"/>' +
      '<circle cx="640.81" cy="549.22" r="8.22" fill="' + c.eye + '"/>' +
      '<path d="' + d[8] + '" fill="' + (coatName === "black" ? "#fff" : "#000") + '"/></svg>';
  }
  const bb = (b) => b.map((v) => Math.round(v)).join(" ");
  const TRAP = '<svg viewBox="' + bb(ART.trapBB) + '" aria-hidden="true" focusable="false">' + ART.trap.map((d) => '<path d="' + d + '"/>').join("") + "</svg>";
  const CHEESE = '<svg viewBox="' + bb(ART.cheeseBB) + '" aria-hidden="true" focusable="false">' + ART.cheese.map((d) => '<path d="' + d + '"/>').join("") + "</svg>";
  const PUFF = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34C9 26 4.5 20 4.5 13.5a7.8 7.8 0 0 1 15.5-2 7.8 7.8 0 0 1 15.5 2C35.5 20 31 26 20 34Z"/></svg>';
  const FLAG = '<svg viewBox="0 0 120 200" aria-hidden="true"><path d="M14 4V196" class="fl-pole"/><path d="M14 8H112V76H14Z" class="fl-cloth"/><path d="M14 8h24v17H14zM62 8h25v17H62zM38 25h24v17H38zM87 25h25v17H87zM14 42h24v17H14zM62 42h25v17H62zM38 59h24v17H38zM87 59h25v17H87z" class="fl-sq"/></svg>';

  if (!document.getElementById("rr-defs")) {   // little patterns for the extra rats' coats
    const d = document.createElement("div");
    d.innerHTML = '<svg id="rr-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<pattern id="rr-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.7" fill="#000" opacity=".7"/><circle cx="11" cy="11" r="1.7" fill="#000" opacity=".7"/></pattern>' +
      '<pattern id="rr-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3.5" height="12" fill="#000" opacity=".65"/></pattern>' +
      '</defs></svg>';
    page.appendChild(d.firstChild);
  }

  // ----- the screens -----
  let screen = "menu";
  function show(name) {
    screen = name;
    Object.keys(screens).forEach((k) => { screens[k].hidden = k !== name; });
    page.classList.toggle("on-race", name === "race");
    if (name === "race") layout();
  }

  function buildHero() {   // the three rats on the title screen
    const hero = $("#rr-hero");
    hero.innerHTML = "";
    ROSTER.slice().reverse().forEach((r, i) => {
      const e = document.createElement("div");
      e.className = "rr-hero-rat rr-hero-" + i;
      e.innerHTML = ratSVG(r.coat);
      hero.appendChild(e);
    });
  }

  const bar = (n) => '<span class="rr-meter"><i style="width:' + Math.max(0, Math.min(10, n)) * 10 + '%"></i></span>';
  function buildCards() {
    rollStats();
    const wrap = $("#rr-cards");
    wrap.innerHTML = "";
    ROSTER.forEach((r) => {
      const c = document.createElement("div");
      c.className = "rr-card";
      c.innerHTML = '<p class="rr-card-name">' + r.name + "</p>" +
        '<div class="rr-card-rat">' + ratSVG(r.coat) + "</div>" +
        '<dl class="rr-stats">' +
        "<dt>speed:</dt><dd>" + bar(r.stats.speed) + "<b>" + r.stats.speed + "/10</b></dd>" +
        "<dt>jump:</dt><dd>" + bar(r.stats.jump) + "<b>" + r.stats.jump + "/10</b></dd>" +
        "<dt>hunger:</dt><dd>" + bar(r.stats.hunger) + "<b>" + r.stats.hunger + "/10</b></dd></dl>" +
        '<button type="button" class="rr-opt rr-pickbtn" data-id="' + r.id + '">this one!</button>';
      wrap.appendChild(c);
    });
  }

  // ----- the race -----
  let lanes = [], course = null, cam = 0, sc = 0.5, span = 1920;
  let raf = 0, last = 0, T = 0;
  let phase = "menu";      // menu | pick | bet | count | race | done
  let paused = false, countT = 0, resultTimer = 0;
  let allFin = null, bet = 0, startLives = 3, lives = 3, jumpQ = 0, firstFin = null, decided = false;
  let myStats = ROSTER[0].stats, myBoostDur = 0.5;
  const XP = 200;          // where your rat sits on the screen (in units from the left)
  const RAT_W = 325;       // how wide a rat is (units); its middle is where the rat "is"

  function layout() {
    const W = track.clientWidth || 1000;
    const laneH = (track.clientHeight || 500) / Math.max(2, lanes.length || TUNING.opponents + 1);
    sc = Math.min(W / Math.min(1920, Math.max(1000, W * 2.4)), laneH / 300);   // never bigger than fits in a lane (a full jump and floating cheese stay inside it)
    span = W / sc;
    track.style.setProperty("--sc", sc.toFixed(4));
  }

  function chooseOpponents() {
    const mine = myRat().id;
    const pool = ROSTER.filter((r) => r.id !== mine).map((r) => ({ id: r.id, name: r.name, coat: r.coat })).concat(OTHERS);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, TUNING.opponents);
  }

  function buildLanes(custom) {   // (custom: the rats of a multi-player race, me first)
    track.innerHTML = "";
    const me = custom ? null : myRat();
    const list = custom || [{ id: me.id, name: me.name, coat: me.coat }].concat(chooseOpponents());
    lanes = list.map((r, i) => {
      const el = document.createElement("div");
      el.className = "rr-lane" + (i === 0 ? " me" : "");
      el.innerHTML = '<span class="rr-nm">' + (i === 0 ? "you · " : "") + r.name + "</span>";
      const ratEl = document.createElement("div");
      ratEl.className = "rr-rat";
      ratEl.innerHTML = '<div class="rr-shadow"></div>' + ratSVG(r.coat, r.pat);
      el.appendChild(ratEl);
      track.appendChild(el);
      return { i, name: r.name, el, ratEl, x: 0, y: 0, stun: 0, boost: 0, inv: 0, jt: -1, air: 0.8, peak: 176, trips: 0, fin: null, speedMul: 1, phase: Math.random() * 6, obEls: [], chEls: [], passedO: [], passedC: [], tripSet: {}, cheeseSet: {}, hopped: {}, flagEl: null };
    });
    if (custom) lanes.forEach((L, i) => { L.remote = i > 0; L.pid = list[i].pid; });
    layout();
  }

  // the traps and cheese: the same spots in every lane, so it's a fair race
  function makeCourse(rand = Math.random) {
    const obs = [];
    let x = 1500 + rand() * 300;
    while (x < TUNING.trackLen - 1500) { obs.push({ x, kind: "trap" }); x += 700 + rand() * 330; }
    const cheese = [];
    const G = TUNING.groundCheese, Hh = TUNING.highCheese;
    const add = (x, hi) => cheese.push({ x, y0: hi ? Hh[0] : G[0], y1: hi ? Hh[1] : G[1], hi });
    obs.forEach((o, i) => {
      const nx = obs[i + 1] ? obs[i + 1].x : o.x + 900;
      const mid = (o.x + nx) / 2;
      if (rand() < 0.2) { add(o.x + 230, false); add(o.x + 330, false); }              // a pair on the ground after a trap
      if (rand() < 0.25) add(mid, false);                                              // one on its own in the open
      if (rand() < 0.25) { add(mid - 60, true); add(mid + 60, true); }                 // a pair floating: jump for it
      if (rand() < 0.25) add(o.x, true);                                               // one right above a trap: jump high at the right moment
    });
    cheese.sort((a, b) => a.x - b.x);
    return { obs, cheese };
  }

  function layoutCourse() {
    lanes.forEach((L) => {
      L.obEls = course.obs.map(() => { const e = document.createElement("div"); e.className = "rr-ob"; e.innerHTML = TRAP; L.el.appendChild(e); return e; });
      L.chEls = course.cheese.map((c) => { const e = document.createElement("div"); e.className = "rr-cheese" + (c.hi ? " hi" : ""); e.innerHTML = CHEESE; L.el.appendChild(e); return e; });
      L.flagEl = document.createElement("div"); L.flagEl.className = "rr-flag"; L.flagEl.innerHTML = FLAG; L.el.appendChild(L.flagEl);
      L.passedO = course.obs.map(() => false);
      L.passedC = course.cheese.map(() => false);
    });
  }

  // each computer rat rolls its trips and cheese before the race (harder rounds: fewer trips, more cheese)
  function rollRats() {
    lanes.forEach((L) => {
      if (L.i === 0) return;
      L.speedMul = ratSpeed(round) * (1 + (Math.random() - 0.5) * 0.05);
      L.tripSet = {}; L.cheeseSet = {}; L.hopped = {};
      course.obs.forEach((o, k) => { if (Math.random() < ratTrip(round)) L.tripSet[k] = true; });
      course.cheese.forEach((c, k) => { if (Math.random() < ratCheese(round)) L.cheeseSet[k] = true; });
    });
  }

  // ----- drawing a frame -----
  const airH = (L) => (L.jt < 0 ? 0 : L.y);
  function jumpY(L) { if (L.jt < 0) return 0; const u = L.jt / L.air; return u >= 1 ? 0 : L.peak * 4 * u * (1 - u); }

  function drawLives() {
    livesEl.innerHTML = "";
    const n = Math.max(startLives, lives);
    for (let k = 0; k < n; k++) { const s = document.createElement("span"); s.className = "rr-puff" + (k < lives ? "" : " lost"); s.innerHTML = PUFF; livesEl.appendChild(s); }
  }
  function pop(L, text, cls) {
    const p = document.createElement("div");
    p.className = "rr-pop " + (cls || "");
    p.textContent = text;
    p.style.transform = "translate3d(" + ((XP + (L.x - cam)) * sc).toFixed(1) + "px,0,0)";
    L.el.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  function render(t) {
    const camPx = cam * sc;
    track.style.setProperty("--cam", camPx.toFixed(1));
    lanes.forEach((L) => {
      const u = L.jt >= 0 ? Math.min(1, L.jt / L.air) : 0;
      const moving = phase === "race" && !paused && L.fin == null && L.stun <= 0;
      const bob = moving && L.y === 0 ? Math.sin((t + L.phase) * 18) * 1.6 : 0;
      const sx = (XP + (L.x - cam) - RAT_W / 2) * sc;
      const tilt = L.stun > 0 ? 10 : L.jt >= 0 ? (-9 + 18 * u) * -1 : 0;   // nose up going up, nose down coming down
      L.ratEl.style.transform = "translate3d(" + sx.toFixed(1) + "px," + (-(L.y * sc + bob)).toFixed(1) + "px,0) rotate(" + tilt.toFixed(1) + "deg)";
      L.ratEl.style.setProperty("--lift", Math.min(1, L.y / 200).toFixed(2));
      L.ratEl.classList.toggle("run", moving);
      L.ratEl.classList.toggle("stun", L.stun > 0);
      L.ratEl.classList.toggle("fast", L.boost > 0 && L.stun <= 0);
      course && L.obEls.forEach((e, k) => {
        const px = (XP + (course.obs[k].x - cam) - 71) * sc;
        const on = px > -160 * sc && px < (span + 100) * sc;
        if (on) e.style.transform = "translate3d(" + px.toFixed(1) + "px,0,0)";
        e.style.visibility = on ? "visible" : "hidden";
      });
      course && L.chEls.forEach((e, k) => {
        const c = course.cheese[k];
        const px = (XP + (c.x - cam) - 29) * sc;
        const on = px > -100 * sc && px < (span + 100) * sc;
        if (on) e.style.transform = "translate3d(" + px.toFixed(1) + "px," + (-c.y0 * sc).toFixed(1) + "px,0)";
        e.style.visibility = on ? "visible" : "hidden";
      });
      if (L.flagEl) {
        const px = (XP + (TUNING.trackLen - cam) - 14) * sc;
        const on = px < (span + 100) * sc;
        if (on) L.flagEl.style.transform = "translate3d(" + px.toFixed(1) + "px,0,0)";
        L.flagEl.style.visibility = on ? "visible" : "hidden";
      }
    });
    if (phase === "race" || phase === "count") {
      const me = lanes[0];
      // the "boost 1.2s" readout was removed: it pushed the header down while it showed
      const rank = lanes.filter((L) => L.x > me.x + 0.01).length + 1;
      placeEl.textContent = rank + (rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th");
    }
  }

  // ----- the race itself -----
  function startJump() {
    const me = lanes[0];
    if (phase !== "race" || paused || lives <= 0 || me.fin != null || me.stun > 0) return;
    if (me.jt >= 0) { jumpQ = 0.2; return; }   // pressed a hair early: remembered for when you land
    me.jt = 0;
  }

  let shieldReady = false;
  function trip(L) {
    if (L.i === 0 && shieldReady) { shieldReady = false; L.inv = 0.5; pop(L, "shield!", "good"); return; }   // the trap shield soaks up the first trip
    const tt = L.i === 0 && act.soft ? TUNING.tripTime * 0.5 : TUNING.tripTime;                             // soft landing: half the time lost
    L.stun = tt; L.inv = tt + 0.35; L.jt = -1; L.y = 0; L.trips++;
    if (L.i === 0) {
      lives--; drawLives();
      pop(L, "oof -" + tt + "s", "bad");
      if (lives <= 0) eliminate();
    } else pop(L, "oof", "bad");
  }

  function step(dt) {
    T += dt;
    lanes.forEach((L) => {
      if (L.remote) { stepRemote(L, dt); return; }   // (multi-player: other players' rats are moved by what they send)
      // jumping
      if (L.jt >= 0) {
        // the faster you go, the quicker the hop, so fast rats still land before the next trap
        L.jt += dt * (L.i === 0 ? Math.min(1.5, Math.max(1, Math.sqrt((L.sp || TUNING.baseSpeed) / TUNING.baseSpeed))) : 1);
        if (L.jt >= L.air) { L.jt = -1; L.y = 0; if (L.i === 0 && jumpQ > 0) { jumpQ = 0; L.jt = 0; } }
      }
      L.y = jumpY(L);
      if (L.i === 0 && jumpQ > 0) jumpQ -= dt;
      // speed
      const wob = L.i === 0 ? 1 : 1 + 0.025 * Math.sin(T * 1.3 + L.phase);
      let sp = TUNING.baseSpeed * (L.i === 0 ? speedOf(myStats.speed) : L.speedMul) * wob * (L.boost > 0 ? TUNING.boostMul : 1);
      if (L.stun > 0) { sp = 0; L.stun -= dt; }
      if (L.out) sp = 0;
      if (L.boost > 0) L.boost -= dt;
      if (L.inv > 0) L.inv -= dt;
      if (L.fin == null) L.x += sp * dt;
      L.sp = sp;

      // the computer rats hop over what they're about to reach (or stumble on it)
      if (L.i !== 0 && L.stun <= 0 && L.jt < 0 && L.fin == null) {
        const lead = Math.max(120, sp * L.air * 0.5);   // start the hop so the top of it is right over the trap
        for (let k = 0; k < course.obs.length; k++) { const o = course.obs[k]; if (!L.passedO[k] && !L.tripSet[k] && o.x - L.x <= lead && o.x - L.x > -30 && !L.hopped["o" + k]) { L.hopped["o" + k] = true; L.jt = 0; break; } }
        if (L.jt < 0) for (let k = 0; k < course.cheese.length; k++) { const c = course.cheese[k]; if (c.hi && !L.passedC[k] && L.cheeseSet[k] && c.x - L.x <= lead && c.x - L.x > -30 && !L.hopped["c" + k]) { L.hopped["c" + k] = true; L.jt = 0; break; } }
      }

      // traps
      course.obs.forEach((o, k) => {
        if (L.passedO[k]) return;
        if (L.i === 0) {
          if (lives > 0 && Math.abs(L.x - o.x) < TUNING.trapHalf && L.inv <= 0 && L.y < TUNING.clearAt) { L.passedO[k] = true; L.obEls[k].classList.add("hit"); trip(L); }
          else if (L.x > o.x + TUNING.trapHalf) L.passedO[k] = true;
        } else if (L.x >= o.x) {
          L.passedO[k] = true;
          if (L.tripSet[k] && L.inv <= 0) { L.obEls[k].classList.add("hit"); trip(L); }
        }
      });
      // cheese
      course.cheese.forEach((c, k) => {
        if (L.passedC[k]) return;
        if (L.i === 0) {
          if (L.x > c.x + TUNING.cheeseHalf * (act.magnet ? 1.6 : 1)) { L.passedC[k] = true; L.chEls[k].classList.add("missed"); return; }
          if (lives > 0 && Math.abs(L.x - c.x) < TUNING.cheeseHalf * (act.magnet ? 1.6 : 1) && L.stun <= 0 && L.y + TUNING.ratH + (act.magnet ? 60 : 0) > c.y0 && L.y < c.y1 + (act.magnet ? 40 : 0)) {
            L.passedC[k] = true; L.boost += myBoostDur; L.chEls[k].classList.add("got"); pop(L, "+" + myBoostDur.toFixed(1) + "s", "good");
          }
        } else if (L.x >= c.x) {
          L.passedC[k] = true;
          if (L.cheeseSet[k] && L.stun <= 0) { L.boost += TUNING.cheeseBoost; L.chEls[k].classList.add("got"); }
          else L.chEls[k].classList.add("missed");
        }
      });
      // the flag
      if (L.fin == null && L.x >= TUNING.trackLen) {
        L.fin = T - (L.x - TUNING.trackLen) / Math.max(sp, 1);
        if (firstFin == null) firstFin = L.fin;
        if (mp && L.i === 0 && !mp.sentFin) { mp.sentFin = true; mp.onFinish(L.fin); }
      }
    });
    cam = Math.max(cam, Math.min(lanes[0].x, TUNING.trackLen + 400));
    if (mp) { mpSend(); return; }   // (multi-player: the server decides who won)
    // who won? (a hair after the first rat crosses, so ties can show up)
    if (!decided && allFin == null && lanes.every((L) => L.fin != null)) allFin = T;
    // you cross first: the round ends right away (a hair later, so a photo finish can show up)
    const me0 = lanes[0];
    if (!decided && me0.fin != null && firstFin != null && me0.fin <= firstFin + 0.04 && T >= firstFin + 0.06) decide();
    else if (!decided && allFin != null && T >= allFin + 0.5) decide();
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (screen !== "race") return;
    if (!paused) {
      if (phase === "count") {
        if (mp) countT = (mp.startAt - Date.now()) / 1000; else countT -= dt;
        const n = mp ? (countT > 3 ? "get ready" : Math.ceil(countT)) : Math.ceil(countT / 0.75);
        if (countT <= 0) {
          phase = "race"; countEl.textContent = "go!"; setTimeout(() => { if (phase !== "count") countEl.hidden = true; }, 700);
          lanes.forEach((L) => { if (L.i === 0 && L.boost > 0) pop(L, "head start!", "good"); });
        } else countEl.textContent = n;
      } else if (phase === "race") step(dt);
    }
    render(now / 1000);
  }

  function decide() {   // everyone has crossed the flag
    decided = true; phase = "done";
    const me = lanes[0];
    const order = lanes.slice().sort((p, q) => p.fin - q.fin);
    const ords = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
    placesEl.innerHTML = lanes.some((L) => L.fin == null) ? "" : order.map((L, k) => '<li' + (L === me ? ' class="me"' : "") + "><span>" + ords[k] + "</span><span>" + (L === me ? "you · " : "") + L.name + "</span><span>" + L.fin.toFixed(1) + "s</span></li>").join("");
    const winners = lanes.filter((L) => L.fin != null && L.fin <= firstFin + 0.04);
    const mine = winners.indexOf(me) !== -1;
    if (mine && winners.length === 1) return finish("win");
    if (mine) return finish("tie");
    finish("lose");
  }
  function eliminate() {   // out of puffs: the race stops right here, the bet is lost
    if (mp) { mpOut(); return; }
    if (decided) return;
    decided = true; phase = "done";
    placesEl.innerHTML = "";
    resultTimer = setTimeout(() => finish("out"), 900);
  }

  function finish(kind) {
    phase = "done";
    played = true; store.set("rr-played", true); tries = 1; store.set("rr-tries", tries);
    const early = round <= TUNING.gameRounds;                                          // the first 3 rounds are one game: a bad round does not end it
    const over = (kind === "lose" || kind === "out") && !early;                        // after that, a lost round ends the run (no xp for it)
    const gain = kind === "lose" || kind === "out" ? 0 : kind === "win" ? 30 + 10 * (round - 1) : 20;   // wins pay more xp, and later rounds more again
    let leveled = 0;
    xp += gain;
    while (xp >= xpNeed(plevel)) { xp -= xpNeed(plevel); plevel++; points++; leveled++; }
    resBox.dataset.kind = kind;
    resChange.dataset.new = "";
    let pay = 0;
    if (kind === "win") { pay = bet * winMult(round); if (window.YB) window.YB.add(pay); }
    else if (kind === "tie") { if (window.YB) window.YB.add(bet * TUNING.payTie); }
    if (kind === "win" || early) { round++; store.set("rr-round", round); }          // (a tie after round 3 is a rematch of the same round)
    const complete = early && round > TUNING.gameRounds;                               // that was the last round of the game
    const next = complete ? "that's all " + TUNING.gameRounds + " rounds! keep playing with the same rat, or start a new game." : "round " + round + " next.";
    if (kind === "win") {
      resTitle.textContent = "you won!";
      resText.innerHTML = "+" + fmt(pay) + " yeonbucks. the rats are getting faster...<br>" + next;
      resBtn.textContent = complete ? "keep playing" : "next round";
    } else if (kind === "tie") {
      resTitle.textContent = "photo finish: a tie";
      resText.innerHTML = "your bet (" + fmt(bet) + ") comes back to you.<br>" + (early ? next : "");
      resBtn.textContent = complete ? "keep playing" : early ? "next round" : "run it back";
    } else {
      if (over) newGame();
      resTitle.textContent = kind === "out" ? "out of puffs" : "the rats won this one";
      resText.innerHTML = (kind === "out" ? "you tripped " + TUNING.lives + " times. " : "") + "you lost " + fmt(bet) + " yeonbucks." + (over ? "" : "<br>" + next);
      resBtn.textContent = over ? "try again" : complete ? "keep playing" : "next round";
    }
    if (complete) { resChange.textContent = "new game"; resChange.dataset.new = "1"; resChange.hidden = false; }
    else { resChange.textContent = "change rat"; changeBtns(); }
    $("#rr-res-xp").innerHTML = gain ? "<b>+" + gain + " xp</b>" + (leveled ? " · level up!" : "") + xpBar() : "";
    renderPickers();
    clearTimeout(resultTimer);
    resultTimer = setTimeout(() => { resBox.hidden = false; resBtn.focus({ preventScroll: true }); }, kind === "out" ? 0 : 600);
  }

  // ----- betting and starting -----
  function openBet() {
    // a fresh track with the rats at the start, and the bet pop-up on top
    resBox.hidden = true; countEl.hidden = true; pausedEl.hidden = true; paused = false; pauseBtn.textContent = "pause";
    clearTimeout(resultTimer);
    phase = "bet"; decided = false; firstFin = null; allFin = null; cam = 0; T = 0;
    show("race");
    buildLanes(); course = null; render(0);
    page.classList.remove("racing");
    startLives = TUNING.lives; lives = startLives; drawLives(); placeEl.textContent = "1st"; $("#rr-betshow").textContent = "";
    refreshBet();
    betModal.hidden = false;
    betIn.focus({ preventScroll: true });
  }
  function changeBtns() { $("#rr-bet-back").hidden = locked; resChange.hidden = locked; }
  function parseBet() { return Math.floor(Number(String(betIn.value).replace(/\D/g, "")) || 0); }
  function fmtBetInput() { const n = parseBet(); betIn.value = n ? fmt(n) : ""; }
  function xpBar() {
    return '<span class="rr-xp"><i style="width:' + Math.min(100, (xp / xpNeed(plevel)) * 100).toFixed(0) + '%"></i></span><small>level ' + plevel + " · " + xp + "/" + xpNeed(plevel) + " xp</small>";
  }
  function renderPickers() {
    document.querySelectorAll("[data-pickpts]").forEach((box) => {
      box.innerHTML = "";
      if (points < 1) return;
      const lab = document.createElement("span");
      lab.textContent = points > 1 ? points + " stat points: pick a stat" : "pick a stat to boost by +1:";
      box.appendChild(lab);
      STATS.forEach((k) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "hy-btn"; b.textContent = k + " " + myRat().stats[k];
        b.addEventListener("click", () => spendPoint(k));
        box.appendChild(b);
      });
    });
    resBtn.disabled = points > 0; resChange.disabled = points > 0;      // pick your stat before moving on
  }
  function spendPoint(k) {
    if (points < 1) return;
    points--; bonus[k]++; applyStats(); saveProg();
    renderPickers(); refreshBet(); if (typeof updateShop === "function") updateShop();
  }
  function refreshBet() {
    $("#rr-round").textContent = round;
    $("#rr-odds").innerHTML = "win " + winMult(round) + "x &nbsp;·&nbsp; tie 1x &nbsp;·&nbsp; lose 0x";
    $("#rr-lv").textContent = level(round);
    $("#rr-bet-rat").textContent = myRat().name;
    $("#rr-have").textContent = fmt(have());
    $("#rr-bet-xp").innerHTML = xpBar();
    $("#rr-stats-line").textContent = STATS.map((k) => k + " " + myRat().stats[k]).join(" · ");
    const act1 = UPS.find((u) => u.id === activeUp);
    $("#rr-held").textContent = act1 ? "activated for this race: " + act1.name : "";
    renderPickers();
    changeBtns();
    $("#rr-luck-open").textContent = "test your luck" + (tries ? " (" + tries + ")" : "");
  }

  function start() {
    if (phase !== "bet") return;
    const b = parseBet();
    if (b < 1) { msg.textContent = "put in a bet first."; return; }
    if (b > have()) { msg.textContent = "you only have " + fmt(have()) + " yeonbucks."; return; }
    if (!window.YB || !window.YB.spend(b)) { msg.textContent = "couldn't place the bet. try again."; return; }
    msg.textContent = "";
    bet = b;
    $("#rr-betshow").innerHTML = "<b>bet:</b> " + fmt(b);
    setLocked(true);
    act = activeUp ? { [activeUp]: true } : {}; if (activeUp) ups[activeUp] = 0; activeUp = null; store.set("rr-active", null); saveUps();   // only the activated one is used, and it is used up
    const me = myRat();
    myStats = me.stats; myBoostDur = boostOf(myStats.hunger);
    startLives = TUNING.lives + items.puff; lives = startLives;
    const headStart = (items.cheese + (act.stash ? 1 : 0)) * myBoostDur;
    shieldReady = !!act.shield;
    items.puff = 0; items.cheese = 0; store.set("rr-items", items);
    betModal.hidden = true;
    decided = false; firstFin = null; allFin = null; T = 0; cam = 0; jumpQ = 0;
    buildLanes();
    lanes[0].air = airOf(myStats.jump) * (act.hang ? 1.15 : 1); lanes[0].peak = peakOf(myStats.jump);
    course = makeCourse();
    layoutCourse();
    rollRats();
    lanes[0].boost = headStart;
    page.classList.add("racing");
    drawLives(); placeEl.textContent = "1st";
    phase = "count"; countT = 3 * 0.75;
    countEl.hidden = false; countEl.textContent = "3";
    render(0);
  }


  // ----- multi-player (multiplayer.js runs the rooms; this is the race part) -----
  // Everyone races the same course (made from a shared seed) and sends where their rat is about 10 times a second.
  // Other players' rats are drawn from what they send. The server decides who won (see supabase-ratrace-mp.sql).
  let mp = null, mpPick = null;
  const seeded = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function stepRemote(L, dt) {
    if (L.fin != null) { L.x = TUNING.trackLen + 1; L.jt = -1; L.y = 0; L.sp = 0; return; }
    if (L.jt >= 0) { L.jt += dt; if (L.jt >= L.air) { L.jt = -1; } }
    L.y = jumpY(L);
    const sp = L.out ? 0 : (L.sp || 0);
    L.x += sp * dt;
    if (L.tx != null) {   // ease toward where the last message said they were (plus how far they've run since)
      const target = L.tx + (L.sp || 0) * ((performance.now() - L.tt) / 1000);
      L.x += (target - L.x) * Math.min(1, dt * 6);
    }
    L.x = Math.min(L.x, TUNING.trackLen + 1);
    L.stun = L.stunned ? 1 : 0; L.boost = L.boosted ? 1 : 0;
  }
  function mpRemote(pid, m) {
    if (!mp || !m) return;
    const L = lanes.find((l) => l.pid === pid);
    if (!L) return;
    L.tx = +m.x || 0; L.tt = performance.now(); L.sp = +m.sp || 0;
    L.stunned = !!m.stun; L.boosted = !!m.boost; L.out = !!m.out;
    if (m.jt >= 0) { L.jt = +m.jt; L.air = +m.air || 0.8; L.peak = +m.peak || 176; } else L.jt = -1;
    if (m.fin != null) L.fin = +m.fin;
  }
  function mpSend() {
    const now = performance.now(), me = lanes[0];
    if (!mp.onSend || now - mp.lastSend < 90 || phase === "count") return;
    mp.lastSend = now;
    mp.onSend({ x: Math.round(me.x), jt: me.jt >= 0 ? +me.jt.toFixed(3) : -1, air: +me.air.toFixed(3), peak: Math.round(me.peak), sp: Math.round(me.sp || 0),
      stun: me.stun > 0 ? 1 : 0, boost: me.boost > 0 ? 1 : 0, lives, out: me.out ? 1 : 0, fin: me.fin });
  }
  function mpOut() {   // out of puffs: you stop, everyone else keeps racing
    const me = lanes[0];
    if (me.out) return;
    me.out = true; me.jt = -1; me.y = 0; lives = 0; drawLives();
    pop(me, "out!", "bad");
    mp.onOut();
  }
  function mpRace(o) {
    clearTimeout(resultTimer);
    resBox.hidden = true; betModal.hidden = true; howModal.hidden = true; pausedEl.hidden = true;
    mp = { startAt: o.startAt, onSend: o.onSend, onFinish: o.onFinish, onOut: o.onOut, lastSend: 0, sentFin: false };
    paused = false; decided = true; firstFin = null; allFin = null; T = 0; cam = 0; jumpQ = 0; act = {}; shieldReady = false;
    myStats = o.me.stats; myBoostDur = boostOf(myStats.hunger);
    startLives = TUNING.lives; lives = startLives;
    page.classList.add("mp");
    show("race");
    buildLanes([{ id: "me", name: o.me.name, coat: o.me.coat }].concat(o.others.map((x) => ({ id: x.pid, pid: x.pid, name: x.name, coat: x.coat }))));
    lanes[0].air = airOf(myStats.jump); lanes[0].peak = peakOf(myStats.jump);
    course = makeCourse(seeded(o.seed | 0)); layoutCourse();
    page.classList.add("racing");
    drawLives(); placeEl.textContent = "1st"; $("#rr-betshow").innerHTML = "<b>pot:</b> " + fmt(o.pot);
    phase = "count"; countT = 99; countEl.hidden = false; countEl.textContent = "get ready";
    render(0);
    if (!raf && location.hash === "#ratrace") { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function mpReset() {   // the race is over (or you left): back to a plain title screen
    if (!mp && !mpPick) return;
    mp = null; mpPick = null; decided = false; phase = "menu";
    lanes = []; track.innerHTML = ""; course = null;
    countEl.hidden = true;
    page.classList.remove("racing", "mp");
    show("menu");
  }
  window.RRMP = {
    pickRat(cb) { mpPick = cb; phase = "pick"; buildCards(); show("pick"); },
    cancelPick() { if (mpPick) { mpPick = null; phase = "menu"; show("menu"); } },
    race: mpRace, remote: mpRemote, stop: mpReset,
    get racing() { return !!mp; },
  };

  // ----- buttons -----
  $$("[data-how]").forEach((b) => b.addEventListener("click", () => openHow()));
  function openHow() {
    if (!mp && (phase === "race" || phase === "count")) paused = true, pauseBtn.textContent = "resume";
    howModal.hidden = false; $("#rr-how-close").focus({ preventScroll: true });
  }
  function closeHow() { howModal.hidden = true; if (paused && (phase === "race" || phase === "count")) { /* stays paused until they press resume */ pausedEl.hidden = false; } }
  $("#rr-how-close").addEventListener("click", closeHow);
  howModal.addEventListener("click", (e) => { if (e.target === howModal) closeHow(); });

  $("[data-go=pick]").addEventListener("click", () => { if (locked) { openBet(); return; } phase = "pick"; buildCards(); show("pick"); });
  $("[data-go=multi]").addEventListener("click", () => { if (window.RRMulti) window.RRMulti.open(); else menuNote.textContent = "multi-player isn't available right now."; });
  $("#rr-cards").addEventListener("click", (e) => {
    const b = e.target.closest(".rr-pickbtn");
    if (!b) return;
    if (mpPick) { const cb = mpPick, r = ROSTER.find((x) => x.id === b.dataset.id); mpPick = null; show("menu"); cb({ name: r.name, coat: r.coat, stats: Object.assign({}, r.base) }); return; }   // (multi-player: just hand the rat back)
    myId = b.dataset.id; store.set("rr-rat", myId);
    openBet();
  });
  $("#rr-bet-back").addEventListener("click", () => { betModal.hidden = true; phase = "pick"; buildCards(); show("pick"); });
  goBtn.addEventListener("click", start);
  resBtn.addEventListener("click", openBet);
  resChange.addEventListener("click", () => { if (resChange.dataset.new) newGame(); resBox.hidden = true; phase = "pick"; buildCards(); show("pick"); page.classList.remove("racing"); });
  betIn.addEventListener("input", () => { fmtBetInput(); msg.textContent = ""; });
  betIn.addEventListener("keydown", (e) => { if (e.key === "Enter") start(); });
  $$(".rr-quick button").forEach((b) => b.addEventListener("click", () => {
    const q = b.dataset.q;
    betIn.value = fmt(q === "max" ? have() : Number(q));
    msg.textContent = "";
  }));
  pauseBtn.addEventListener("click", () => {
    if (phase !== "race" && phase !== "count") return;
    paused = !paused;
    pauseBtn.textContent = paused ? "resume" : "pause";
    pausedEl.hidden = !paused;
    if (paused) {
      $("#rr-p-round").textContent = round;
      $("#rr-p-bet").textContent = fmt(bet);
      $("#rr-p-win").textContent = winMult(round) + "x = " + fmt(bet * winMult(round));
    }
  });
  $("#rr-resume").addEventListener("click", () => pauseBtn.click());
  $("#rr-restart").addEventListener("click", () => {   // giving up counts as a loss: the bet is gone and you start again from round 1
    if (phase !== "race" && phase !== "count") return;
    newGame();
    openBet();
  });
  track.addEventListener("pointerdown", (e) => { if (phase === "race" && !paused) { e.preventDefault(); startJump(); } });
  document.addEventListener("keydown", (e) => {
    if (!page.classList.contains("active")) return;
    if (e.key === "Escape" && !howModal.hidden) { closeHow(); return; }
    if ((e.code === "Space" || e.key === " " || e.key === "ArrowUp") && (phase === "race" || phase === "count") && howModal.hidden) {
      e.preventDefault();
      if (phase === "race" && !e.repeat) startJump();
    }
    if ((e.key === "p" || e.key === "P") && !mp && (phase === "race" || phase === "count") && howModal.hidden) pauseBtn.click();
  });

  // ----- test your luck: stop the puff in the green zone for a random power up -----
  const luckModal = $("#rr-luck"), luckBar = $("#rr-luck-bar"), luckZone = $("#rr-luck-zone"), luckPuff = $("#rr-luck-puff"), luckRes = $("#rr-luck-res"), luckGo = $("#rr-luck-go");
  let luckState = "off", luckPos = 0, luckDir = 1, luckZ = [0.4, 0.6], luckLast = 0, luckRaf = 0;
  function luckDraw() { luckPuff.style.left = (luckPos * 100).toFixed(2) + "%"; }
  function luckTick(now) {
    luckRaf = 0;
    if (luckState !== "run") return;
    const dt = Math.min(0.05, (now - luckLast) / 1000 || 0); luckLast = now;
    luckPos += luckDir * dt * (0.9 + 0.1 * Math.min(tries, 5));
    if (luckPos >= 1) { luckPos = 1; luckDir = -1; } else if (luckPos <= 0) { luckPos = 0; luckDir = 1; }
    luckDraw();
    luckRaf = requestAnimationFrame(luckTick);
  }
  function luckReady() {
    luckRes.textContent = tries ? "tries left: " + tries : "";
    if (!tries) { luckState = "off"; luckGo.textContent = "no tries left"; luckGo.disabled = true; luckRes.textContent = "you get one try per round."; return; }
    const w = 0.2, st = 0.08 + Math.random() * (0.84 - w);
    luckZ = [st, st + w]; luckZone.style.left = (st * 100).toFixed(1) + "%"; luckZone.style.width = (w * 100) + "%";
    luckPos = 0; luckDir = 1; luckState = "run"; luckLast = performance.now();
    luckGo.disabled = false; luckGo.textContent = "stop!";
    luckDraw();
    cancelAnimationFrame(luckRaf); luckRaf = requestAnimationFrame(luckTick);
  }
  function grantPowerUp() {
    const pool = UPS.filter((u) => u.id === "train" || !ups[u.id]);   // training always, the one-race ones if you aren't already holding them
    const u = pool[Math.floor(Math.random() * pool.length)];
    if (u.id === "train") { points++; saveProg(); return "you got training! pick a stat to boost below."; }
    ups[u.id] = 1; saveUps();
    return "you got " + u.name + "! activate it in your upgrade inventory.";
  }
  function luckStop() {
    if (luckState !== "run") return;
    luckState = "done"; cancelAnimationFrame(luckRaf); luckRaf = 0;
    tries--; store.set("rr-tries", tries);
    const hit = luckPos >= luckZ[0] && luckPos <= luckZ[1];
    luckRes.textContent = hit ? grantPowerUp() : "so close! not this time.";
    luckRes.classList.toggle("win", hit);
    luckGo.textContent = tries ? "try again (" + tries + ")" : "no tries left";
    luckGo.disabled = !tries;
    refreshBet();
  }
  function openLuck() { luckRes.classList.remove("win"); betModal.hidden = true; luckModal.hidden = false; luckReady(); }
  function closeLuck() { luckState = "off"; cancelAnimationFrame(luckRaf); luckRaf = 0; luckModal.hidden = true; betModal.hidden = false; refreshBet(); }
  $("#rr-luck-open").addEventListener("click", openLuck);
  $("#rr-luck-close").addEventListener("click", closeLuck);
  luckGo.addEventListener("click", () => { if (luckState === "run") luckStop(); else { luckRes.classList.remove("win"); luckReady(); } });
  luckBar.addEventListener("pointerdown", () => luckStop());

  // ----- upgrade inventory: the boosts you hold, and which one is switched on for the next race -----
  const upInv = $("#rr-upinv");
  const upInv2 = document.getElementById("rat-upinv");     // the same pop-up on the upgrade shop page
  function renderUpInv() { document.querySelectorAll(".rr-uplist").forEach(renderUpList); }
  function renderUpList(upList) {
    upList.innerHTML = "";
    const mine = UPS.filter((u) => u.id !== "train" && ups[u.id]);
    if (!mine.length) { const li = document.createElement("li"); li.className = "rr-up-empty"; li.textContent = "no upgrades yet. get some in the upgrade shop or from test your luck."; upList.appendChild(li); return; }
    mine.forEach((u) => {
      const li = document.createElement("li");
      li.innerHTML = '<span class="rr-up-t"><b></b><small></small></span><button type="button" class="hy-btn"></button>';
      li.querySelector("b").textContent = u.name;
      li.querySelector("small").textContent = u.desc.replace("next race only: ", "");
      const b = li.querySelector("button");
      b.textContent = activeUp === u.id ? "activated" : "activate";
      b.classList.toggle("on", activeUp === u.id);
      b.addEventListener("click", () => {
        activeUp = activeUp === u.id ? null : u.id;     // only one at a time
        store.set("rr-active", activeUp);
        renderUpInv(); refreshBet();
      });
      upList.appendChild(li);
    });
  }
  if (upInv2) {
    document.getElementById("rat-upinv-open").addEventListener("click", () => { renderUpInv(); upInv2.hidden = false; });
    document.getElementById("rat-upinv-close").addEventListener("click", () => { upInv2.hidden = true; });
  }
  page.addEventListener("click", (e) => { if (e.target.closest("[data-exit]")) location.hash = "#arcade"; });   // every "exit" leaves for the arcade
  let invFrom = betModal;   // which pop-up the inventory opened from, so closing it goes back there
  $("#rr-upinv-open").addEventListener("click", () => { invFrom = betModal; betModal.hidden = true; renderUpInv(); upInv.hidden = false; });
  $("#rr-res-upinv").addEventListener("click", () => { invFrom = resBox; resBox.hidden = true; renderUpInv(); upInv.hidden = false; });
  $("#rr-upinv-close").addEventListener("click", () => { upInv.hidden = true; invFrom.hidden = false; if (invFrom === betModal) refreshBet(); });

  // ----- the upgrade shop page (same look as the other shops) -----
  const shopBox = document.getElementById("rat-items"), shopMsg = document.getElementById("rat-msg");
  const SHOP_ICON = {
    train: '<path d="M4 9v10M8 6v16M20 6v16M24 9v10M8 14h12"/>',
    shield: '<path d="M14 3l9 3v7c0 6-4 10-9 12-5-2-9-6-9-12V6z"/>',
    soft: '<path d="M4 22c4-2 6-2 10 0s6 2 10 0"/><path d="M14 4v12M9 11l5 5 5-5"/>',
    magnet: '<path d="M6 4v10a8 8 0 0 0 16 0V4"/><path d="M4 8h5M19 8h5"/>',
    hang: '<path d="M3 22c3-14 19-14 22 0" stroke-dasharray="2 3"/><path d="M14 8v-4M11 6l3-3 3 3"/>',
    stash: '<path d="M3 20l22-4V10L3 20z"/><path d="M8 17l1 .2M16 15.5l1 .2"/>',
  };
  let shopMsgT = 0;
  function say(t) { if (!shopMsg) return; shopMsg.textContent = t; clearTimeout(shopMsgT); shopMsgT = setTimeout(() => { shopMsg.textContent = ""; }, 3500); }
  function buildShop() {
    if (!shopBox) return;
    shopBox.innerHTML = '<h2 class="shop-cat"><span class="shop-cat-t">rat upgrades</span><span class="rr-pickpts shop-pick" data-pickpts></span></h2><div class="shop-grid"></div>';
    const grid = shopBox.querySelector(".shop-grid");
    const note = document.createElement("p");
    note.className = "shop-cat-note rr-shop-note";
    note.innerHTML = "only one upgrade can be used per round<br>you can buy one boost per game, then again every 5 rounds";
    shopBox.appendChild(note);
    UPS.forEach((u) => {
      const card = document.createElement("div");
      card.className = "shop-item"; card.dataset.id = u.id;
      card.innerHTML = '<span class="shop-prev shop-prev-glyph"><svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SHOP_ICON[u.id] + "</svg></span>" +
        '<span class="shop-name"></span><span class="shop-desc"></span><span class="shop-price"></span><button type="button" class="hy-btn shop-buy"></button>';
      card.querySelector(".shop-name").textContent = u.name;
      card.querySelector(".shop-desc").textContent = u.desc;
      card.querySelector(".shop-buy").addEventListener("click", () => {
        if (u.id !== "train" && (ups[u.id] || !canBuyBoost())) { updateShop(); return; }
        if (!window.YB || !window.YB.spend(u.price)) { say("not enough yeonbucks yet!"); updateShop(); return; }
        if (u.id === "train") { points++; saveProg(); say("pick a stat to boost!"); }
        else { ups[u.id] = 1; boughtAt = round; store.set("rr-boughtat", boughtAt); saveUps(); say("you got " + u.name + "! activate it in your upgrade inventory."); }
        if (window.YB) window.YB.redraw();
        renderPickers(); updateShop();
      });
      grid.appendChild(card);
    });
    updateShop();
  }
  function updateShop() {
    if (!shopBox) return;
    shopBox.querySelectorAll(".shop-item").forEach((card) => {
      const u = UPS.find((x) => x.id === card.dataset.id), maxed = u.id !== "train" && !!ups[u.id];
      const b = card.querySelector(".shop-buy");
      const capped = u.id !== "train" && !canBuyBoost() && !maxed;
      const wait = boughtAt + 5 - round;
      card.querySelector(".shop-price").textContent = maxed ? "in your upgrade inventory" : capped ? "next boost in " + wait + " round" + (wait === 1 ? "" : "s") : fmt(u.price) + " yeonbucks";
      b.textContent = maxed ? "owned" : capped ? "one per game" : "buy";
      b.disabled = maxed || capped || have() < u.price;
      card.classList.toggle("is-owned", maxed);
      card.classList.toggle("is-short", !maxed && !capped && have() < u.price);
    });
  }
  buildShop(); renderPickers();
  setInterval(() => { if (location.hash === "#rat-shop") updateShop(); }, 1000);
  window.addEventListener("hashchange", () => { if (location.hash === "#rat-shop") updateShop(); });

  // leaving in the middle of a race counts as a loss (the bet is already in)
  function onRoute() {
    const here = location.hash === "#ratrace";
    if (here) {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      if (screen === "menu") { buildHero(); show("menu"); }
      else if (screen === "race") layout();
    } else if (location.hash === "#rat-shop" && phase !== "count" && phase !== "race") {
      // popping over to the upgrade shop: keep the screen as it is so you land back where you were
      cancelAnimationFrame(raf); raf = 0;
    } else {
      mpReset();
      newGame();   // leaving the game for anywhere but the upgrade shop ends the run, so single player lets you pick a new rat again
      phase = "menu"; decided = false; firstFin = null; allFin = null; paused = false;
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(resultTimer);
      resBox.hidden = true; betModal.hidden = true; howModal.hidden = true; pausedEl.hidden = true; countEl.hidden = true;
      page.classList.remove("racing");
      show("menu");
    }
  }
  setInterval(() => { if (location.hash === "#ratrace" && !betModal.hidden) $("#rr-have").textContent = fmt(have()); }, 300);   // "you have" keeps up with tap bonuses etc.
  window.addEventListener("hashchange", onRoute);
  window.addEventListener("resize", () => { if (screen === "race") layout(); });
  buildHero();
  onRoute();
  window.RRArt = { ratSVG, NAMES };   // multi-player (multiplayer.js) draws the same rats
})();
