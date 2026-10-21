// THE PRIZE SHOP
//
// To ADD or CHANGE something in the shop, edit the list ITEMS below. Each one has:
//   id     - a short name nothing else uses (it's what gets saved in the visitor's browser)
//   group  - (not shown for now, handy if you ever want headings back)
//   name   - what the box says
//   desc   - the little line under the name
//   price  - cost in yeonbucks
//   wheel  - (optional) true = not sold in the shop, it's a prize from the secret room wheel
//   until  - (optional) "2026-10-31" = only sold up to and including that day, then it leaves the shop (people who bought it keep it)
//   lost   - (optional) true = not sold anywhere, it is a find in the secret room's lost and found (see lostfound.js)
//   daily  - (optional) true = not sold anywhere, it is a gift in the daily reward (see the DAILY list in daily.js)
//   rare   - (optional) true = sold in the RARE ITEMS SHOP in the secret room instead (see "THE RARE ITEMS SHOP" lower down)
//   (the shop shows the items in this order, 9 at a time with an arrow to the next page, so just keep adding to the list. Keep the secret room key last.)
//   kind   - "perk"   : you just own it (the earn boosts, lucky charm and prize bonus are switched on in casino.js, the secret room key in secretroom.js; "tag" is the little label in the box)
//            "cursor" : a trail that follows the mouse. "value" is "sparkle" or "heart"
//            "pointer": a different mouse pointer (the arrow and the pointing hand). "value" is "y2k". The images are in the cursors folder, the CSS is in style.css (search "data-pointer").
//            "tap"    : something pops where you tap or click. "value" is "sparkle", "heart", "petal", "bubble", "ghost" or "yb" (yb = +1 yeonbucks per tap). The drawing is at the bottom of this file, the CSS is in style.css (search "tap-bit").
//            "bg"     : a page background. "value" is "dots", "grid", "stars", "hearts" or "rain"
//            "accent" : tints the whole site a color. "value" is "pink", "blue", "green" or "lavender" (the colors are in style.css, search "data-accent")
//            "acc"    : something your pet wears (found in the lost and found only). "value" is "hat", "bow" or "soda"
//            "pet"    : a little pet in the bottom right corner. "value" is the animal's name, e.g. "dog" or "koala" (what they say is at the bottom of this file)
//            "soon"   : shows in the shop but can't be bought yet
//   short  - (optional) a shorter name for the small inventory buttons
//   desktop - (optional) true = the card says "(desktop only)", for things that need a mouse
//
// What a visitor owns is saved in this browser ("yb-own"), and so is what they have switched on ("yb-eq").
// The cursor trails are drawn at the bottom of this file, the backgrounds are in style.css (search "html[data-bg").

