import {
  ArrowLeft,
  MusicNotesSimple,
  Play,
  Sparkle,
} from "@phosphor-icons/react";
import { Link, Navigate, useParams } from "react-router-dom";
import LoadingState from "../components/loading_state.jsx";
import {
  buildCustomPlaylistTracks,
  buildCustomPlaylists,
  buildPlaylistTracks,
  buildPlaylists,
} from "../datas/playlistData.js";
import { formatMinutes, localizePlaylist, useLanguage } from "../i18n.jsx";
import "../styles/playlist_detail.css";

function PlaylistDetail({
  player,
  tracks: allTracks = [],
  customPlaylists = [],
  isLoading = false,
  error = "",
}) {
  const { language, t } = useLanguage();
  const { playlistId } = useParams();
  const defaultPlaylists = buildPlaylists(allTracks);
  const savedCustomPlaylists = buildCustomPlaylists(customPlaylists, allTracks);
  const playlists = [...savedCustomPlaylists, ...defaultPlaylists];
  const tracksByPlaylist = {
    ...buildPlaylistTracks(allTracks),
    ...buildCustomPlaylistTracks(savedCustomPlaylists, allTracks),
  };
  const basePlaylist = playlists.find((item) => item.id === playlistId);

  if (isLoading) {
    return (
      <section className="page-section playlist-detail-page">
        <LoadingState
          title={t("common.waitingTitle")}
          description={t("common.waitingMusicDescription")}
          quiet
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section playlist-detail-page">
        <LoadingState
          title={t("common.musicLoadErrorTitle")}
          description={error}
          variant="error"
        />
      </section>
    );
  }

  if (!basePlaylist) {
    return <Navigate to="/playlist" replace />;
  }

  const playlist = localizePlaylist(basePlaylist, t);
  const tracks = tracksByPlaylist[playlist.id] ?? [];
  const playlistDuration = Number.isFinite(playlist.durationMinutes)
    ? formatMinutes(playlist.durationMinutes, language)
    : playlist.duration;

  return (
    <section className="page-section playlist-detail-page">
      <div className="playlist-detail-heading">
        <Link
          className="playlist-detail-back"
          to="/playlist"
          aria-label={t("playlistPage.detail.back")}
        >
          <ArrowLeft size={19} weight="bold" />
        </Link>

        <div>
          <h2>{playlist.title}</h2>
        </div>

        <span className="playlist-detail-badge">
          <Sparkle size={17} weight="fill" />
          {playlist.songCount} {t("common.songs")}
        </span>
      </div>

      <section
        className="playlist-detail-panel"
        aria-label={t("playlistPage.detail.aria", { name: playlist.title })}
      >
        <aside className="playlist-detail-cover-card" data-tone={playlist.tone}>
          <div className="playlist-detail-cover">
            {playlist.cover ? (
              <img src={playlist.cover} alt={playlist.title} />
            ) : (
              <MusicNotesSimple size={68} weight="fill" />
            )}

            <button
              className="playlist-detail-play"
              type="button"
              aria-label={t("playlistPage.detail.play", {
                name: playlist.title,
              })}
              onClick={() => player?.playQueue(tracks, 0)}
            >
              <Play size={28} weight="fill" />
            </button>
          </div>

          <div className="playlist-detail-copy">
            <span>{playlist.title}</span>
            <small>
              {t("playlistPage.detail.summary", {
                count: playlist.songCount,
                duration: playlistDuration,
              })}
            </small>
          </div>
        </aside>

        <div className="playlist-track-list">
          {tracks.map((track, index) => (
            <button
              className="playlist-track-row"
              type="button"
              key={track.id}
              onClick={() => player?.playQueue(tracks, index)}
            >
              <span className="playlist-track-index">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="playlist-track-cover">
                {track.cover ? (
                  <img src={track.cover} alt={track.title} loading="lazy" />
                ) : (
                  <MusicNotesSimple size={24} weight="fill" />
                )}
                <span className="playlist-track-play">
                  <Play size={15} weight="fill" />
                </span>
              </span>

              <span className="playlist-track-info">
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </span>

              <span className="playlist-track-duration">{track.duration}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

export default PlaylistDetail;
