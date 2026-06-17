import { useState, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Footer from './components/footer.jsx'
import Sidebar from './components/sidebar.jsx'
import Topbar from './components/topbar.jsx'
import { songLibrary } from './datas/songData.js'
import Category from './pages/category.jsx'
import CategoryDetail from './pages/category_detail.jsx'
import Home from './pages/home.jsx'
import Playlist from './pages/playlist.jsx'
import PlaylistDetail from './pages/playlist_detail.jsx'
import Profile from './pages/profile.jsx'
import Upload from './pages/upload.jsx'

const compactSidebarQuery = '(max-width: 760px)'

function getIsCompactSidebar() {
  return typeof window !== 'undefined' && window.matchMedia(compactSidebarQuery).matches
}

function App() {
  const location = useLocation()
  const [isCompactSidebar, setIsCompactSidebar] = useState(getIsCompactSidebar)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getIsCompactSidebar)
  const [playerQueue, setPlayerQueue] = useState(songLibrary)
  const [currentSongId, setCurrentSongId] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState("off")
  const [volume, setVolume] = useState(0.58)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const mediaQuery = window.matchMedia(compactSidebarQuery)

    function syncSidebarMode(event) {
      setIsCompactSidebar(event.matches)
      setIsSidebarCollapsed(event.matches)
    }

    syncSidebarMode(mediaQuery)
    mediaQuery.addEventListener('change', syncSidebarMode)

    return () => {
      mediaQuery.removeEventListener('change', syncSidebarMode)
    }
  }, [])

  const appClassName = [
    'app-shell',
    isSidebarCollapsed ? 'app-sidebar-collapsed' : '',
    isCompactSidebar ? 'app-sidebar-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const isContainedScrollPage =
    ['/category', '/playlist', '/profile'].includes(location.pathname) ||
    location.pathname.startsWith('/category/') ||
    location.pathname.startsWith('/playlist/')
  const pageContentClassName = [
    'page-content',
    isContainedScrollPage ? 'page-content-contained' : '',
    location.pathname === '/profile' ? 'page-content-profile' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const currentSongIndex = playerQueue.findIndex((song) => song.id === currentSongId)
  const normalizedCurrentIndex = currentSongIndex >= 0 ? currentSongIndex : 0
  const currentSong = currentSongIndex >= 0 ? playerQueue[currentSongIndex] : null

  function playQueue(queue, startIndex = 0) {
    const playableQueue = queue.filter((song) => song?.audio)

    if (!playableQueue.length) return

    const safeIndex = Math.min(Math.max(startIndex, 0), playableQueue.length - 1)

    setPlayerQueue(playableQueue)
    setCurrentSongId(playableQueue[safeIndex].id)
    setCurrentTime(0)
    setIsPlaying(true)
  }

  function playSongById(songId, queue = playerQueue) {
    const nextQueue = queue.filter((song) => song?.audio)
    const songIndex = nextQueue.findIndex((song) => song.id === songId)

    if (songIndex < 0) return

    playQueue(nextQueue, songIndex)
  }

  function playQueueIndex(index) {
    playQueue(playerQueue, index)
  }

  function togglePlay() {
    if (!currentSong) {
      playQueue(songLibrary, 0)
      return
    }

    setIsPlaying((value) => !value)
  }

  function playNext() {
    if (!playerQueue.length) return

    if (currentSongIndex < 0) {
      playQueue(playerQueue, 0)
      return
    }

    if (isShuffleOn && playerQueue.length > 1) {
      let nextIndex = normalizedCurrentIndex

      while (nextIndex === normalizedCurrentIndex) {
        nextIndex = Math.floor(Math.random() * playerQueue.length)
      }

      playQueue(playerQueue, nextIndex)
      return
    }

    const isLastSong = normalizedCurrentIndex >= playerQueue.length - 1

    if (isLastSong && repeatMode !== "all") {
      setIsPlaying(false)
      return
    }

    playQueue(playerQueue, isLastSong ? 0 : normalizedCurrentIndex + 1)
  }

  function playPrevious() {
    if (!playerQueue.length) return

    if (currentSongIndex < 0) {
      playQueue(playerQueue, 0)
      return
    }

    const isFirstSong = normalizedCurrentIndex <= 0
    playQueue(playerQueue, isFirstSong ? playerQueue.length - 1 : normalizedCurrentIndex - 1)
  }

  function cycleRepeatMode() {
    setRepeatMode((mode) => (mode === "off" ? "one" : mode === "one" ? "all" : "off"))
  }

  const player = {
    currentSong,
    currentSongIndex,
    currentTime,
    isPlaying,
    isShuffleOn,
    playerQueue,
    repeatMode,
    volume,
    cycleRepeatMode,
    onEnded: playNext,
    onPlayIndex: playQueueIndex,
    onPrevious: playPrevious,
    onNext: playNext,
    onSeek: setCurrentTime,
    onTimeUpdate: setCurrentTime,
    onTogglePlay: togglePlay,
    onToggleShuffle: () => setIsShuffleOn((value) => !value),
    onVolumeChange: setVolume,
    playQueue,
    playSongById,
  }

  return (
    <div className={appClassName}>
      {/* NOTE: Phần topbar ở trên cùng */}
      <Topbar />

      <div className="app-layout">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((value) => !value)}
        />

        {/* NOTE: Phần nội dung trang thay đổi theo route */}
        <main className={pageContentClassName}>
          <Routes>
            <Route path="/" element={<Home player={player} />} />
            <Route path="/category" element={<Category />} />
            <Route path="/category/:categoryId" element={<CategoryDetail player={player} />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/playlist/:playlistId" element={<PlaylistDetail player={player} />} />
            <Route path="/profile" element={<Profile player={player} />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* NOTE: Phần footer / thanh phát nhạc dưới cùng */}
      <Footer player={player} />
    </div>
  )
}

export default App
