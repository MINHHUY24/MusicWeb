function sumMinutes(songs) {
  return songs.reduce((total, song) => total + (song.minutes ?? 0), 0);
}

export function formatPlaylistDuration(totalMinutes) {
  if (!totalMinutes) return "0 phút";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} phút`;
  if (!minutes) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

export const playlistDefinitions = [
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
];

function getPlaylistTracks(playlistId, tracks) {
  if (playlistId === "son-tung") {
    return tracks.filter((song) => song.artist?.toLowerCase().includes("sơn tùng"));
  }

  if (playlistId === "viet-mix") {
    return tracks.filter((song) => ["vpop", "hiphop"].includes(song.category));
  }

  return tracks;
}

export function buildPlaylists(tracks = []) {
  return playlistDefinitions
    .map((playlist) => {
      const playlistTracks = getPlaylistTracks(playlist.id, tracks);
      const durationMinutes = sumMinutes(playlistTracks);

      return {
        ...playlist,
        songCount: playlistTracks.length,
        durationMinutes,
        duration: formatPlaylistDuration(durationMinutes),
        cover: playlistTracks.find((song) => song.cover)?.cover,
      };
    })
    .filter((playlist) => playlist.songCount > 0);
}

export function buildPlaylistTracks(tracks = []) {
  return Object.fromEntries(
    buildPlaylists(tracks).map((playlist) => [
      playlist.id,
      getPlaylistTracks(playlist.id, tracks),
    ]),
  );
}

export function buildCustomPlaylists(playlists = [], tracks = []) {
  const trackById = new Map(tracks.map((track) => [track.id, track]));

  return playlists.map((playlist) => {
    const playlistTracks = (playlist.trackIds ?? [])
      .map((trackId) => trackById.get(trackId))
      .filter(Boolean);
    const durationMinutes = sumMinutes(playlistTracks);

    return {
      ...playlist,
      songCount: playlistTracks.length,
      durationMinutes,
      duration: formatPlaylistDuration(durationMinutes),
      cover:
        playlist.cover || playlistTracks.find((song) => song.cover)?.cover || "",
    };
  });
}

export function buildCustomPlaylistTracks(playlists = [], tracks = []) {
  const trackById = new Map(tracks.map((track) => [track.id, track]));

  return Object.fromEntries(
    playlists.map((playlist) => [
      playlist.id,
      (playlist.trackIds ?? [])
        .map((trackId) => trackById.get(trackId))
        .filter(Boolean),
    ]),
  );
}

export function mapAvailableSongs(tracks = []) {
  return tracks.map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    minutes: song.minutes,
    cover: song.cover,
    audio: song.audio,
    duration: song.duration,
  }));
}

export const toneOptions = [
  { value: "blue", label: "Blue glass" },
  { value: "mint", label: "Mint chill" },
  { value: "rose", label: "Rose night" },
  { value: "amber", label: "Amber acoustic" },
];
