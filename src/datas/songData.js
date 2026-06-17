import comeMyWayCover from "../assets/image_song/ComeMyWay.jpeg";
import diVeNhaCover from "../assets/image_song/diVeNha.jpg";
import hayTraoChoAnhCover from "../assets/image_song/hayTraoChoAnh.jpeg";
import ngotCover from "../assets/image_song/ngot.jpg";
import noiNayCoAnhCover from "../assets/image_song/noiNayCoAnh.jpg";
import songGioCover from "../assets/image_song/songGio.jpg";
import comeMyWayAudio from "./songs/SON TUNG M-TP x TYGA - COME MY WAY - OFFICIAL MUSIC VIDEO.mp3";
import hayTraoChoAnhAudio from "./songs/SƠN TÙNG M-TP - HÃY TRAO CHO ANH ft. Snoop Dogg - Official MV.mp3";
import songGioAudio from "./songs/SÓNG GIÓ - ICM x JACK - OFFICIAL MUSIC VIDEO.mp3";
import ngotAudio from "./songs/NGỌT - JUSTATEE x RHYMASTIC x BAEMIN - Official Music Video.mp3";
import noiNayCoAnhAudio from "./songs/NƠI NÀY CÓ ANH - OFFICIAL MUSIC VIDEO - SƠN TÙNG M-TP.mp3";
import diVeNhaAudio from "./songs/Đen x JustaTee - Đi Về Nhà (M-V).mp3";
import uploadedSongs from "./uploadedSongs.json";

export const baseSongs = [
  {
    id: "noi-nay-co-anh",
    title: "Nơi Này Có Anh",
    artist: "Sơn Tùng M-TP",
    category: "vpop",
    categoryLabel: "V-pop",
    description: "Pop Việt nhẹ và dễ nghe.",
    duration: "4:38",
    minutes: 5,
    clicks: 180,
    cover: noiNayCoAnhCover,
    audio: noiNayCoAnhAudio,
  },
  {
    id: "hay-trao-cho-anh",
    title: "Hãy Trao Cho Anh",
    artist: "Sơn Tùng M-TP ft. Snoop Dogg",
    category: "vpop",
    categoryLabel: "V-pop",
    description: "V-pop pha hip hop bắt tai.",
    duration: "4:05",
    minutes: 4,
    clicks: 168,
    cover: hayTraoChoAnhCover,
    audio: hayTraoChoAnhAudio,
  },
  {
    id: "song-gio",
    title: "Sóng Gió",
    artist: "ICM x Jack",
    category: "vpop",
    categoryLabel: "V-pop",
    description: "Giai điệu Việt nhiều cảm xúc.",
    duration: "4:35",
    minutes: 5,
    clicks: 152,
    cover: songGioCover,
    audio: songGioAudio,
  },
  {
    id: "di-ve-nha",
    title: "Đi Về Nhà",
    artist: "Đen x JustaTee",
    category: "hiphop",
    categoryLabel: "Hip hop",
    description: "Rap Việt ấm và gần gũi.",
    duration: "3:20",
    minutes: 3,
    clicks: 144,
    cover: diVeNhaCover,
    audio: diVeNhaAudio,
  },
  {
    id: "ngot",
    title: "Ngọt",
    artist: "JustaTee x Rhymastic x BAEMIN",
    category: "hiphop",
    categoryLabel: "Hip hop",
    description: "Groove Việt vui và sáng.",
    duration: "3:48",
    minutes: 4,
    clicks: 131,
    cover: ngotCover,
    audio: ngotAudio,
  },
  {
    id: "come-my-way",
    title: "Come My Way",
    artist: "Sơn Tùng M-TP x Tyga",
    category: "pop",
    categoryLabel: "Pop",
    description: "Pop quốc tế có màu hiện đại.",
    duration: "3:33",
    minutes: 4,
    clicks: 126,
    cover: comeMyWayCover,
    audio: comeMyWayAudio,
  },
];

const normalizedUploadedSongs = uploadedSongs.map((song) => ({
  ...song,
  cover: song.coverPath,
  audio: song.audioPath,
  clicks: song.clicks ?? 0,
}));

export const songLibrary = [...baseSongs, ...normalizedUploadedSongs];

export function getSongById(songId) {
  return songLibrary.find((song) => song.id === songId);
}

export function getSongsByCategory(categoryId) {
  return songLibrary.filter((song) => song.category === categoryId);
}
