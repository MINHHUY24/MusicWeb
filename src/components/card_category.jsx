import { CaretRight, MusicNotesSimple, Play } from '@phosphor-icons/react'
import { useLanguage } from '../i18n.jsx'
import '../styles/card_category.css'

function CardCategory({
  title,
  description,
  cover,
  coverAlt,
  songCount,
  tone = 'blue',
  onClick,
}) {
  const { t } = useLanguage()

  return (
    // NOTE: Component card_category dùng chung cho trang Category
    <button className="card_category" data-tone={tone} type="button" onClick={onClick}>
      {/* NOTE: card_category - ảnh đại diện thể loại */}
      <span className="card_category-cover">
        {cover ? <img src={cover} alt={coverAlt || title} loading="lazy" /> : null}

        <span className="card_category-fallback">
          <MusicNotesSimple size={34} weight="bold" />
        </span>

        <span className="card_category-play">
          <Play size={20} weight="fill" />
        </span>
      </span>

      {/* NOTE: card_category - thông tin thể loại nhạc */}
      <span className="card_category-content">
        <span className="card_category-title-row">
          <span className="card_category-title">{title}</span>
          <span className="card_category-arrow" aria-hidden="true">
            <CaretRight size={19} weight="bold" />
          </span>
        </span>

        <span className="card_category-description">{description}</span>
        <span className="card_category-meta">{t('card.songCount', { count: songCount })}</span>
      </span>
    </button>
  )
}

export default CardCategory
