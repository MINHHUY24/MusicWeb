import {
  DotsThreeVertical,
  MusicNotesSimple,
  PencilSimple,
  Play,
  Plus,
  Trash,
} from '@phosphor-icons/react'
import { useLanguage } from '../i18n.jsx'
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
  isMenuOpen = false,
  onClick,
  onMenuToggle,
  onEdit,
  onDelete,
}) {
  const { t } = useLanguage()
  const hasMenu = !isCreate && (onEdit || onDelete)
  const cardClassName = [
    isCreate ? 'card_playlist card_playlist-create' : 'card_playlist',
    isMenuOpen ? 'card_playlist-menu-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) return
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return

    event.preventDefault()
    onClick()
  }

  function handleMenuToggle(event) {
    event.stopPropagation()
    onMenuToggle?.()
  }

  function handleMenuAction(event, action) {
    event.stopPropagation()
    action?.()
  }

  return (
    // NOTE: Component card_playlist dùng chung cho trang Playlist
    <div
      className={cardClassName}
      data-tone={tone}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
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

          {hasMenu ? (
            <span className="card_playlist-menu-wrap">
              <button
                className="card_playlist-menu"
                type="button"
                aria-label={t('playlistPage.actions.open', { name: title })}
                aria-expanded={isMenuOpen}
                onClick={handleMenuToggle}
              >
                <DotsThreeVertical size={22} weight="bold" />
              </button>

              {isMenuOpen ? (
                <span className="card_playlist-action-menu" role="menu">
                  {onEdit ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(event) => handleMenuAction(event, onEdit)}
                    >
                      <PencilSimple size={17} weight="bold" />
                      <span>{t('playlistPage.actions.edit')}</span>
                    </button>
                  ) : null}

                  {onDelete ? (
                    <button
                      className="card_playlist-action-danger"
                      type="button"
                      role="menuitem"
                      onClick={(event) => handleMenuAction(event, onDelete)}
                    >
                      <Trash size={17} weight="bold" />
                      <span>{t('playlistPage.actions.delete')}</span>
                    </button>
                  ) : null}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>

        <span className="card_playlist-description">{description}</span>

        <span className="card_playlist-meta">
          <span>{isCreate ? t('card.favoriteSongs') : t('card.songCount', { count: songCount })}</span>
          {!isCreate && duration ? <span>{duration}</span> : null}
        </span>
      </span>
    </div>
  )
}

export default CardPlaylist
