export const userProfile = {
  name: "Minh Huy",
  username: "@huy.music",
  bio: "Thư viện nghe nhạc cá nhân, lưu playlist và các track tự upload.",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80",
};

export const profileStats = [
  { id: "liked", label: "Yêu thích", value: 0 },
  { id: "history", label: "Đã nghe", value: 0 },
  { id: "uploaded", label: "Đã up", value: 0 },
];

export function mapFavoriteTracks(tracks = []) {
  return tracks.map((song) => ({
    ...song,
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    cover: song.cover,
    meta: song.categoryLabel,
  }));
}

export function mapListeningHistory(tracks = []) {
  return tracks.map((song, index) => ({
    ...song,
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    cover: song.cover,
    audio: song.audio,
    metaKey: index === 0 ? "profile.recentlyPlayed" : "profile.inLibrary",
  }));
}
