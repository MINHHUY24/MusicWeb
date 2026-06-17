import {
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

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'

  const minutes = Math.floor(value / 60)
  const seconds = String(Math.floor(value % 60)).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function Footer({ player }) {
  const audioRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  const {
    currentSong,
    currentSongIndex,
    currentTime,
    isPlaying,
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
    <footer className="player-bar" aria-label="Music player">
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
          <p className="song-title">{currentSong?.title || 'No Song Playing'}</p>
          <p className="song-artist">{currentSong?.artist || 'Unknown Artist'}</p>
        </div>
      </div>

      {/* NOTE: Phần nút điều khiển phát nhạc và timeline */}
      <div className="player-center">
        <div className="player-controls" aria-label="Playback controls">
          <button
            className={isShuffleOn ? 'icon-button icon-button-active' : 'icon-button'}
            type="button"
            aria-label="Shuffle"
            aria-pressed={isShuffleOn}
            onClick={onToggleShuffle}
          >
            <Shuffle size={23} weight="bold" />
          </button>
          <button className="icon-button" type="button" aria-label="Previous" onClick={onPrevious}>
            <SkipBack size={23} weight="fill" />
          </button>
          <button className="play-button" type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={onTogglePlay}>
            {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
          </button>
          <button className="icon-button" type="button" aria-label="Next" onClick={onNext}>
            <SkipForward size={23} weight="fill" />
          </button>
          <button
            className={repeatMode === 'off' ? 'icon-button' : 'icon-button icon-button-active repeat-button'}
            type="button"
            aria-label="Repeat"
            aria-pressed={repeatMode !== 'off'}
            data-repeat-mode={repeatMode}
            onClick={cycleRepeatMode}
          >
            <Repeat size={23} weight="bold" />
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
            aria-label="Tua bài hát"
            style={{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* NOTE: Phần âm lượng và danh sách phát */}
      <div className="player-tools">
        <SpeakerHigh size={25} weight="fill" />
        <input
          className="volume-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label="Âm lượng"
          style={{ '--progress': `${volume * 100}%` }}
        />
        <div className="tool-divider" />
        <button
          className={isQueueOpen ? 'queue-toggle queue-toggle-active' : 'queue-toggle'}
          type="button"
          aria-label="Danh sách tiếp theo"
          aria-expanded={isQueueOpen}
          onClick={() => setIsQueueOpen((value) => !value)}
        >
          <MusicNotesSimple size={25} weight="bold" />
        </button>
      </div>

      <aside className={isQueueOpen ? 'queue-panel queue-panel-open' : 'queue-panel'} aria-label="Danh sách tiếp theo">
        <div className="queue-panel-heading">
          <strong>Tiếp theo</strong>
          <button type="button" onClick={() => setIsQueueOpen(false)} aria-label="Đóng danh sách">
            Đóng
          </button>
        </div>

        <div className="queue-list">
          {nextSongs.length ? (
            nextSongs.map(({ song, index }) => (
              <button className="queue-row" type="button" key={`${song.id}-${index}`} onClick={() => onPlayIndex(index)}>
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
            <p className="queue-empty">Chưa có bài tiếp theo.</p>
          )}
        </div>
      </aside>
    </footer>
  )
}

export default Footer
