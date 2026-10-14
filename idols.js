// ---------- The idols for "guess the k-pop idol" ----------
// One line per idol. To add someone: add a line here and put their photo in games/idol/photos/.
//
//   name    what shows when the answer is revealed
//   groups  used for the "right group, wrong member" clue (and shown with the answer)
//   alts    other spellings that count as correct (spaces, dashes and capitals never matter)
//   hint    shown when a player taps "hint"
//   photo   the photo's file name inside games/idol/photos/ (like "07.jpg").
//           Leave it as "" and the game looks for the idol's name instead, like "zhang-hao.jpg".

const IDOLS = [
  { name: "chaewon", groups: ["iz*one", "le sserafim"], alts: ["kim chaewon", "chae won", "lsfm chaewon", "chaewon lsfm","le sserafim chaewon", "chaewon le sserafim"], hint: "was in a produce group", photo: "03.jpg" },
  { name: "chenle", groups: ["nct dream"], alts: ["chen le", "lele", "nct dream chenle", "chenle nct dream"], hint: "from sm and chinese, main vocalist", photo: "01.jpg" },
  { name: "gunwook", groups: ["zerobaseone"], alts: ["park gunwook", "gun wook", "zb1 gunwook", "gunwook zb1"], hint: "currently the maknae of group, all-rounder", photo: "02.jpg" },
  { name: "hinata", groups: ["xg"], alts: ["hinata xg","xg hinata"], hint: "mixed japanese and korean descent", photo: "04.jpg" },
  { name: "jake", groups: ["enhypen"], alts: ["sim jake", "shim jake", "enhypen jake", "jake enhypen"], hint: "naurrr (australian)", photo: "05.jpg" },
  { name: "jiyu", groups: ["kiiikiii"], alts: ["seo jiyu", "kiiikiii jiyu", "jiyu kiiikiii"], hint: "the leader of their group", photo: "06.jpg" },
  { name: "jungkook", groups: ["bts"], alts: ["jung kook", "jungguk", "jeonguk", "bts jungkook", "jk", "jungkook bts"], hint: "debuted solo with the album 'golden' in 2023", photo: "07.jpg" },
  { name: "karina", groups: ["aespa"], alts: ["jimin", "ji min", "yu jimin", "yu ji min", "aespa karina", "karina aespa"], hint: "known for her unique visuals and small head", photo: "08.jpg" },
  { name: "liz", groups: ["ive"], alts: ["liz", "ji won", "jiwon", "kim jiwon", "kim ji won", "liz ive", "ive liz"], hint: "main vocalist of the group, often blonde", photo: "09.jpg" },
  { name: "nayeon", groups: ["twice"], alts: ["im nayeon", "na yeon", "twice nayeon", "nayeon twice"], hint: "fake maknae of the group", photo: "10.jpg" },
  { name: "rei", groups: ["ive"], alts: ["rei", "naoi rei", "rei ive", "ive rei"], hint: "japanese member born in 2004, main rapper", photo: "11.jpg" },
  { name: "seulgi", groups: ["red velvet"], alts: ["kim seulgi", "red velvet seulgi", "seulgi red velvet"], hint: "main dancer debuted in august 2014", photo: "12.jpg" },
  { name: "soobin", groups: ["txt"], alts: ["soo bin", "choi soobin", "choi soo bin", "txt soobin", "soobin txt"], hint: "186cm from big hit music", photo: "13.jpg" },
  { name: "ye-on", groups: ["hearts2hearts"], alts: ["yeon", "kim nayeon", "kim na yeon", "ye on", "hearts2hearts ye-on", "hearts2hearts yeon"], hint: "born in 2010, maknae of their group", photo: "14.jpg" },
  { name: "yena", groups: ["iz*one", "soloist"], alts: ["choi yena", "choi ye na", "iz*one yena","yena iz*one"], hint: "participated in produce 48, main rapper", photo: "15.jpg" },
  { name: "yeri", groups: ["red velvet"], alts: ["yerim", "kim yerim", "kim yeri", "red velvet yeri", "yeri red velvet"], hint: "joined her group after the first comeback", photo: "16.jpg" },
  { name: "yunjin", groups: ["le sserafim"], alts: ["yunjin", "huh yunjin", "jennifer", "lsfm yunjin", "yunjin lsfm", "le sserafim yunjin", "yunjin le sserafim"], hint: "extroverted and outgoing, korean-american", photo: "17.jpg" },
  { name: "zhang hao", groups: ["zerobaseone", "and2ble"], alts: ["hao", "zb1 hao", "hao zb1", "zerobaseone zhang hao", "zhang hao zb1", "zerobaseone hao", "zhang hao zerobaseone", "hao zerobaseone"], hint: "main vocalist, placed first in a survival show", photo: "18.jpg" },
];