(function () {
  const RARE_PRICE = 45000;                                      // what every pet in the rare items shop costs
  // the two little ghosts used by the ghost tap and its shop picture (icons by Jajang Nurrahman, Noun Project). Each tap picks one at random.
  const GHOSTS = [
    '<svg class="tap-ghost-svg" viewBox="-2 -2 104 104" aria-hidden="true" focusable="false"><path style="fill:var(--bg)" d="M83 69.08C79.3 67.04 76.59 63.59 75.48 59.51C73.37 52.68 74.82 45.96 76.32 40.88L76.32 40.89C76.38 40.7 76.45 40.52 76.55 40.34C77.97 41.16 79.7 41.28 81.23 40.68C82.66 39.8 83.61 38.33 83.83 36.67C84.67 32.87 84.41 28.93 83.09 25.27C81.62 21.17 79.22 19.69 77.46 19.17C75.7 18.64 72.87 18.57 69.38 21.23C68.79 21.67 68.22 22.15 67.66 22.63L67.66 22.63C66.98 23.22 66.28 23.77 65.55 24.29C63.74 25.53 62.6 25.38 61.04 23.72L61.04 23.72C60.18 22.73 59.42 21.67 58.77 20.54C58.55 20.17 58.32 19.8 58.09 19.44C55.72 15.27 52.6 11.57 48.88 8.55C44.11 4.83 37.81 3.73 32.07 5.61C26.37 7.64 22.07 12.37 20.58 18.22C19.52 22.45 19.35 26.85 20.07 31.16C20.25 32.57 20.49 33.98 20.73 35.39C21.05 37.34 21.36 39.17 21.55 41.03L21.55 41.04C21.8 42.18 21.63 43.37 21.07 44.39C20.14 45.17 18.96 45.58 17.75 45.55C15.95 45.65 14.18 46 12.48 46.59C9.36 47.71 7.28 50.68 7.29 54C7.22 59.03 12.54 66.65 17.28 68.3C18.6 68.87 20.1 68.79 21.36 68.11C22.43 67.45 23.17 66.35 23.39 65.11C24.83 65.75 26.13 66.69 27.18 67.87C28.2 68.9 29.22 69.95 30.23 70.99C32.13 72.97 34.11 75 36.12 76.95C44.86 85.41 54.81 88.41 65.69 85.89L65.7 85.89C68.31 85.23 70.99 84.91 73.69 84.93C79.31 85.07 82.96 87.32 85.19 92.02C85.38 92.43 85.59 92.84 85.84 93.3L86.22 94.04C86.56 94.72 87.22 95.18 87.98 95.29C88.73 95.39 89.5 95.13 90.02 94.57C90.92 93.58 91.55 92.37 91.86 91.07C93.18 86.95 93.02 82.49 91.4 78.47C89.78 74.46 86.81 71.13 83 69.08Z"/><path fill="currentColor" d="m83 69.08c-3.7-2.04-6.41-5.49-7.52-9.57-2.11-6.84-0.66-13.55 0.84-18.63v0c0.05-0.19 0.13-0.37 0.23-0.54 1.43 0.82 3.15 0.94 4.68 0.33 1.43-0.88 2.38-2.35 2.6-4 0.84-3.8 0.58-7.75-0.74-11.4-1.47-4.1-3.87-5.58-5.62-6.1-1.77-0.53-4.59-0.59-8.09 2.06-0.59 0.45-1.16 0.93-1.72 1.4l0-0c-0.68 0.59-1.38 1.15-2.11 1.67-1.81 1.23-2.95 1.09-4.51-0.57h-0c-0.86-0.98-1.61-2.05-2.26-3.18-0.23-0.37-0.45-0.73-0.69-1.1-2.36-4.17-5.48-7.86-9.21-10.89-4.77-3.71-11.07-4.82-16.81-2.94-5.7 2.03-10 6.76-11.49 12.61-1.05 4.23-1.23 8.63-0.51 12.93 0.19 1.41 0.43 2.83 0.66 4.24 0.32 1.94 0.63 3.78 0.82 5.64l-0 0c0.25 1.14 0.08 2.33-0.48 3.35-0.93 0.78-2.11 1.19-3.31 1.16-1.8 0.1-3.57 0.45-5.28 1.04-3.12 1.13-5.2 4.09-5.18 7.41-0.07 5.03 5.25 12.65 9.99 14.3 1.32 0.56 2.82 0.49 4.08-0.2 1.07-0.66 1.81-1.76 2.03-3 1.44 0.64 2.73 1.59 3.79 2.76 1.02 1.04 2.04 2.08 3.04 3.12 1.91 1.97 3.88 4.01 5.89 5.96 8.74 8.45 18.69 11.46 29.57 8.93h0c2.61-0.66 5.3-0.98 7.99-0.95 5.62 0.14 9.27 2.39 11.5 7.08 0.2 0.41 0.41 0.82 0.65 1.29l0.38 0.73c0.35 0.68 1.01 1.15 1.76 1.25 0.76 0.11 1.52-0.16 2.04-0.72 0.9-0.99 1.53-2.2 1.84-3.5 1.32-4.12 1.16-8.58-0.46-12.6-1.62-4.02-4.59-7.34-8.4-9.39zm4.88 18.23c-3.11-4.53-7.83-6.9-14.07-7.05-0.24-0.01-0.47-0.01-0.71-0.01v-0c-2.85 0.04-5.69 0.4-8.46 1.08-9.36 2.17-17.62-0.36-25.25-7.73-1.96-1.9-3.91-3.91-5.79-5.85-1.02-1.05-2.04-2.11-3.07-3.16-1.61-1.75-3.59-3.11-5.8-3.98-1.26-0.61-2.72-0.62-3.98-0.03-1.09 0.77-1.79 1.99-1.89 3.32l-0.02-0.01c-2.79-0.98-6.89-6.85-6.85-9.81-0.04-1.4 0.85-2.67 2.18-3.11 1.34-0.43 2.72-0.68 4.12-0.75 2.44-0.04 4.75-1.07 6.41-2.86 1.41-1.96 1.96-4.41 1.52-6.79-0.21-2.01-0.54-4.01-0.86-5.94-0.23-1.36-0.45-2.72-0.64-4.09v0c-0.65-3.67-0.52-7.43 0.37-11.04 1.09-4.37 4.27-7.91 8.5-9.45 4.29-1.37 8.98-0.52 12.51 2.27 3.25 2.7 5.98 5.97 8.05 9.65 0.22 0.34 0.43 0.69 0.64 1.03 0.81 1.41 1.76 2.72 2.84 3.93 2.58 3.25 7.3 3.8 10.57 1.23 0.87-0.61 1.7-1.26 2.49-1.96 0.5-0.43 1.01-0.85 1.53-1.25 1.04-1 2.48-1.48 3.91-1.3 1.29 0.62 2.23 1.8 2.55 3.19 1.02 2.84 1.22 5.9 0.57 8.84-0.04 0.21-0.1 0.42-0.17 0.62-0.23-0.08-0.45-0.17-0.66-0.27-2.03-1.12-4.58-0.4-5.72 1.61-0.38 0.59-0.68 1.23-0.88 1.9-1.69 5.71-3.3 13.3-0.82 21.34v0c1.46 5.22 4.95 9.64 9.7 12.26 5.16 2.71 8.04 8.38 7.18 14.14zm-48.37-66.02c-0.2-1.12 0.31-2.24 1.28-2.83 1.02-0.5 2.25-0.31 3.07 0.47 2.1 1.58 3.38 4.02 3.47 6.64 0.18 1.12-0.36 2.24-1.35 2.8-1.09 0.54-2.41 0.33-3.27-0.54-1.93-1.64-3.09-4.01-3.19-6.55zm-6.2 1.65c2.09 2.37 2.93 5.59 2.26 8.68-0.26 1.06-1.11 1.88-2.19 2.09-1.09 0.18-2.18-0.32-2.74-1.27-1.17-1.78-1.83-3.85-1.91-5.98 0.01-1 0.24-1.98 0.68-2.88 0.31-0.73 0.98-1.26 1.77-1.39 0.79-0.13 1.59 0.15 2.12 0.75zm10.84 13.82c1.91 2.39 3.03 5.32 3.19 8.37-0.11 1.24-0.18 2.59-1.66 3.11-1.21 0.35-2.5-0.15-3.16-1.22-2.08-2.32-3.28-5.3-3.37-8.42-0.04-1.36 0.21-2.81 1.74-3.32 1.44-0.48 2.44 0.49 3.27 1.48z"/></svg>',
    '<svg class="tap-ghost-svg" viewBox="-2 -2 104 104" aria-hidden="true" focusable="false"><path style="fill:var(--bg)" d="M92.3 39.71C94.33 41.68 94.9 45.02 94.06 49.91C94 50.28 93.84 50.63 93.61 50.93C92.17 52.62 90.27 53.87 88.15 54.52C85.54 55.57 84.27 56.18 83.73 58.75L83.73 58.74C83.68 59 83.58 59.25 83.45 59.47C81.75 62.29 78.95 62.52 76.9 62.68C74.82 62.85 74.18 63.02 73.71 63.9C73.68 63.95 73.66 64 73.63 64.05C71.16 67.98 69.33 71.42 67.72 74.46C61.94 85.36 58.72 91.43 40.14 90.33L38.95 91.09C37.74 91.88 36.52 92.67 35.28 93.42C35.21 93.46 35.14 93.5 35.07 93.53C32.92 94.61 30.57 95.21 28.17 95.31C26.78 95.35 25.41 95 24.21 94.29C23.79 94.04 23.47 93.66 23.28 93.21C21.99 90.17 20.28 90.13 15.72 90.79C12.97 91.41 10.11 91.35 7.39 90.62C6.45 90.29 5.82 89.41 5.82 88.43C5.79 84.54 9.11 80.93 12.96 76.75C17.6 71.72 22.86 66.01 21.81 59.91C21.79 59.8 21.77 59.69 21.77 59.59C21.75 59.19 21.73 58.29 21.65 57.73C21.31 57.72 20.79 57.74 20.1 57.78C19.43 57.82 18.77 57.56 18.3 57.09C17.26 56 16.34 54.81 15.54 53.54C13.85 51 13.45 50.41 10.01 51.54C9.06 51.85 8.02 51.53 7.41 50.74C4.33 46.7 5.16 41.23 9.52 36.79C13.87 32.36 21.29 29.7 26.75 33.25C29.27 33.6 30.02 32.4 31.65 26.27C33.17 20.54 35.25 12.68 43.47 8.09C52.01 3.32 60.82 3.58 67.63 8.82C75.86 15.14 79.45 27.25 76.64 39.09C76.65 39.1 76.65 39.11 76.66 39.13C77.23 39.46 79.87 38.93 81.45 38.61C85.23 37.85 89.5 36.98 92.3 39.71Z"/><path fill="currentColor" d="m49.4 26.04c0.1-2.62 1.38-5.06 3.47-6.64 0.82-0.79 2.05-0.97 3.07-0.48 0.97 0.59 1.47 1.72 1.28 2.84-0.1 2.53-1.26 4.91-3.19 6.55-0.86 0.86-2.18 1.08-3.27 0.54-0.99-0.56-1.53-1.68-1.35-2.8zm14.02-2.63c-2.09 2.37-2.93 5.59-2.26 8.67 0.26 1.07 1.11 1.88 2.19 2.1 1.09 0.18 2.18-0.32 2.74-1.27 1.17-1.78 1.83-3.85 1.91-5.98-0.01-1-0.24-1.98-0.68-2.88-0.31-0.74-0.98-1.26-1.77-1.39-0.79-0.13-1.59 0.16-2.12 0.75zm-7.58 12.34c-1.43-0.48-2.44 0.49-3.27 1.48h0c-1.91 2.39-3.03 5.32-3.19 8.37 0.11 1.24 0.18 2.59 1.66 3.11 1.21 0.35 2.5-0.15 3.16-1.22 2.08-2.32 3.28-5.3 3.37-8.42 0.04-1.36-0.21-2.8-1.74-3.32zm36.47 3.96c2.03 1.97 2.6 5.31 1.76 10.2-0.06 0.37-0.21 0.72-0.45 1.02-1.44 1.69-3.34 2.94-5.46 3.59-2.61 1.04-3.88 1.66-4.41 4.22l-0-0c-0.05 0.26-0.15 0.5-0.29 0.73-1.7 2.82-4.5 3.05-6.54 3.21-2.09 0.17-2.72 0.34-3.19 1.22-0.03 0.05-0.05 0.1-0.09 0.15-2.46 3.93-4.29 7.37-5.91 10.41-5.78 10.9-9 16.96-27.58 15.87l-1.18 0.76c-1.21 0.79-2.43 1.57-3.67 2.33-0.07 0.04-0.14 0.08-0.21 0.11-2.15 1.07-4.5 1.68-6.9 1.78-1.39 0.04-2.76-0.32-3.96-1.02-0.42-0.25-0.74-0.63-0.93-1.08-1.29-3.04-3-3.08-7.55-2.42-2.75 0.62-5.61 0.56-8.33-0.17-0.94-0.33-1.57-1.21-1.57-2.2-0.03-3.88 3.3-7.49 7.14-11.67 4.64-5.04 9.9-10.75 8.84-16.85-0.02-0.11-0.03-0.21-0.04-0.32-0.02-0.4-0.04-1.29-0.12-1.85-0.34-0.01-0.86 0-1.55 0.04-0.67 0.04-1.33-0.21-1.8-0.69-1.04-1.09-1.96-2.28-2.76-3.55-1.69-2.54-2.09-3.13-5.53-2-0.95 0.31-2-0.01-2.61-0.8-3.07-4.04-2.25-9.51 2.11-13.95 4.36-4.43 11.77-7.09 17.24-3.55 2.51 0.36 3.27-0.84 4.89-6.97 1.52-5.73 3.61-13.59 11.82-18.18 8.54-4.77 17.35-4.51 24.16 0.72 8.23 6.32 11.82 18.43 9.01 30.27 0.01 0.02 0.01 0.03 0.02 0.04 0.57 0.33 3.21-0.2 4.79-0.52 3.77-0.76 8.05-1.62 10.85 1.1zm-3.27 3.36c-1.03-1-4.15-0.37-6.65 0.13-3.26 0.66-6.33 1.27-8.53-0.34h-0c-1.14-0.86-1.84-2.17-1.93-3.59-0.03-0.28-0.01-0.56 0.05-0.83 2.58-10.21-0.31-20.62-7.2-25.9-5.34-4.09-12.09-4.22-19.02-0.35-6.48 3.62-8.12 9.82-9.58 15.29-1.46 5.52-3.13 11.77-10.78 10.29h0.01c-0.34-0.07-0.66-0.21-0.94-0.41-3.25-2.38-8.45-0.49-11.6 2.72-0.88 0.89-3.32 3.71-2.43 6.5 5.37-1.09 7.37 1.91 9 4.36 0.47 0.73 0.98 1.43 1.52 2.11 1.42-0.17 2.85 0.22 3.98 1.09 1.35 1.23 1.45 3.12 1.52 5.14 1.34 8.3-4.96 15.15-10.04 20.66l-0 0c-2.01 2-3.8 4.21-5.33 6.6 1.33-0.03 2.66-0.16 3.97-0.38 3.92-0.57 9.23-1.34 12.14 4.36 1.99 0.21 4-0.2 5.75-1.16 1.16-0.71 2.32-1.46 3.46-2.2l1.85-1.19c0.42-0.27 0.92-0.39 1.42-0.36 16.24 1.11 18.17-2.53 23.9-13.33 1.64-3.1 3.5-6.6 6.04-10.65 1.75-3.21 4.86-3.45 6.91-3.62 1.64-0.13 2.32-0.25 2.72-0.71 1.19-4.74 4.62-6.11 7.15-7.12 1.14-0.36 2.21-0.94 3.14-1.7 0.57-3.86-0.16-5.06-0.51-5.41z"/></svg>',
  ];
  // the little drawings for the lost and found finds: the pet accessories (Noun Project: witch hat by Tahira Auns, bow by Madeleine Bennett,
  // soda by Lutfi Gani Al Achmad) and the cheese used by the cheese tap and cheese trail.
  const ACC_ART = {
    hat: '<svg class="acc-svg" viewBox="-0.5 11.2 129.0 105.5" aria-hidden="true" focusable="false"><path style="fill:var(--bg)" d="M94.62 68.76L68.41 15.00C67.58 13.30 65.89 12.24 64.00 12.24C62.11 12.24 60.42 13.30 59.59 15.00L33.37 68.76C13.08 73.11 0.50 81.51 0.50 90.73C0.50 104.76 28.39 115.75 64.00 115.75C99.61 115.75 127.50 104.76 127.50 90.73C127.50 81.51 114.91 73.11 94.62 68.76Z"/><path fill="currentColor" fill-rule="evenodd" d="M94.623,68.756L68.408,14.999c-0.829-1.7-2.519-2.755-4.41-2.755c-1.891,0-3.581,1.056-4.41,2.755L33.372,68.757 C13.084,73.114,0.5,81.512,0.5,90.73c0,14.03,27.893,25.02,63.5,25.02s63.5-10.99,63.5-25.02 C127.5,81.511,114.914,73.113,94.623,68.756z M32.188,75.75c5.555,3.188,13.737,5.367,23.278,6.196v4.783 c0,1.338,1.089,2.427,2.427,2.427h12.21c1.338,0,2.427-1.089,2.427-2.427v-4.783c9.548-0.83,17.729-3.008,23.277-6.198l3.662,7.51 c0.546,1.12,0.321,2.465-0.56,3.349c-5.744,5.76-19.122,9.337-34.913,9.337c-15.791,0-29.167-3.578-34.911-9.337 c-0.881-0.884-1.106-2.229-0.56-3.349L32.188,75.75z M57.466,86.729V75.911c0-0.235,0.191-0.427,0.427-0.427h12.21 c0.235,0,0.427,0.191,0.427,0.427v10.818c0,0.235-0.192,0.427-0.427,0.427h-12.21C57.657,87.156,57.466,86.964,57.466,86.729z M61.386,15.876c0.499-1.022,1.475-1.632,2.612-1.632c1.137,0,2.113,0.61,2.612,1.632l28.317,58.068 c-5.261,3.065-13.135,5.173-22.397,5.995v-4.028c0-1.338-1.089-2.427-2.427-2.427h-12.21c-1.338,0-2.427,1.089-2.427,2.427v4.027 c-9.255-0.821-17.13-2.928-22.398-5.992L61.386,15.876z M64,113.75c-33.911,0-61.5-10.327-61.5-23.02 c0-8.003,11.343-15.463,29.753-19.678l-5.525,11.329c-0.919,1.886-0.541,4.151,0.942,5.638c7.297,7.318,23.55,9.925,36.327,9.925 c0,0,0,0,0,0c12.777,0,29.031-2.607,36.329-9.925c1.482-1.487,1.86-3.753,0.941-5.638l-5.525-11.33 C114.155,75.266,125.5,82.727,125.5,90.73C125.5,103.423,97.911,113.75,64,113.75z"/></svg>',
    bow: '<svg class="acc-svg" viewBox="3.9 10.2 93.1 78.6" aria-hidden="true" focusable="false"><path style="fill:var(--bg)" d="M94.01 17.22C93.76 16.01 93.11 14.92 92.14 14.15C91.59 13.72 90.86 13.28 89.92 12.93C85.36 11.22 75.79 11.42 56.06 21.85C55.96 21.67 55.87 21.49 55.74 21.33C54.37 19.67 51.70 19.71 51.20 19.73C50.72 19.71 48.03 19.67 46.66 21.33C46.34 21.73 46.13 22.20 46.02 22.71C41.46 21.69 21.86 17.44 13.45 17.60C8.72 17.67 6.47 18.75 5.52 20.42C5.00 21.34 4.86 29.39 5.03 36.96C5.10 40.15 6.54 43.17 8.97 45.25C10.94 46.94 13.33 47.83 15.81 47.83C16.28 47.83 16.75 47.80 17.23 47.73C19.98 47.36 22.89 46.58 25.93 45.42C21.71 53.85 18.55 59.58 16.76 62.02C12.56 67.76 9.22 69.31 9.19 69.33C8.77 69.52 8.57 70.01 8.75 70.44C8.93 70.87 9.42 71.07 9.85 70.90L27.15 64.08C27.53 66.75 28.38 73.90 27.30 77.92C27.21 78.25 27.33 78.60 27.60 78.81C27.75 78.93 27.94 78.99 28.12 78.99C28.26 78.99 28.40 78.95 28.53 78.88C28.90 78.67 37.74 73.38 50.13 34.45C50.46 34.49 50.81 34.52 51.21 34.52C51.72 34.52 52.17 34.49 52.56 34.42C53.54 35.90 58.55 44.33 59.80 62.55C61.23 83.43 67.99 87.50 68.27 87.67C68.40 87.74 68.54 87.78 68.69 87.78C68.82 87.78 68.95 87.75 69.07 87.69C69.32 87.56 69.50 87.32 69.53 87.04L71.27 73.89L87.24 82.02C87.56 82.19 87.99 82.12 88.24 81.85C88.50 81.58 88.54 81.16 88.36 80.84C88.28 80.71 80.69 67.60 79.00 57.93C77.71 50.52 71.00 41.77 67.35 37.44C72.64 39.52 78.69 41.75 83.78 43.24C84.39 43.42 85.01 43.51 85.62 43.51C88.23 43.51 90.61 41.91 91.69 39.37C95.94 29.36 94.66 20.32 94.02 17.24Z"/><path fill="currentColor" fill-rule="evenodd" d="m94.012 17.219c-0.25-1.2109-0.89844-2.3008-1.8711-3.0703-0.55078-0.42969-1.2812-0.87109-2.2188-1.2188-4.5586-1.7109-14.129-1.5117-33.859 8.9219-0.10156-0.17969-0.19141-0.35937-0.32031-0.51953-1.3711-1.6602-4.0391-1.6211-4.5391-1.6016-0.48828-0.019531-3.1719-0.058594-4.5391 1.6016-0.32812 0.39844-0.53906 0.87109-0.64844 1.3789-4.5586-1.0195-24.16-5.2695-32.57-5.1094-4.7305 0.070313-6.9805 1.1484-7.9297 2.8203-0.51953 0.92188-0.66016 8.9688-0.48828 16.539 0.070312 3.1914 1.5117 6.2109 3.9414 8.2891 1.9688 1.6914 4.3594 2.5781 6.8398 2.5781 0.46875 0 0.94141-0.03125 1.4219-0.10156 2.75-0.37109 5.6602-1.1484 8.6992-2.3086-4.2188 8.4297-7.3789 14.16-9.1719 16.602-4.1992 5.7383-7.5391 7.2891-7.5703 7.3086-0.42188 0.19141-0.62109 0.67969-0.44141 1.1094 0.17969 0.42969 0.67188 0.62891 1.1016 0.46094l17.301-6.8203c0.37891 2.6719 1.2305 9.8203 0.14844 13.84-0.089844 0.32812 0.03125 0.67969 0.30078 0.89062 0.14844 0.12109 0.33984 0.17969 0.51953 0.17969 0.14062 0 0.28125-0.039062 0.41016-0.10938 0.37109-0.21094 9.2109-5.5 21.602-44.43 0.32812 0.039062 0.67969 0.070312 1.0781 0.070312 0.51172 0 0.96094-0.03125 1.3516-0.10156 0.98047 1.4805 5.9883 9.9102 7.2383 28.129 1.4297 20.879 8.1914 24.949 8.4688 25.121 0.12891 0.070312 0.26953 0.10938 0.42188 0.10938 0.12891 0 0.26172-0.03125 0.37891-0.089844 0.25-0.12891 0.42969-0.37109 0.46094-0.64844l1.7383-13.148 15.969 8.1289c0.32812 0.17188 0.75 0.10156 1-0.17188 0.26172-0.26953 0.30859-0.69141 0.12109-1.0117-0.078125-0.12891-7.6719-13.238-9.3594-22.91-1.2891-7.4102-8-16.16-11.648-20.488 5.2891 2.0781 11.34 4.3086 16.43 5.8008 0.60938 0.17969 1.2305 0.26953 1.8398 0.26953 2.6094 0 4.9883-1.6016 6.0703-4.1406 4.25-10.012 2.9688-19.051 2.3281-22.129zm-4.8125-2.75c1.4219 0.51172 2.1992 1.1992 2.5898 1.6797-5.4688 3.5312-21.238 11-35.191 7.3398 20.211-10.73 29.09-10.27 32.602-9.0195zm-82.059 6.4805c0.12109-0.37109 0.94141-1.5781 6.3398-1.6602 8.3516-0.10937 28.961 4.3594 32.551 5.1602 0.03125 0.14062 0.03125 0.28125 0.070312 0.42969 0.10156 0.37891 0.17188 0.73828 0.23828 1.0898-26.648 8.0508-36.531-1.1719-36.629-1.2617-0.03125-0.03125-0.050782-0.050781-0.078126-0.070312-1.1992-0.91016-2.8086-2.7109-2.4883-3.6914zm9.8594 25.102c-2.4883 0.33984-4.9492-0.39844-6.9219-2.0898-2.0703-1.7695-3.2891-4.3281-3.3516-7.0391-0.10156-4.7188 0.070313-9.5391 0.21094-12.48 0.69141 0.78125 1.3906 1.3516 1.6211 1.5312 0.57812 0.55078 5.6992 5.0586 17.801 5.0586 5.3281 0 12.02-0.89062 20.25-3.3516 0.078125 0.67187 0.12891 1.3008 0.17188 1.8516 0.03125 0.42969 0.070312 0.83984 0.10938 1.2305-14.109 11.191-24.039 14.5-29.891 15.289zm12.379 29.77c0.55078-5.4414-0.66016-12.711-0.71875-13.07-0.039062-0.25-0.19922-0.46875-0.42188-0.60156-0.21875-0.12109-0.48828-0.14844-0.73047-0.050782l-12.891 5.0781c1.0586-1.0781 2.25-2.4414 3.5-4.1602 2.4805-3.3906 6.9102-11.969 10.199-18.602 5.8594-2.5703 12.211-6.5312 18.988-11.852 0.23828 0.57031 0.60937 1.0391 1.1914 1.3711-8.9609 28.16-16.039 38.43-19.121 41.871zm19.102-46.43c-0.10156-1.3281-0.23047-2.9805-0.73047-4.9297-0.23047-0.89844-0.16016-1.5703 0.23047-2.0508 0.67188-0.82031 5.7109-0.91016 6.4609 0 0.39062 0.46875 0.46094 1.1406 0.23047 2.0508-0.51172 1.9688-0.62109 3.6289-0.71094 4.9688-0.19141 2.7305-0.23047 3.3789-2.75 3.3789-2.9805 0-2.5781-1.3789-2.7305-3.4219zm28.84 28.82c1.3086 7.5117 5.8906 16.699 8.2109 21.02l-14.559-7.4102c-0.25-0.12891-0.53906-0.12109-0.78125 0-0.23828 0.12891-0.41016 0.37109-0.44922 0.64063l-1.6797 12.73c-1.8516-2.0898-5.5508-8.0391-6.5703-22.781-1.2188-17.738-5.8516-26.328-7.3086-28.629 0.48828-0.35156 0.80859-0.80859 1.0117-1.3711 1.4883 0.64062 4.6914 2.0117 8.6484 3.6094 1.2188 1.3203 11.879 13.102 13.469 22.172zm12.789-19.5c-0.94141 2.3516-3.4609 3.5781-5.8594 2.8789-10.641-3.1211-25.602-9.5195-28.699-10.859 0.039063-0.37891 0.070313-0.76953 0.10156-1.1797 0.078125-1.1992 0.19141-2.6914 0.60938-4.3984 2.7305 0.71094 5.5117 1.0312 8.2812 1.0312 11.719 0 23.078-5.3984 27.879-8.4102 1.8203 7.9219-0.21094 15.711-2.3086 20.941z"/></svg>',
    soda: '<svg class="acc-svg" viewBox="18.2 -1.5 63.5 102.6" aria-hidden="true" focusable="false"><path style="fill:var(--bg)" d="M75.00 14.00C74.71 -0.49 25.28 -0.47 25.00 14.00C25.82 19.63 22.22 23.09 20.84 27.75C19.86 27.45 20.48 67.09 20.32 68.53L20.32 77.62C20.42 78.79 20.01 81.88 20.75 82.93C21.11 83.62 21.88 84.37 22.57 84.86C23.60 85.70 23.51 86.86 23.41 87.34C21.15 100.13 77.02 99.62 76.74 88.25C76.69 87.11 76.08 86.05 77.41 84.88C78.62 84.02 79.71 82.76 79.69 81.27C79.66 77.32 79.71 42.50 79.69 37.62C79.75 32.96 80.07 27.30 77.20 23.28C76.29 21.86 74.32 17.54 75.00 14.00Z"/><path fill="currentColor" fill-rule="evenodd" d="m75.004 14.004c-0.29297-14.492-49.723-14.477-50 0 0.8125 5.6289-2.7812 9.0898-4.1641 13.746-0.98438-0.29688-0.36328 39.344-0.52344 40.777v9.0898c0.10547 1.1719-0.30469 4.2617 0.4375 5.3125 0.35547 0.69141 1.1211 1.4414 1.8164 1.9258 1.0273 0.84375 0.94141 2.0078 0.83594 2.4883-2.2578 12.789 53.613 12.273 53.332 0.90625-0.046875-1.1406-0.65625-2.2031 0.67188-3.3672 1.207-0.86719 2.3047-2.125 2.2812-3.6172-0.03125-3.9414 0.023438-38.77 0-43.645 0.054688-4.6641 0.38281-10.32-2.4961-14.336-0.91016-1.4258-2.8789-5.7461-2.1914-9.2852zm-25-7.8125c18.23-0.042968 30.781 8.5 13.641 13.816-7.668 2.4023-19.609 2.3984-27.281 0-17.125-5.3203-4.5977-13.859 13.641-13.816zm-24.598 18.828c1.0781-1.7148 1.8633-3.6758 2.3516-5.8555 10.074 7.793 34.34 7.7891 44.453 0.039063 0.875 4.125 2.5273 5.3828 3.6836 8.5469-9.1367 6.1406-42.625 6.1719-51.789-0.007812 0.31641-0.9375 0.75391-1.8477 1.3047-2.7227zm24.598 68.672c-15.277 0-23.609-3.5938-23.586-5.5117 0.10547-0.46484 0.16016-0.92969 0.16406-1.3789 7.5078 2.4414 15.547 2.9531 23.422 3.0312 7.8789-0.078125 15.918-0.58984 23.422-3.0312 0.003907 0.45312 0.054688 0.91406 0.16406 1.3789 0.023437 1.918-8.3086 5.5117-23.586 5.5117zm26.543-12.344c-8.4492 7.5234-43.285 6.7344-52.449 0.75-0.29297-0.23438-0.62109-0.61719-0.65234-0.79688-0.007812-0.035156-0.007812-2.0352-0.007812-2.0352 4.6797 0.097656 9.3125-0.97266 13.523-3 2.2344-0.98828 4.3477-1.9258 6.5625-2.0938 3.3867-0.26953 7.0078 1.3828 10.402 2.3984 7.3477 2.1914 15.297 2.0391 22.629-0.14844l-0.015626 4.9258zm0.019531-8.2383c-6.9102 2.3438-14.551 2.5625-21.559 0.51562-3.8438-1.125-7.5273-2.8711-11.715-2.5664-2.7539 0.20703-5.2109 1.2969-7.5898 2.3516-3.8125 1.8203-8.0156 2.8867-12.262 2.6914v-6.4883c4.0859-1.6367 7.8281-4.125 10.832-7.3555 2.8438-2.9648 4.75-7.0547 7.8164-9.6523 3.5234-2.9531 8.5664-3.7617 12.562-4.1328 7.6328-0.48438 16.102-1.0664 21.91-6.793v31.426zm0-36.031c-9.1406 12.383-25.242 4.1836-36.484 13.137-2.9258 2.4492-4.6758 5.7461-6.9727 8.6172-2.5859 3.1758-5.9219 5.7109-9.668 7.3789v-34.473c0-0.23047 0.007813-0.45703 0.019532-0.68359 11.734 5.9414 41.32 5.9531 53.086-0.003907 0.039063 0.30078 0.011719 5.5742 0.019531 6.0234z"/><path fill="currentColor" fill-rule="evenodd" d="m53.129 18.691h7.8125c2.5859 0 4.6875-2.1016 4.6875-4.6875 0-2.5859-2.1016-4.6875-4.6875-4.6875h-7.8125c-6.1797 0.16016-6.1836 9.2148 0 9.375zm0-6.25h7.8125c0.86328 0 1.5625 0.69922 1.5625 1.5625 0 0.86328-0.69922 1.5625-1.5625 1.5625h-7.8125c-2.0508-0.035156-2.0547-3.0898 0-3.125z"/><path fill="currentColor" fill-rule="evenodd" d="m32.816 39.004c-8.2617 0.26172-8.2578 12.238 0 12.5 8.2617-0.26172 8.2578-12.238 0-12.5zm0 9.375c-4.1211-0.10938-4.1211-6.1406 0-6.25 4.1211 0.10938 4.1211 6.1406 0 6.25z"/><path fill="currentColor" fill-rule="evenodd" d="m57.816 71.816c6.1797-0.16016 6.1797-9.2148 0-9.375-6.1797 0.16016-6.1797 9.2148 0 9.375zm0-6.25c2.0547 0.035156 2.0547 3.0898 0 3.125-2.0547-0.035156-2.0547-3.0898 0-3.125z"/><path fill="currentColor" fill-rule="evenodd" d="m75.004 56.191c-0.36719-10.34-15.258-10.336-15.625 0 0.36719 10.34 15.258 10.336 15.625 0zm-7.8125-4.6875c6.1797 0.16016 6.1797 9.2148 0 9.375-6.1797-0.16016-6.1797-9.2148 0-9.375z"/><path fill="currentColor" fill-rule="evenodd" d="m45.316 56.191c-8.2617 0.26172-8.2578 12.238 0 12.5 8.2617-0.26172 8.2578-12.238 0-12.5zm0 9.375c-4.1211-0.10938-4.1211-6.1406 0-6.25 4.1211 0.10938 4.1211 6.1406 0 6.25z"/><path fill="currentColor" fill-rule="evenodd" d="m43.754 74.941c-6.1797 0.16016-6.1797 9.2148 0 9.375 6.1797-0.16016 6.1797-9.2148 0-9.375zm0 6.25c-2.0547-0.035156-2.0547-3.0898 0-3.125 2.0547 0.035156 2.0547 3.0898 0 3.125z"/></svg>',
  };
  const CHEESE = '<svg class="cheese-svg" viewBox="2 12 94 84" aria-hidden="true" focusable="false"><polygon style="fill:#f8d34a" points="10,41 36,18 93,41.5 93,91 10,91"/><g fill="currentColor" fill-rule="evenodd"><path d="m73.438 71.875c2.5898 0 4.6875 2.0977 4.6875 4.6875s-2.0977 4.6875-4.6875 4.6875-4.6875-2.0977-4.6875-4.6875 2.0977-4.6875 4.6875-4.6875zm0 3.125c-0.86328 0-1.5625 0.69922-1.5625 1.5625s0.69922 1.5625 1.5625 1.5625 1.5625-0.69922 1.5625-1.5625-0.69922-1.5625-1.5625-1.5625z"/><path d="m50 62.5c3.4531 0 6.25 2.7969 6.25 6.25s-2.7969 6.25-6.25 6.25-6.25-2.7969-6.25-6.25 2.7969-6.25 6.25-6.25zm0 3.125c-1.7266 0-3.125 1.3984-3.125 3.125s1.3984 3.125 3.125 3.125 3.125-1.3984 3.125-3.125-1.3984-3.125-3.125-3.125z"/><path d="m23.438 43.75c5.1758 0 9.375 4.1992 9.375 9.375s-4.1992 9.375-9.375 9.375-9.375-4.1992-9.375-9.375 4.1992-9.375 9.375-9.375zm0 3.125c-3.4531 0-6.25 2.7969-6.25 6.25s2.7969 6.25 6.25 6.25 6.25-2.7969 6.25-6.25-2.7969-6.25-6.25-6.25z"/><path d="m70.312 45.312c4.3164 0 7.8125 3.4961 7.8125 7.8125s-3.4961 7.8125-7.8125 7.8125-7.8125-3.4961-7.8125-7.8125 3.4961-7.8125 7.8125-7.8125zm0 3.125c-2.5898 0-4.6875 2.0977-4.6875 4.6875s2.0977 4.6875 4.6875 4.6875 4.6875-2.0977 4.6875-4.6875-2.0977-4.6875-4.6875-4.6875z"/><path d="m37.5 20.312c2.5898 0 4.6875 2.0977 4.6875 4.6875s-2.0977 4.6875-4.6875 4.6875-4.6875-2.0977-4.6875-4.6875 2.0977-4.6875 4.6875-4.6875zm0 3.125c-0.86328 0-1.5625 0.69922-1.5625 1.5625s0.69922 1.5625 1.5625 1.5625 1.5625-0.69922 1.5625-1.5625-0.69922-1.5625-1.5625-1.5625z"/><path d="m56.859 22.309c-0.38672 0.61719-0.60938 1.3477-0.60938 2.1367 0 2.2031 1.75 3.9922 3.9062 3.9922 1.8594 0 3.4102-1.3281 3.8047-3.1055l29.789 12.688v17.57c-3.4531 0-6.25 2.8594-6.25 6.3867 0 3.5312 2.7969 6.3906 6.25 6.3906v14.445l-0.015625 0.32031c-0.15234 1.4688-1.3203 2.6406-2.7891 2.7891l-0.32031 0.015625h-57.812c0-4.2734-3.2812-7.7617-7.4102-7.9766l-0.40234-0.011719c-4.3164 0-7.8125 3.5781-7.8125 7.9883h-7.8125l-0.32031-0.015625c-1.4688-0.14844-2.6367-1.3203-2.7891-2.7891l-0.015625-0.32031v-44.793c7.1289-10.41 17.137-18.406 28.738-22.969l2.5117-0.98828zm-47.484 18.906v41.598h5.1328c1.3203-4.582 5.4766-7.9883 10.492-7.9883s9.1719 3.4062 10.492 7.9883h55.133v-11.863c-3.668-1.3125-6.25-4.8711-6.25-8.9727 0-4.0977 2.582-7.6602 6.25-8.9727v-11.789zm26.758-23.258c-10.352 4.0703-19.367 11.023-26.047 20.062h26.297c0.375-1.2148 0.97656-2.3438 1.7773-3.3086l0.29688-0.33594c1.6094-1.7578 3.7969-2.7461 6.0742-2.7461s4.4648 0.98828 6.0742 2.7461c0.94922 1.0352 1.6523 2.2852 2.0703 3.6445h33.102l-20.484-8.7227c-1.2695 1.3828-3.0859 2.2656-5.1367 2.2656-3.9492 0-7.0312-3.2539-7.0312-7.1172 0-0.10937 0.003906-0.21875 0.011719-0.32812l-15.684-6.6797zm8.3984 16.797c-1.3594 0-2.7227 0.58594-3.7734 1.7344-0.375 0.41016-0.69531 0.87891-0.95703 1.3906h9.4609c-0.26172-0.51172-0.58203-0.98047-0.95703-1.3906-1.0508-1.1484-2.4141-1.7344-3.7734-1.7344z"/></g></svg>';
  const ITEMS = [
    { id: "bg-dots",     group: "backgrounds",   name: "faint dots",     desc: "a soft dotted page",                  price: 500,   kind: "bg", value: "dots" },
    { id: "bg-grid",     group: "backgrounds",   name: "grid paper",     desc: "notebook grid lines",                 price: 500,   kind: "bg", value: "grid" },
    { id: "bg-stars",    group: "backgrounds",   name: "star background", desc: "tiny stars scattered around",        price: 750,   kind: "bg", value: "stars" },
    { id: "bg-hearts",   group: "backgrounds",   name: "hearts background", desc: "tiny hearts scattered around",     price: 750,   kind: "bg", value: "hearts" },
    { id: "bg-rain",     group: "backgrounds",   name: "raindrops background", desc: "tiny raindrops scattered around", price: 750, kind: "bg", value: "rain" },
    { id: "cur-sparkle", group: "cursor trails", name: "sparkle trail",  desc: "stars follow your cursor",            price: 2000,  kind: "cursor", value: "sparkle", desktop: true },
    { id: "cur-heart",   group: "cursor trails", name: "heart trail",    desc: "hearts follow your cursor",           price: 1500,  kind: "cursor", value: "heart", desktop: true },
    { id: "ptr-y2k",     group: "cursors",       name: "y2k cursor",     desc: "a retro pixel pointer for your mouse", price: 3000,  kind: "pointer", value: "y2k", short: "y2k", desktop: true },
    { id: "tap-sparkle", group: "tap",           name: "tap sparkles",   desc: "stars pop where you tap or click",    price: 2500,  kind: "tap", value: "sparkle" },
    { id: "tap-heart",   group: "tap",           name: "tap hearts",     desc: "hearts pop where you tap or click",   price: 2500,  kind: "tap", value: "heart" },
    { id: "tap-petal",   group: "tap",           name: "flower petal tap", desc: "pink petals drift where you tap or click", price: 2500, kind: "tap", value: "petal", short: "petals" },
    { id: "tap-bubble",  group: "tap",           name: "bubble tap",     desc: "bubbles float up where you tap or click", price: 2500, kind: "tap", value: "bubble", short: "bubbles" },
    { id: "tap-ghost",   group: "tap",           name: "ghost tap (halloween exclusive)", desc: "little ghosts float up where you tap or click. gone after october 31!", price: 3000, kind: "tap", value: "ghost", short: "ghosts", until: "2026-10-31" },
    { id: "tap-yb",      group: "tap",           name: "yeonbucks tap",  desc: "+1 yeonbucks for every tap or click on the site", price: 10000, kind: "tap", value: "yb", short: "yeonbucks" },
    { id: "acc-pink",     group: "accents",      name: "light pink",     desc: "a soft pink tint over the site",      price: 2500,  kind: "accent", value: "pink" },
    { id: "acc-blue",     group: "accents",      name: "blue",           desc: "a cool blue tint over the site",      price: 2500,  kind: "accent", value: "blue" },
    { id: "acc-green",    group: "accents",      name: "neon green",     desc: "a fresh green tint over the site",    price: 2500,  kind: "accent", value: "green" },
    { id: "acc-lavender", group: "accents",      name: "lavender",       desc: "a dreamy purple tint over the site",  price: 2500,  kind: "accent", value: "lavender" },
    { id: "boost",      group: "boosts",       name: "earn boost",      desc: "+75 every 30 seconds instead of +50", price: 10000, kind: "perk", tag: "+75" },
    { id: "boost2",     group: "boosts",       name: "super earn boost", desc: "+100 every 30 seconds instead of +50", price: 35000, kind: "perk", tag: "+100" },
    { id: "charm",      group: "boosts",       name: "lucky charm",     desc: "+5% chance of the casino jackpot",    price: 20000, kind: "perk", tag: "+5%" },
    { id: "bonus",      group: "boosts",       name: "prize bonus",     desc: "+10% on every game prize",            price: 20000, kind: "perk", tag: "+10%" },
    { id: "pet-dog",     group: "pets",          name: "dog",            desc: "a little buddy for the corner of your screen", price: 25000, kind: "pet", value: "dog" },
    { id: "pet-cat",     group: "pets",          name: "cat",            desc: "a little buddy for the corner of your screen", price: 25000, kind: "pet", value: "cat" },
    { id: "pet-bunny",   group: "pets",          name: "bunny",          desc: "a little buddy for the corner of your screen", price: 25000, kind: "pet", value: "bunny" },
    { id: "key",         group: "secret",        name: "secret room key", desc: "opens the secret room at the back of the fair", price: 50000, kind: "perk", tag: "?" },
    // rare: true = sold in the rare items shop (secret room), not the prize shop. koala, frog and panda are also wheel prizes.
    // soon: true on a "kind: soon" item keeps it on the shelf as "coming soon" (the rat is on its way).
    { id: "pet-koala",    group: "pets", name: "koala",    desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "koala", rare: true },
    { id: "pet-frog",     group: "pets", name: "frog",     desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "frog", rare: true },
    { id: "pet-panda",    group: "pets", name: "panda",    desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "panda", rare: true },
    { id: "pet-fish",     group: "pets", name: "fish",     desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "fish", rare: true },
    { id: "pet-chicken",  group: "pets", name: "chicken",  desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "chicken", rare: true },
    { id: "pet-elephant", group: "pets", name: "elephant", desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "elephant", rare: true },
    { id: "pet-goat",     group: "pets", name: "goat",     desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "goat", rare: true },
    { id: "pet-hamster",  group: "pets", name: "hamster",  desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "hamster", rare: true },
    { id: "pet-hedgehog", group: "pets", name: "hedgehog", desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "hedgehog", rare: true },
    { id: "pet-mouse",    group: "pets", name: "mouse",    desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "mouse", rare: true },
    { id: "pet-turtle",   group: "pets", name: "turtle",   desc: "a rare little buddy for the corner of your screen", price: RARE_PRICE, kind: "pet", value: "turtle", rare: true },
    // pinned: true = always on the rare shelf (first), the rest rotate. The rat is the interactive pet: clicking her opens her panel (remy.js).
    { id: "pet-rat",      group: "pets", name: "exclusive remy tomodachi", short: "remy", desc: "feed her, dress her up... battle?", price: 100000, kind: "pet", value: "rat", rare: true, pinned: true },
    // lost: true = never sold anywhere, only found in the secret room's LOST AND FOUND (see lostfound.js, which has the list of finds and how likely each is)
    { id: "tap-cheese",  group: "tap",           name: "cheese tap",     desc: "little cheese wedges pop where you tap or click", price: 0, kind: "tap", value: "cheese", short: "cheese", lost: true },
    { id: "cur-cheese",  group: "cursor trails", name: "cheese trail",   desc: "cheese follows your cursor",          price: 0, kind: "cursor", value: "cheese", short: "cheese trail", desktop: true, lost: true },
    { id: "cur-rainbow", group: "cursor trails", name: "rainbow trail",  desc: "rainbow stars follow your cursor",    price: 0, kind: "cursor", value: "rainbow", short: "rainbow trail", desktop: true, lost: true },
    // kind "acc" = an accessory your pet wears (one at a time). The pictures are ACC_ART above, the CSS is in style.css (search "pet-acc").
    { id: "wear-hat",    group: "accessories",   name: "witch hat",      desc: "a pointy hat for your pet",           price: 0, kind: "acc", value: "hat", short: "witch hat", lost: true },
    { id: "wear-bow",    group: "accessories",   name: "bow",            desc: "a cute bow for your pet",             price: 0, kind: "acc", value: "bow", lost: true },
    { id: "wear-soda",   group: "accessories",   name: "soda",           desc: "a cold soda for your pet",            price: 0, kind: "acc", value: "soda", lost: true },
    // wheel: true = never sold in a shop, only won on the secret room's wheel (it still shows up in the inventory once you have it)
    { id: "tap-rainbow", group: "tap",           name: "rainbow sparkle tap", desc: "rainbow stars pop where you tap or click", price: 0, kind: "tap", value: "rainbow", wheel: true },
  ];
  // until: "2026-10-31" = sold up to and including that day (this computer's date), then it comes off the shelf.
  // Anyone who already bought it keeps it (it stays in their inventory).
  const localDay = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const inSeason = (i) => !i.until || localDay() <= i.until;
  const SHOP_ALL = ITEMS.filter((i) => !i.wheel && !i.rare && !i.daily && !i.lost);
  const shopList = () => SHOP_ALL.filter(inSeason);                          // what the prize shop sells today

  // ----- what's owned / switched on (saved in this browser) -----
  function load(k, fallback) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  let own = load("yb-own", []);
  let eq = load("yb-eq", { cursor: "", bg: "", pet: "", accent: "", tap: "", pointer: "", acc: "" });
  const EQKEY = { cursor: "cursor", bg: "bg", pet: "pet", accent: "accent", tap: "tap", pointer: "pointer", acc: "acc" };   // which slot each kind of item goes in
  let petNames = load("yb-petnames", {});                       // each pet has its own name
  if (!petNames.dog && load("yb-petname", "")) petNames.dog = load("yb-petname", "");   // (an older single name, if there was one)
  const PETS = ["dog", "cat", "bunny", "koala", "frog", "panda", "fish", "chicken", "elephant", "goat", "hamster", "hedgehog", "mouse", "turtle", "rat"];
  const nameOf = (kind) => kind === "rat" ? "remy" : petNames[kind] || ({ cat: "kitty", bunny: "bun", koala: "koko", frog: "froggy", panda: "bao", fish: "bubbles", chicken: "peep", elephant: "ellie", goat: "billy", hamster: "hammy", hedgehog: "spike", mouse: "mimi", turtle: "shelly", rat: "remy" }[kind] || "buddy");
  const owns = (id) => own.indexOf(id) !== -1;
  const find = (id) => ITEMS.filter((i) => i.id === id)[0];
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ----- the backgrounds -----
  function applyLook() {
    const root = document.documentElement;
    if (eq.bg) root.dataset.bg = eq.bg; else delete root.dataset.bg;
    if (eq.accent) root.dataset.accent = eq.accent; else delete root.dataset.accent;
    if (eq.pointer) root.dataset.pointer = eq.pointer; else delete root.dataset.pointer;
    const pet = document.getElementById("pet");
    if (pet) {
      pet.hidden = PETS.indexOf(eq.pet) === -1; pet.dataset.kind = eq.pet || "";
      const btn = pet.querySelector(".pet-btn");
      let body = btn && btn.querySelector(".pet-body");              // the pet's drawings and its accessory live in one "body", so they bob and hop as one thing
      if (btn && !body) {
        body = document.createElement("span"); body.className = "pet-body";
        btn.querySelectorAll(".pet-art").forEach((a) => body.appendChild(a));
        btn.appendChild(body);
      }
      let acc = body && body.querySelector(".pet-acc");
      const wearing = eq.acc && ACC_ART[eq.acc] && owns("wear-" + eq.acc) ? eq.acc : "";
      pet.dataset.acc = wearing;                                       // (so the css knows what it's wearing: the speech bubble goes higher over a hat)
      if (body && wearing) {
        if (!acc) { acc = document.createElement("span"); acc.className = "pet-acc"; body.appendChild(acc); }
        if (acc.dataset.acc !== wearing) { acc.dataset.acc = wearing; acc.innerHTML = ACC_ART[wearing]; }
      } else if (acc) acc.remove();
    }
    if (window.SR) window.SR.sync();                           // (the secret room's menu button and door)
  }

  // ----- the shop page -----
  let msgTimer = null;
  function say(t) {                                              // (the prize shop and the rare items shop each have a .shop-msg line)
    const lines = document.querySelectorAll(".shop-msg");
    lines.forEach((m) => { m.textContent = t; });
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { lines.forEach((m) => { m.textContent = ""; }); }, 3500);
  }
  const have = () => (window.YB ? window.YB.have() : 0);

  function isOn(item) { return EQKEY[item.kind] ? (eq[EQKEY[item.kind]] || "") === item.value : false; }

  function label(item) {
    if (item.kind === "soon") return { text: "coming soon", disabled: true };
    if (!owns(item.id)) return { text: "buy", disabled: have() < item.price };
    if (item.kind === "perk") return { text: "owned", disabled: true };
    if (item.value === "rat" && isOn(item)) return { text: "play time", disabled: false };   // the rat opens her panel instead of "turn off" (turn her off in the inventory)
    return { text: isOn(item) ? "turn off" : "turn on", disabled: false };
  }

  function preview(item) {
    if (item.kind === "bg") return '<span class="shop-prev" data-p="' + item.value + '"></span>';
    if (item.kind === "accent") return '<span class="shop-prev shop-prev-accent" data-a="' + item.value + '"></span>';
    if (item.kind === "tap") {
      const PV = { heart: "\u2665 \u2665 \u2665", petal: "\u273F \u2740 \u273F", bubble: "\u25CB \u25EF \u25CB", ghost: GHOSTS[0] + GHOSTS[1] + GHOSTS[0], yb: "+1 +1 +1" };
      return '<span class="shop-prev shop-prev-glyph" data-g="' + item.value + '">' + (PV[item.value] || "\u2726 \u2727 \u2726") + "</span>";
    }
    if (item.kind === "pointer") return '<span class="shop-prev shop-prev-ptr"><img src="cursors/' + item.value + '-preview.png" alt=""></span>';
    if (item.kind === "cursor") return '<span class="shop-prev shop-prev-glyph" data-g="' + item.value + '">' + (item.value === "heart" ? "♥ ♥ ♥" : "✦ ✧ ✦") + "</span>";
    if (item.kind === "pet") { const a = document.querySelector('#pet .pet-art[data-pet="' + item.value + '"] .pet-a'); return '<span class="shop-prev shop-prev-pet">' + (a ? a.outerHTML : "") + "</span>"; }
    if (item.kind === "soon") return '<span class="shop-prev shop-prev-glyph">?</span>';
    return '<span class="shop-prev shop-prev-glyph">' + (item.tag || "") + "</span>";
  }

  // a "shelf" is one shop's grid of cards. It shows 9 at a time (3 x 3), or 6 on a phone, with arrows to the other pages.
  // list() says what's on it right now. The prize shop and the rare items shop each have one.
  const phone = window.matchMedia ? window.matchMedia("(max-width: 40rem)") : { matches: false };
  const perPage = () => (phone.matches ? 6 : 9);
  function makeShelf(box, list) {
    let page = 0;
    function build() {
      if (!box) return;
      const items = list();
      const pages = Math.max(1, Math.ceil(items.length / perPage()));
      page = Math.min(Math.max(page, 0), pages - 1);
      box.innerHTML = "";
      const grid = document.createElement("div");   // everything in one set of rows
      grid.className = "shop-grid";
      box.appendChild(grid);
      items.slice(page * perPage(), page * perPage() + perPage()).forEach((item) => {
        const card = document.createElement("div");
        card.className = "shop-item";
        card.dataset.id = item.id;
        card.innerHTML = preview(item) +
          '<span class="shop-name"></span><span class="shop-desc"></span><span class="shop-price"></span>' +
          '<button type="button" class="hy-btn shop-buy"></button>';
        card.querySelector(".shop-name").textContent = item.name;
        if (item.desktop) {                                          // "(desktop only)" under the name
          const note = document.createElement("small");
          note.className = "shop-note";
          note.textContent = "(desktop only)";
          card.querySelector(".shop-name").appendChild(note);
        }
        card.querySelector(".shop-desc").textContent = item.desc;
        card.querySelector(".shop-price").textContent = item.kind === "soon" ? "? yeonbucks" : fmt(item.price) + " yeonbucks";
        card.querySelector(".shop-buy").addEventListener("click", () => act(item));
        grid.appendChild(card);
      });
      if (pages > 1) {                                // the arrows
        const nav = document.createElement("div");
        nav.className = "shop-pager";
        const prev = document.createElement("button");
        prev.type = "button"; prev.className = "hy-btn shop-arrow"; prev.textContent = "\u2190"; prev.setAttribute("aria-label", "previous page");
        prev.disabled = page === 0;
        prev.addEventListener("click", () => { page--; build(); });
        const next = document.createElement("button");
        next.type = "button"; next.className = "hy-btn shop-arrow"; next.textContent = "\u2192"; next.setAttribute("aria-label", "next page");
        next.disabled = page === pages - 1;
        next.addEventListener("click", () => { page++; build(); });
        const lab = document.createElement("span");
        lab.className = "shop-page";
        lab.textContent = (page + 1) + " / " + pages;
        nav.appendChild(prev); nav.appendChild(lab); nav.appendChild(next);
        box.appendChild(nav);
      }
      update();
    }
    function update() {
      if (!box) return;
      box.querySelectorAll(".shop-item").forEach((card) => {
        const item = find(card.dataset.id);
        const l = label(item);
        const b = card.querySelector(".shop-buy");
        b.textContent = l.text;
        b.disabled = l.disabled;
        card.classList.toggle("is-owned", owns(item.id));
        card.classList.toggle("is-on", isOn(item));
        card.classList.toggle("is-short", !owns(item.id) && item.kind !== "soon" && have() < item.price);
      });
    }
    return { build: build, update: update };
  }
  const prizeShelf = makeShelf(document.getElementById("shop-items"), shopList);

  // ----- THE RARE ITEMS SHOP (the secret room, room 4) -----
  // Same look as the prize shop. It only stocks RARE_SLOTS things at a time and the stock changes every other day,
  // the same for every visitor (it's worked out from the date, nothing is saved). Items marked pinned: true (the rat) are
  // always on the shelf, and the rest of the spots are picked at random from everything else marked rare: true in ITEMS.
  const RARE_SLOTS = 4;
  const dayNumber = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };   // today, counted in the visitor's own time zone
  const stockWindow = () => Math.floor(dayNumber() / 2) + (parseInt(localStorage.getItem("yb-rare-shift"), 10) || 0);   // (the shift is only used by test mode)
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rareStock() {
    const rare = ITEMS.filter((i) => i.rare);
    const pinned = rare.filter((i) => i.pinned);                 // always there, first
    const pool = rare.filter((i) => !i.pinned && i.kind !== "soon");
    const rand = rng(stockWindow() * 2654435761 + 12345);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pinned.concat(pool.slice(0, Math.max(0, RARE_SLOTS - pinned.length)));
  }
  let rareShown = -1;
  const rareShelf = makeShelf(document.getElementById("rare-items"), rareStock);
  const restockEl = document.getElementById("rare-restock");
  function restockText() {
    const d = new Date();
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (2 - (dayNumber() % 2)));   // the next even day's midnight
    const mins = Math.max(1, Math.ceil((next - d) / 60000));
    const days = Math.floor(mins / 1440), hrs = Math.floor((mins % 1440) / 60), m = mins % 60;
    return "new stock in " + (days ? days + " day " : "") + (hrs ? hrs + " hr " : "") + (days ? "" : m + " min");
  }
  function rareTick() {                                          // rebuild when the stock changes, keep the timer fresh
    if (rareShown !== stockWindow()) { rareShown = stockWindow(); rareShelf.build(); }
    if (restockEl) restockEl.textContent = restockText().trim();
  }
  function build() { prizeShelf.build(); rareShelf.build(); rareShown = stockWindow(); if (restockEl) restockEl.textContent = restockText().trim(); }
  function update() { prizeShelf.update(); rareShelf.update(); }
  window.addEventListener("storage", (e) => { if (e.key === "yb-rare-shift") rareTick(); });
  if (phone.addEventListener) phone.addEventListener("change", build);

  function act(item) {
    if (item.kind === "soon") return;
    if (!owns(item.id)) {
      if (!window.YB || !window.YB.spend(item.price)) { say("not enough yeonbucks yet!"); update(); return; }
      own.push(item.id);
      save("yb-own", own);
      if (EQKEY[item.kind]) eq[EQKEY[item.kind]] = item.value;     // switch it on right away
      save("yb-eq", eq);
      const nm = /^the /.test(item.name) ? item.name : "the " + item.name;
      say(item.kind === "pet" ? "you got " + nm + "! give it a name in your inventory." : "you got " + nm + "!");
    } else if (item.value === "rat" && isOn(item) && window.Remy) {
      window.Remy.open(); return;
    } else if (EQKEY[item.kind]) {
      eq[EQKEY[item.kind]] = isOn(item) ? "" : item.value;
      save("yb-eq", eq);
    }
    applyLook();
    if (window.YB) window.YB.redraw();
    update();
  }

  // another tab changed something: catch up
  window.addEventListener("storage", (e) => {
    if (e.key === "yb-own" || e.key === "yb-eq" || e.key === null) {
      own = load("yb-own", []);
      eq = load("yb-eq", { cursor: "", bg: "", pet: "", accent: "", tap: "", pointer: "", acc: "" });
      petNames = load("yb-petnames", {});
      applyLook();
      update();
    }
  });
  setInterval(() => { update(); rareTick(); }, 1000);   // so "buy" lights up as soon as you can afford it

  // ----- the inventory pop-up (from the shop page or the bottom-left box): choose what's switched on -----
  const invEl = document.getElementById("inv"), invBody = document.getElementById("inv-body");
  let invFrom = null;
  function pick(kind, value) {
    eq[EQKEY[kind]] = value;
    save("yb-eq", eq);
    applyLook();
    update();
    drawInv();
  }
  function group(title, kind, none) {
    const owned = ITEMS.filter((i) => i.kind === kind && owns(i.id));
    const wrap = document.createElement("div");
    wrap.className = "inv-group";
    const h = document.createElement("h3");
    h.textContent = title;
    wrap.appendChild(h);
    if (!owned.length) {
      const p = document.createElement("p");
      p.className = "inv-empty";
      p.textContent = kind === "acc" ? "nothing yet. look in the lost and found!" : "nothing yet. find some in the prize shop!";
      wrap.appendChild(p);
      return wrap;
    }
    const row = document.createElement("div");
    row.className = "inv-opts";
    [{ name: none, value: "" }].concat(owned.map((i) => ({ name: i.short || i.name, value: i.value }))).forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "inv-opt";
      const on = (eq[EQKEY[kind]] || "") === o.value;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = o.name;
      b.addEventListener("click", () => pick(kind, o.value));
      row.appendChild(b);
    });
    wrap.appendChild(row);
    return wrap;
  }
  function drawInv() {
    if (!invBody) return;
    invBody.innerHTML = "";
    invBody.appendChild(group("cursor trail (desktop only)", "cursor", "no trail"));
    invBody.appendChild(group("mouse pointer (desktop only)", "pointer", "default"));
    invBody.appendChild(group("background", "bg", "plain"));
    invBody.appendChild(group("color accent", "accent", "none"));
    invBody.appendChild(group("tap effect", "tap", "none"));
    const pets = group("pet", "pet", "no pet");
    const kind = eq.pet;                                     // the name box is for the pet that's out
    if (PETS.indexOf(kind) !== -1 && kind !== "rat" && owns("pet-" + kind)) {   // (remy keeps her name: no name box)
      const lab = document.createElement("label");
      lab.className = "inv-name";
      lab.textContent = "name ";
      const inp = document.createElement("input");
      inp.type = "text"; inp.maxLength = 16; inp.placeholder = nameOf(kind); inp.autocomplete = "off";
      inp.value = petNames[kind] || "";
      inp.addEventListener("input", () => { petNames[kind] = inp.value.trim().slice(0, 16); save("yb-petnames", petNames); });
      lab.appendChild(inp);
      pets.appendChild(lab);
    }
    if (owns("pet-rat") && window.Remy) {                    // the rat has her own panel
      const play = document.createElement("button");
      play.type = "button"; play.className = "hy-btn inv-play";
      play.textContent = "play with " + nameOf("rat");
      play.addEventListener("click", () => { closeInv(false); window.Remy.open(); });
      pets.appendChild(play);
    }
    invBody.appendChild(pets);
    invBody.appendChild(group("pet accessory", "acc", "none"));
    const perks = ITEMS.filter((i) => i.kind === "perk" && owns(i.id));
    const wrap = document.createElement("div");
    wrap.className = "inv-group";
    const h = document.createElement("h3");
    h.textContent = "boosts (always on)";
    wrap.appendChild(h);
    const p = document.createElement("p");
    p.className = perks.length ? "inv-perks" : "inv-empty";
    p.textContent = perks.length ? perks.map((i) => i.name).join(", ") : "nothing yet.";
    wrap.appendChild(p);
    invBody.appendChild(wrap);
    const found = window.YBItems ? window.YBItems.summary() : [];          // timed boosts and 1-use items from the lost and found (lostfound.js)
    if (found.length) {
      const fw = document.createElement("div");
      fw.className = "inv-group";
      const fh = document.createElement("h3");
      fh.textContent = "found items";
      fw.appendChild(fh);
      found.forEach((line) => { const fp = document.createElement("p"); fp.className = "inv-perks"; fp.textContent = line; fw.appendChild(fp); });
      invBody.appendChild(fw);
    }
    const go = document.createElement("a");
    go.href = "#shop";
    go.className = "inv-shoplink";
    go.textContent = "go to the prize shop";
    go.addEventListener("click", () => closeInv(false));
    invBody.appendChild(go);
  }
  function openInv(from) {
    if (!invEl) return;
    invFrom = from || null;
    drawInv();
    invEl.hidden = false;
    const c = document.getElementById("inv-close");
    if (c) c.focus();
  }
  function closeInv(restore) {
    if (!invEl || invEl.hidden) return;
    invEl.hidden = true;
    if (restore !== false && invFrom && document.contains(invFrom)) invFrom.focus();
    invFrom = null;
  }
  document.querySelectorAll("[data-inv-open]").forEach((b) => b.addEventListener("click", () => openInv(b)));
  if (invEl) {
    document.getElementById("inv-close").addEventListener("click", () => closeInv());
    invEl.addEventListener("click", (e) => { if (e.target === invEl) closeInv(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeInv(); });
    window.addEventListener("hashchange", () => closeInv(false));
  }
  window.addEventListener("storage", () => { if (invEl && !invEl.hidden) drawInv(); });

  // ----- the "how it works" pop-up (from the bottom-left box or the shop page) -----
  const howEl = document.getElementById("how");
  let howFrom = null;
  function openHow(from) {
    if (!howEl) return;
    howFrom = from || null;
    if (window.YB) window.YB.redraw();                       // so the "+50" in the text is right
    howEl.hidden = false;
    const c = document.getElementById("how-close");
    if (c) c.focus();
  }
  function closeHow(restore) {
    if (!howEl || howEl.hidden) return;
    howEl.hidden = true;
    if (restore !== false && howFrom && document.contains(howFrom)) howFrom.focus();
    howFrom = null;
  }
  document.querySelectorAll("[data-how-open]").forEach((b) => b.addEventListener("click", () => openHow(b)));
  if (howEl) {
    document.getElementById("how-close").addEventListener("click", () => closeHow());
    howEl.addEventListener("click", (e) => { if (e.target === howEl || e.target.closest(".how-links a")) closeHow(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHow(); });
    window.addEventListener("hashchange", () => closeHow(false));
  }

  applyLook();
  build();

  // ----- the cursor trails (sparkles or hearts that follow the mouse) -----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastX = -999, lastY = -999, alive = 0;
  const GLYPHS = { sparkle: ["✦", "✧", "✶"], heart: ["♥"], rainbow: ["✦", "✧", "✶"] };
  let rainbowHue = 0;
  window.addEventListener("pointermove", (e) => {
    if (reduce || !eq.cursor || e.pointerType === "touch") return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < 18 * 18 || alive > 40) return;   // only every so often, never a flood
    lastX = e.clientX; lastY = e.clientY;
    const set = GLYPHS[eq.cursor] || GLYPHS.sparkle;
    const bit = document.createElement("span");
    bit.className = "trail-bit trail-" + eq.cursor;
    if (eq.cursor === "cheese") bit.innerHTML = CHEESE;                                   // a little cheese wedge
    else bit.textContent = set[Math.floor(Math.random() * set.length)];
    if (eq.cursor === "rainbow") { rainbowHue = (rainbowHue + 47) % 360; bit.style.color = "hsl(" + rainbowHue + " 90% 60%)"; }   // each star the next color
    bit.style.left = e.clientX + "px";
    bit.style.top = e.clientY + "px";
    bit.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px");
    bit.style.setProperty("--s", (0.7 + Math.random() * 0.7).toFixed(2));
    document.body.appendChild(bit);
    alive++;
    bit.addEventListener("animationend", () => { bit.remove(); alive--; });
  }, { passive: true });

  // ----- tap sparkles: a little burst of stars where you tap or click (phones too) -----
  let tapAlive = 0;
  const TAP_GLYPHS = { sparkle: ["\u2726", "\u2727", "\u2736"], heart: ["\u2665"], rainbow: ["\u2726", "\u2727", "\u2736"] };
  // one little piece of a tap effect: put at the tap, flies by --tx / --ty, then removes itself
  function tapBit(cls, x, y, vars, content, html) {
    const bit = document.createElement("span");
    bit.className = "tap-bit " + cls;
    if (html) bit.innerHTML = content; else bit.textContent = content;
    bit.style.left = x + "px";
    bit.style.top = y + "px";
    Object.keys(vars).forEach((k) => bit.style.setProperty(k, vars[k]));
    document.body.appendChild(bit);
    tapAlive++;
    bit.addEventListener("animationend", () => { bit.remove(); tapAlive--; });
    return bit;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PINKS = ["#f48fb1", "#f6a5c0", "#f8bbd0", "#ec7fa6"];
  window.addEventListener("pointerdown", (e) => {
    const t = eq.tap;
    if (t === "yb" && owns("tap-yb") && window.YB && (e.button === 0 || e.pointerType === "touch" || e.pointerType === "pen")) window.YB.add(1);   // +1 yeonbucks for every tap, with or without the animation
    if (reduce || !t || tapAlive > 60) return;
    const x = e.clientX, y = e.clientY;
    if (TAP_GLYPHS[t]) {
      const glyphs = TAP_GLYPHS[t];
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.6;
        const dist = 22 + Math.random() * 20;
        const bit = tapBit("tap-" + t, x, y, { "--tx": (Math.cos(ang) * dist).toFixed(1) + "px", "--ty": (Math.sin(ang) * dist).toFixed(1) + "px", "--s": (0.7 + Math.random() * 0.6).toFixed(2) }, glyphs[i % glyphs.length]);
        if (t === "rainbow") bit.style.color = "hsl(" + Math.round((i * 60 + Math.random() * 30) % 360) + " 90% 60%)";   // each star a different color
      }
    } else if (t === "petal") {                          // pink petals that drift out and fall
      for (let i = 0; i < 7; i++) {
        const bit = tapBit("tap-petal", x, y, { "--tx": rnd(-34, 34).toFixed(1) + "px", "--ty": rnd(14, 46).toFixed(1) + "px", "--r": rnd(-200, 200).toFixed(0) + "deg", "--s": rnd(0.8, 1.4).toFixed(2) }, ["\u273F", "\u2740", "\u2741"][i % 3]);
        bit.style.color = PINKS[i % PINKS.length];
      }
    } else if (t === "bubble") {                         // hollow bubbles that float up
      for (let i = 0; i < 5; i++) {
        const size = rnd(8, 17);
        tapBit("tap-bubble", x + rnd(-10, 10), y, { "--tx": rnd(-16, 16).toFixed(1) + "px", "--ty": (-rnd(34, 62)).toFixed(1) + "px", width: size.toFixed(1) + "px", height: size.toFixed(1) + "px" }, "");
      }
    } else if (t === "ghost") {                          // little ghosts that float up and fade
      for (let i = 0; i < 3; i++) {
        tapBit("tap-ghost", x + (i - 1) * 14, y, { "--tx": rnd(-12, 12).toFixed(1) + "px", "--ty": (-rnd(38, 62)).toFixed(1) + "px", "--s": rnd(0.85, 1.2).toFixed(2) }, GHOSTS[(i + (Math.random() < 0.5 ? 1 : 0)) % 2], true);
      }
    } else if (t === "cheese") {                         // little cheese wedges that pop out and fall
      for (let i = 0; i < 4; i++) {
        tapBit("tap-cheese", x, y, { "--tx": rnd(-30, 30).toFixed(1) + "px", "--ty": rnd(10, 40).toFixed(1) + "px", "--r": rnd(-90, 90).toFixed(0) + "deg", "--s": rnd(0.85, 1.25).toFixed(2) }, CHEESE, true);
      }
    } else if (t === "yb") {                             // a little +1 that floats up
      tapBit("tap-yb", x, y, { "--tx": "0px", "--ty": "-30px" }, "+1");
    }
  }, { passive: true });

  // ----- the pet: sits in the bottom right corner, waves and talks when you point at it -----
  const petEl = document.getElementById("pet"), petBtn = document.getElementById("pet-btn"), petBubble = document.getElementById("pet-bubble");
  let petTimer = null, lastSaid = -1;
  const PET_LINES = {                                   // <- what each pet says (one at random); {name} becomes its name
    dog: ["buwark!", "woof!", "hello i'm {name}!"],
    cat: ["mrow", "hiss!", "hello i'm {name}!"],
    bunny: ["squeak!", "*thump thump*", "hello i'm {name}!"],
    koala: ["*munch munch*", "zzz...", "hello i'm {name}!"],
    frog: ["ribbit!", "*splash*", "hello i'm {name}!"],
    panda: ["*munches bamboo*", "rawr? (not scary)", "hello i'm {name}!"],
    fish: ["blub blub", "*bubbles*", "hello i'm {name}!"],
    chicken: ["bawk bawk!", "*flaps wings*", "hello i'm {name}!"],
    elephant: ["*toot!*", "*trumpets softly*", "hello i'm {name}!"],
    goat: ["baaaa!", "*headbutt* (gently)", "hello i'm {name}!"],
    hamster: ["*stuffs cheeks*", "squeak squeak", "hello i'm {name}!"],
    hedgehog: ["*curls up*", "snuffle snuffle", "hello i'm {name}!"],
    mouse: ["squeak!", "*nibbles cheese*", "hello i'm {name}!"],
    turtle: ["...hi. (slowly)", "*hides in shell*", "hello i'm {name}!"],
    rat: ["squeak!", "*nibbles cheese*", "click me to play!", "hello i'm {name}!"],
  };
  function petSay() {
    const kind = eq.pet;
    const lines = (PET_LINES[kind] || PET_LINES.dog).map((l) => l.replace("{name}", nameOf(kind)));
    let i = Math.floor(Math.random() * lines.length);
    if (i === lastSaid) i = (i + 1) % lines.length;                    // never the same one twice in a row
    lastSaid = i;
    petBubble.textContent = lines[i];
    petEl.classList.add("is-up");
    clearTimeout(petTimer);
    petTimer = setTimeout(petHush, 2600);
  }
  function petHush() { petEl.classList.remove("is-up"); }
  if (petEl && petBtn) {
    petBtn.addEventListener("pointerenter", petSay);
    petBtn.addEventListener("click", () => {
      if (eq.pet === "rat" && window.Remy) { window.Remy.open(petBtn); return; }   // the rat opens her panel (remy.js)
      if (!petEl.classList.contains("is-up")) petSay();
    });   // phones: tap (a mouse click doesn't change the line)
    petBtn.addEventListener("focus", () => { if (petBtn.matches(":focus-visible")) petSay(); });     // keyboard only
    petBtn.addEventListener("blur", () => { clearTimeout(petTimer); petHush(); });
    petBtn.addEventListener("pointerleave", (e) => {
      clearTimeout(petTimer);
      if (e.pointerType === "mouse" || e.pointerType === "pen") petHush();   // the line goes away as soon as you stop pointing at it
      else petTimer = setTimeout(petHush, 2600);                              // (a finger lifts right away, so give it a moment)
    });
  }

  // the secret room wheel hands out wheel prizes through this (returns false if you already own it)
  window.YBShop = {
    give: function (id, equipPet) {
      if (!find(id) || owns(id)) return false;
      own.push(id);
      save("yb-own", own);
      const it = find(id);
      if (equipPet && it.kind === "pet" && !eq.pet) { eq.pet = it.value; save("yb-eq", eq); applyLook(); }   // a new pet comes out right away if none is out
      update(); drawInv();
      return true;
    },
    owns: owns,
    nameOf: nameOf,
    // a little picture for an item (the lost and found shows it when you find something). "" if it has none
    art: function (id) {
      const it = find(id);
      if (!it) return "";
      if (it.kind === "acc") return ACC_ART[it.value] || "";
      if (it.value === "cheese") return CHEESE;
      if (it.value === "ghost") return GHOSTS[0];
      return "";
    },
  };
})();


