import { Play } from '@phosphor-icons/react'
import '../styles/card_music.css'

function CardMusic({ title, artist, cover, alt, meta, onClick }) {
  return (
    // NOTE: Component card_music dùng chung cho các lane bài hát
    <button className="card_music" type="button" onClick={onClick}>
      <span className="card_music-cover">
        {cover ? <img src={cover} alt={alt || title} loading="lazy" /> : null}
        <span className="card_music-play">
          <Play size={22} weight="fill" />
        </span>
      </span>

      <span className="card_music-info">
        <span className="card_music-title">{title}</span>
        <span className="card_music-artist">{artist}</span>
        {meta ? <span className="card_music-meta">{meta}</span> : null}
      </span>
    </button>
  )
}

export default CardMusic
