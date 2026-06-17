import { getSongById, songLibrary } from "./songData.js";

function sumMinutes(songIds) {
  return songIds.reduce((total, songId) => total + (getSongById(songId)?.minutes ?? 0), 0);
}

export function formatPlaylistDuration(totalMinutes) {
  if (!totalMinutes) return "0 phút";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} phút`;
  if (!minutes) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

export const playlistSongIds = {
  "all-songs": songLibrary.map((song) => song.id),
  "son-tung": songLibrary
    .filter((song) => song.artist.toLowerCase().includes("sơn tùng"))
    .map((song) => song.id),
  "viet-mix": songLibrary
    .filter((song) => ["vpop", "hiphop"].includes(song.category))
    .map((song) => song.id),
};

export const initialPlaylists = [
  {
    id: "all-songs",
    title: "Tất cả bài hát",
    description: "Toàn bộ nhạc trong thư viện",
    tone: "blue",
  },
  {
    id: "son-tung",
    title: "Sơn Tùng M-TP",
    description: "Các track Sơn Tùng hiện có",
    tone: "mint",
  },
  {
    id: "viet-mix",
    title: "Việt mix",
    description: "V-pop và hip hop Việt",
    tone: "amber",
  },
].map((playlist) => {
  const songIds = playlistSongIds[playlist.id] ?? [];
  const firstSong = getSongById(songIds[0]);

  return {
    ...playlist,
    songCount: songIds.length,
    duration: formatPlaylistDuration(sumMinutes(songIds)),
    cover: firstSong?.cover,
  };
});

export const availableSongs = songLibrary.map((song) => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  minutes: song.minutes,
  cover: song.cover,
  audio: song.audio,
  duration: song.duration,
}));

export const playlistTracks = Object.fromEntries(
  initialPlaylists.map((playlist) => [
    playlist.id,
    (playlistSongIds[playlist.id] ?? []).map((songId) => getSongById(songId)).filter(Boolean),
  ]),
);

export const toneOptions = [
  { value: "blue", label: "Blue glass" },
  { value: "mint", label: "Mint chill" },
  { value: "rose", label: "Rose night" },
  { value: "amber", label: "Amber acoustic" },
];
