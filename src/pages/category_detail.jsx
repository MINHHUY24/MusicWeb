import { ArrowLeft, MusicNotesSimple, Play, Sparkle } from '@phosphor-icons/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { categories, categoryTracks } from '../datas/categoryData.js'
import '../styles/category_detail.css'

function CategoryDetail({ player }) {
  const { categoryId } = useParams()
  const category = categories.find((item) => item.id === categoryId)

  if (!category) {
    return <Navigate to="/category" replace />
  }

  const tracks = categoryTracks[category.id] ?? []

  return (
    <section className="page-section category-detail-page">
      <div className="category-detail-heading">
        <Link className="category-detail-back" to="/category" aria-label="Quay lại Category">
          <ArrowLeft size={19} weight="bold" />
        </Link>

        <div>
          <h2>{category.title}</h2>
          <p>{category.description}</p>
        </div>

        <span className="category-detail-badge">
          <Sparkle size={17} weight="fill" />
          {category.songCount} bài hát
        </span>
      </div>

      <section className="category-detail-panel" aria-label={`${category.title} songs`}>
        <aside className="category-detail-cover-card" data-tone={category.tone}>
          <div className="category-detail-cover">
            <img src={category.cover} alt={category.title} />
            <button
              className="category-detail-play"
              type="button"
              aria-label={`Phát ${category.title}`}
              onClick={() => player?.playQueue(tracks, 0)}
            >
              <Play size={28} weight="fill" />
            </button>
          </div>

          <div className="category-detail-copy">
            <span>{category.title}</span>
            <strong>{category.description}</strong>
            <small>{tracks.length} bài nổi bật trong thể loại này</small>
          </div>
        </aside>

        <div className="category-track-list">
          {tracks.map((track, index) => (
            <button
              className="category-track-row"
              type="button"
              key={track.id}
              onClick={() => player?.playQueue(tracks, index)}
            >
              <span className="category-track-index">{String(index + 1).padStart(2, '0')}</span>

              <span className="category-track-cover">
                {track.cover ? (
                  <img src={track.cover} alt={track.title} loading="lazy" />
                ) : (
                  <MusicNotesSimple size={24} weight="fill" />
                )}
                <span className="category-track-play">
                  <Play size={15} weight="fill" />
                </span>
              </span>

              <span className="category-track-info">
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </span>

              <span className="category-track-duration">{track.duration}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  )
}

export default CategoryDetail
