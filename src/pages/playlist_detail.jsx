import { ArrowLeft, MusicNotesSimple, Play, Sparkle } from '@phosphor-icons/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { initialPlaylists, playlistTracks } from '../datas/playlistData.js'
import '../styles/playlist_detail.css'

function PlaylistDetail({ player }) {
  const { playlistId } = useParams()
  const playlist = initialPlaylists.find((item) => item.id === playlistId)

  if (!playlist) {
    return <Navigate to="/playlist" replace />
  }

  const tracks = playlistTracks[playlist.id] ?? []

  return (
    <section className="page-section playlist-detail-page">
      <div className="playlist-detail-heading">
        <Link className="playlist-detail-back" to="/playlist" aria-label="Quay lại Playlist">
          <ArrowLeft size={19} weight="bold" />
        </Link>

        <div>
          <h2>{playlist.title}</h2>
          <p>{playlist.description}</p>
        </div>

        <span className="playlist-detail-badge">
          <Sparkle size={17} weight="fill" />
          {playlist.songCount} bài
        </span>
      </div>

      <section className="playlist-detail-panel" aria-label={`${playlist.title} tracks`}>
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
              aria-label={`Phát ${playlist.title}`}
              onClick={() => player?.playQueue(tracks, 0)}
            >
              <Play size={28} weight="fill" />
            </button>
          </div>

          <div className="playlist-detail-copy">
            <span>{playlist.title}</span>
            <strong>{playlist.description}</strong>
            <small>
              {playlist.songCount} bài hát - {playlist.duration}
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
              <span className="playlist-track-index">{String(index + 1).padStart(2, '0')}</span>

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
  )
}

export default PlaylistDetail
