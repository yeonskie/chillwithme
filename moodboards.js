// ---------- Your moodboards (the braindump page) ----------
// Each moodboard is one tab. Each item in it is one box on the board.
//
// Boxes sit in lines of equal height. A line is 12 columns wide, and when a
// line is full, the next box starts a new line.
//
// PICTURES FIT THEMSELVES. A wide picture gets a wide box, a tall picture gets
// a narrow one, and a square picture gets a square box. You don't have to do
// anything: just leave "cols" out. (If you do set "cols" on a picture, that
// width wins, and the picture is cropped to fit it.)
//
// Pictures (pick whichever is easiest):
//   { src: "https://example.com/photo.jpg", alt: "what it shows" }   <- a picture from the web
//   "https://example.com/photo.jpg"                                  <- same thing, just the address
//   { src: "images/photo.jpg", alt: "what it shows" }                <- a file in an "images" folder
//
// For a picture from the web, right-click it and choose "Copy image address",
// then paste that address as the "src". It has to be the picture's own address
// (usually ending in .jpg, .png, .gif or .webp), not the link to the page it's on.
// A few things to know: some sites block their pictures from showing on other
// websites, and if the original gets deleted it disappears from your board too.
// If a picture can't load, its box says "couldn't load" so you can spot it.
//
// Other boxes (these use "cols": how many of the 12 columns the box takes):
//   { type: "text",  title: "optional title", text: "your words", cols: 4 }
//   { type: "color", color: "#e8b4c8", label: "optional name", cols: 2 }
//   { type: "color", colors: ["#e8b4c8", "#9fb8d6", "#f2e3a5"], label: "optional name", cols: 3 }   <- a palette
//
// "rows" is optional (1, 2 or 3) on any box. A box with rows: 2 makes its whole line twice as tall.
//
// By default each line keeps its boxes at their natural widths, so a line that
// isn't full leaves some empty space at the right. Add  fill: true  next to a
// board's name to stretch every line (except the last) to the full width.
// Pictures get cropped slightly when they stretch.
//
// To add a moodboard, copy a whole { name: ..., items: [ ... ] } block
// below the last one (keep the comma after the closing brace).
// To add a box, copy one of the lines inside "items".
//
// The boxes below with an empty src are placeholders (a box with a cross through it).
// They have a "cols" so you can see the layout. When you put a real picture in,
// delete that "cols" so the box can fit the picture.

const MOODBOARDS = [
  {
    name: "moodboard 1",
    items: [
      { src: "", alt: "image one", cols: 3 },
      { type: "text", title: "a title", text: "Replace this with your own words. Short thoughts fit best in the narrow boxes.", cols: 2 },
      { src: "", alt: "image two", cols: 7 },

      { type: "text", title: "another title", text: "A wide box has room for a longer note, a quote, a list of things you love, or whatever you want to dump here.\n\nLeave a blank line to start a new paragraph.", cols: 7 },
      { type: "color", color: "#e8b4c8", label: "pink", cols: 2 },
      { src: "", alt: "image three", cols: 3 },
    ],
  },
  {
    name: "moodboard 2",
    items: [
      { type: "text", title: "second board", text: "Switch boards with the tabs up top.", cols: 4 },
      { src: "", alt: "image four", cols: 4 },
      { type: "color", color: "#9fb8d6", label: "blue", cols: 4 },

      { src: "", alt: "image five", cols: 8 },
      { type: "text", text: "A box with no title is fine too.", cols: 4 },
    ],
  },
];