// big screens: the prize shop is laid out at one size and scaled to fit the screen height (no scrolling, see .shop-wrap in style.css)
(function () {
  const pages = [document.querySelector('.page[data-page="shop"]'), document.querySelector('.page[data-page="rare-shop"]')].filter(Boolean);
  if (!pages.length) return;
  const root = document.documentElement;
  const wide = window.matchMedia ? window.matchMedia("(min-width: 61rem)") : { matches: true };
  // the shop pages are not all the same height (some items have longer descriptions), so the size is worked out from the
  // tallest page: step through the pages one by one (this all happens before the screen repaints, so you never see it),
  // then go back to the page that was showing. that way every page fits and the size doesn't jump when you flip pages.
  function tallestPage(page, wrap) {
    const arrow = (i) => page.querySelectorAll(".shop-pager .shop-arrow")[i];   // 0 = back, 1 = next
    let max = wrap.offsetHeight, back = 0, guard = 0;
    while (arrow(0) && !arrow(0).disabled && guard++ < 40) { arrow(0).click(); back++; }
    max = Math.max(max, wrap.offsetHeight);
    let fwd = 0;
    while (arrow(1) && !arrow(1).disabled && guard++ < 80) { arrow(1).click(); fwd++; max = Math.max(max, wrap.offsetHeight); }
    while (fwd > back && arrow(0) && !arrow(0).disabled) { arrow(0).click(); fwd--; }
    return max;
  }
  function fit() {
    const page = pages.find((p) => p.clientHeight > 0);   // whichever of the two shops is showing
    const wrap = page && page.querySelector(".shop-wrap");
    if (!wrap) return;
    const h = page.clientHeight, cs = getComputedStyle(page), w = page.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    if (!h || !w || !wide.matches) return;
    root.style.setProperty("--shop-s", "1");
    const designH = tallestPage(page, wrap);
    if (!designH) return;
    // 0.96: a little breathing room under the shop, so the bottom edge never gets cut off
    const s = Math.max(0.5, Math.min(page.dataset.page === "rare-shop" ? 1 : 1.3, (h / designH) * 0.96, (w * 0.96) / wrap.offsetWidth));
    root.style.setProperty("--shop-s", s.toFixed(3));
  }
  window.addEventListener("resize", fit);
  window.addEventListener("hashchange", () => { fit(); setTimeout(fit, 60); });
  fit(); setTimeout(fit, 200);
})();