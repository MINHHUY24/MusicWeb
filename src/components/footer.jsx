import {
  Heart,
  MusicNotesSimple,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  SpeakerHigh,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../i18n.jsx'

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'

  const minutes = Math.floor(value / 60)
  const seconds = String(Math.floor(value % 60)).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function Footer({ player }) {
  const { t } = useLanguage()
  const audioRef = useRef(null)
  const queueRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  const {
    currentSong,
    currentSongIndex,
    currentTime,
    isPlaying,
    isCurrentSongFavorite,
    isShuffleOn,
    playerQueue,
    repeatMode,
    cycleRepeatMode,
    onEnded,
    onNext,
    onPlayIndex,
    onPrevious,
    onSeek,
    onTimeUpdate,
    onTogglePlay,
    onToggleFavorite,
    onToggleShuffle,
    onVolumeChange,
    volume,
  } = player
  const nextSongs = useMemo(() => {
    if (!playerQueue.length) return []
    if (currentSongIndex < 0) {
      return playerQueue.map((song, index) => ({ song, index }))
    }

    return playerQueue
      .map((song, index) => ({ song, index }))
      .filter((item) => item.index !== currentSongIndex)
      .slice(currentSongIndex)
      .concat(
        playerQueue
          .map((song, index) => ({ song, index }))
          .filter((item) => item.index !== currentSongIndex)
          .slice(0, currentSongIndex),
      )
  }, [currentSongIndex, playerQueue])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) return

    audio.volume = volume
  }, [volume])

  useEffect(() => {
    if (!isQueueOpen) return undefined

    function handlePointerDown(event) {
      if (!queueRef.current?.contains(event.target)) {
        setIsQueueOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsQueueOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isQueueOpen])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) return

    if (isPlaying && currentSong?.audio) {
      audio.play().catch(() => {})
      return
    }

    audio.pause()
  }, [currentSong?.audio, isPlaying])

  function handleSeek(event) {
    const nextTime = Number(event.target.value)
    const audio = audioRef.current

    if (audio) {
      audio.currentTime = nextTime
    }

    onSeek(nextTime)
  }

  function handleEnded() {
    const audio = audioRef.current

    if (repeatMode === 'one' && audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
      return
    }

    onEnded()
  }

  return (
    // NOTE: Phần thanh phát nhạc dưới cùng
    <footer className="player-bar" aria-label={t('footer.musicPlayer')}>
      <audio
        ref={audioRef}
        src={currentSong?.audio || undefined}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={handleEnded}
        onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
      />

      {/* NOTE: Phần thông tin bài hát đang phát */}
      <div className="song-info">
        <div className="cover-placeholder">
          {currentSong?.cover ? (
            <img src={currentSong.cover} alt={currentSong.title} />
          ) : (
            <MusicNotesSimple size={26} weight="bold" />
          )}
        </div>
        <div className="song-copy">
          <p className="song-title">{currentSong?.title || t('common.noSongPlaying')}</p>
          <p className="song-artist">{currentSong?.artist || t('common.unknownArtist')}</p>
        </div>
      </div>

      {/* NOTE: Phần nút điều khiển phát nhạc và timeline */}
      <div className="player-center">
        <div className="player-controls" aria-label={t('footer.playbackControls')}>
          <button
            className={isShuffleOn ? 'icon-button icon-button-active' : 'icon-button'}
            type="button"
            aria-label={t('footer.shuffle')}
            aria-pressed={isShuffleOn}
            onClick={onToggleShuffle}
          >
            <Shuffle size={23} weight="bold" />
          </button>
          <button className="icon-button" type="button" aria-label={t('footer.previous')} onClick={onPrevious}>
            <SkipBack size={23} weight="fill" />
          </button>
          <button
            className="play-button"
            type="button"
            aria-label={isPlaying ? t('footer.pause') : t('footer.play')}
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
          </button>
          <button className="icon-button" type="button" aria-label={t('footer.next')} onClick={onNext}>
            <SkipForward size={23} weight="fill" />
          </button>
          <button
            className={repeatMode === 'off' ? 'icon-button' : 'icon-button icon-button-active repeat-button'}
            type="button"
            aria-label={t('footer.repeat')}
            aria-pressed={repeatMode !== 'off'}
            data-repeat-mode={repeatMode}
            onClick={cycleRepeatMode}
          >
            <Repeat size={23} weight="bold" />
          </button>
          <button
            className={isCurrentSongFavorite ? 'icon-button icon-button-active' : 'icon-button'}
            type="button"
            aria-label={isCurrentSongFavorite ? t('footer.unfavorite') : t('footer.favorite')}
            aria-pressed={isCurrentSongFavorite}
            disabled={!currentSong}
            onClick={onToggleFavorite}
          >
            <Heart size={23} weight={isCurrentSongFavorite ? 'fill' : 'bold'} />
          </button>
        </div>

        {/* NOTE: Phần timeline của bài hát */}
        <div className="timeline-row">
          <span>{formatTime(currentTime)}</span>
          <input
            className="timeline-range"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label={t('footer.seek')}
            style={{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* NOTE: Phần âm lượng và danh sách phát */}
      <div className="player-tools" ref={queueRef}>
        <SpeakerHigh size={25} weight="fill" />
        <input
          className="volume-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label={t('footer.volume')}
          style={{ '--progress': `${volume * 100}%` }}
        />
        <div className="tool-divider" />
        <button
          className={isQueueOpen ? 'queue-toggle queue-toggle-active' : 'queue-toggle'}
          type="button"
          aria-label={t('footer.queue')}
          aria-expanded={isQueueOpen}
          onClick={() => setIsQueueOpen((value) => !value)}
        >
          <MusicNotesSimple size={25} weight="bold" />
        </button>

        <aside
          className={isQueueOpen ? 'queue-panel queue-panel-open' : 'queue-panel'}
          role="dialog"
          aria-label={t('footer.queue')}
        >
          <div className="queue-panel-heading">
            <strong>{t('footer.queueTitle')}</strong>
            <button type="button" onClick={() => setIsQueueOpen(false)} aria-label={t('footer.closeQueue')}>
              {t('common.close')}
            </button>
          </div>

          <div className="queue-list">
            {nextSongs.length ? (
              nextSongs.map(({ song, index }) => (
                <button
                  className="queue-row"
                  type="button"
                  key={`${song.id}-${index}`}
                  onClick={() => {
                    onPlayIndex(index)
                    setIsQueueOpen(false)
                  }}
                >
                  <span className="queue-cover">
                    {song.cover ? <img src={song.cover} alt={song.title} /> : <MusicNotesSimple size={20} weight="fill" />}
                  </span>
                  <span className="queue-copy">
                    <strong>{song.title}</strong>
                    <small>{song.artist}</small>
                  </span>
                  <span>{song.duration}</span>
                </button>
              ))
            ) : (
              <p className="queue-empty">{t('footer.emptyQueue')}</p>
            )}
          </div>
        </aside>
      </div>
    </footer>
  )
}

export default Footer
