import { DotsThreeVertical, MusicNotesSimple, Play, Plus } from '@phosphor-icons/react'
import '../styles/card_playlist.css'

function CardPlaylist({
  title,
  description,
  cover,
  coverAlt,
  songCount,
  duration,
  tone = 'blue',
  isCreate = false,
  onClick,
}) {
  return (
    // NOTE: Component card_playlist dùng chung cho trang Playlist
    <button
      className={isCreate ? 'card_playlist card_playlist-create' : 'card_playlist'}
      data-tone={tone}
      type="button"
      onClick={onClick}
    >
      <span className="card_playlist-cover">
        {cover ? <img src={cover} alt={coverAlt || title} loading="lazy" /> : null}

        <span className="card_playlist-fallback">
          {isCreate ? <Plus size={34} weight="bold" /> : <MusicNotesSimple size={34} weight="bold" />}
        </span>

        {!isCreate ? (
          <span className="card_playlist-play">
            <Play size={21} weight="fill" />
          </span>
        ) : null}
      </span>

      <span className="card_playlist-content">
        <span className="card_playlist-title-row">
          <span className="card_playlist-title">{title}</span>
          {!isCreate ? (
            <span className="card_playlist-menu" aria-hidden="true">
              <DotsThreeVertical size={22} weight="bold" />
            </span>
          ) : null}
        </span>

        <span className="card_playlist-description">{description}</span>

        <span className="card_playlist-meta">
          <span>{isCreate ? 'Thêm bài hát yêu thích' : `${songCount} bài hát`}</span>
          {!isCreate && duration ? <span>{duration}</span> : null}
        </span>
      </span>
    </button>
  )
}

export default CardPlaylist
