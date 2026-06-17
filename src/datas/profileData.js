import { songLibrary } from "./songData.js";

export const userProfile = {
  name: "Minh Huy",
  username: "@huy.music",
  bio: "Thư viện nghe nhạc cá nhân, lưu playlist và các track tự upload.",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80",
};

export const profileStats = [
  { id: "liked", label: "Yêu thích", value: songLibrary.length },
  { id: "history", label: "Đã nghe", value: songLibrary.length },
  { id: "uploaded", label: "Đã up", value: 0 },
];

export const favoriteTracks = songLibrary.map((song) => ({
  ...song,
  id: song.id,
  title: song.title,
  artist: song.artist,
  duration: song.duration,
  cover: song.cover,
  meta: song.categoryLabel,
}));

export const listeningHistory = [...songLibrary].reverse().map((song, index) => ({
  ...song,
  id: `${song.id}-history`,
  sourceId: song.id,
  title: song.title,
  artist: song.artist,
  duration: song.duration,
  cover: song.cover,
  meta: index === 0 ? "Nghe gần đây" : "Trong thư viện",
}));
