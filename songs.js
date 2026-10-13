// ---------- Your songs (the music page) ----------
// Each song is one line. To add one:
//   1. Put the mp3 file in the "music" folder next to index.html.
//   2. Copy a line below, paste it under the last one (keep the comma at the end),
//      and change the title, artist and file name.
//
//   { title: "song name", artist: "who made it", src: "music/file-name.mp3" },
//
// "artist" is optional. The file name has to match exactly, including capital letters.
// Visitors can't download or change your songs, but they can build their own playlists
// from this list (those playlists are saved only in their own browser).
//
// A few things to know:
// - Only add music you made or have the right to share. Anything on this site is public.
// - GitHub Pages is happiest with small files: keep each mp3 well under 25 MB, and the
//   whole site under about 1 GB.
// - The three "sample" songs below are just tones so you can see how it works.
//   Delete those lines (and the files in the music folder) when you add your own.

const SONGS = [
  { title: "iconic by mistake", artist: "le sserafim, illit, katseye", src: "music/iconic by mistake.mp3", category: "k-pop" },
  { title: "blue valentine", artist: "nmixx", src: "music/blue valentine.mp3", category: "k-pop" },
  { title: "disconnected", artist: "5 seconds of summer", src: "music/disconnected.mp3", category: "boy band excellence" },
  { title: "sun kiss", artist: "tuide", src: "music/sun kiss.mp3", category: "k-pop" },
  { title: "feel special", artist: "twice", src: "music/feel special.mp3", category: "k-pop" },
  { title: "alive", artist: "one direction", src: "music/alive.mp3", category: "boy band excellence" },
  { title: "that's so true", artist: "gracie abrams", src: "music/that's so true.mp3", category: "pop girlies" },
  { title: "juno", artist: "sabrina carpenter", src: "music/juno.mp3", category: "pop girlies" },
  { title: "in bloom", artist: "zerobaseone", src: "music/in bloom.mp3", category: "k-pop" },
  { title: "left right", artist: "xg", src: "music/left right.mp3", category: "k-pop" },
];
