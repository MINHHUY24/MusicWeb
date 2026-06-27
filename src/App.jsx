import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import AuthGate from './components/auth_gate.jsx'
import Footer from './components/footer.jsx'
import Sidebar from './components/sidebar.jsx'
import Topbar from './components/topbar.jsx'
import {
  createStoredPlaylist,
  deleteStoredPlaylist,
  getStoredPlaylists,
  updateStoredPlaylist,
} from './datas/playlistStorage.js'
import { getSupabaseClient } from './lib/supabaseClient.js'
import Category from './pages/category.jsx'
import CategoryDetail from './pages/category_detail.jsx'
import Home from './pages/home.jsx'
import Playlist from './pages/playlist.jsx'
import PlaylistDetail from './pages/playlist_detail.jsx'
import Profile from './pages/profile.jsx'
import SongDetail from './pages/song_detail.jsx'
import Upload from './pages/upload.jsx'

const compactSidebarQuery = '(max-width: 760px)'
const favoriteTracksStorageKey = 'musicweb:favorite-track-ids'
const listeningHistoryStorageKey = 'musicweb:listening-history-track-ids'

function readStoredTrackIds(storageKey) {
  if (typeof window === 'undefined') return []

  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) || '[]')

    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeStoredTrackIds(storageKey, trackIds) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(storageKey, JSON.stringify(trackIds))
}

function getTrackId(track) {
  return track?.sourceId || track?.id || ''
}

function getSupabaseErrorMessage(payload, fallbackMessage) {
  return payload?.error || fallbackMessage
}

function buildCategoriesFromTracks(tracks) {
  const categories = new Map()

  tracks.forEach((track) => {
    if (!track.category) return

    const currentCategory = categories.get(track.category) ?? {
      id: track.category,
      title: track.categoryLabel || track.category,
      description: track.description || '',
      tone: 'blue',
      songCount: 0,
      cover: '',
    }

    currentCategory.songCount += 1
    currentCategory.cover = currentCategory.cover || track.cover || ''
    categories.set(track.category, currentCategory)
  })

  return Array.from(categories.values())
}

function getIsCompactSidebar() {
  return typeof window !== 'undefined' && window.matchMedia(compactSidebarQuery).matches
}

function App() {
  const location = useLocation()
  const [isCompactSidebar, setIsCompactSidebar] = useState(getIsCompactSidebar)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getIsCompactSidebar)
  const [musicLibrary, setMusicLibrary] = useState([])
  const [musicCategories, setMusicCategories] = useState([])
  const [uploadedTracks, setUploadedTracks] = useState([])
  const [uploadedTracksLoadError, setUploadedTracksLoadError] = useState('')
  const [customPlaylists, setCustomPlaylists] = useState([])
  const [customPlaylistsLoadError, setCustomPlaylistsLoadError] = useState('')
  const [playerQueue, setPlayerQueue] = useState([])
  const [isMusicLoading, setIsMusicLoading] = useState(true)
  const [musicLoadError, setMusicLoadError] = useState('')
  const [authSession, setAuthSession] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [supabaseClient, setSupabaseClient] = useState(null)
  const [isAuthConfigured, setIsAuthConfigured] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')
  const [currentSongId, setCurrentSongId] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState("off")
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [favoriteTrackIds, setFavoriteTrackIds] = useState(() => readStoredTrackIds(favoriteTracksStorageKey))
  const [listeningHistoryTrackIds, setListeningHistoryTrackIds] = useState(() =>
    readStoredTrackIds(listeningHistoryStorageKey),
  )

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

  useEffect(() => {
    writeStoredTrackIds(favoriteTracksStorageKey, favoriteTrackIds)
  }, [favoriteTrackIds])

  useEffect(() => {
    writeStoredTrackIds(listeningHistoryStorageKey, listeningHistoryTrackIds)
  }, [listeningHistoryTrackIds])

  useEffect(() => {
    let isMounted = true
    let authSubscription = null

    async function syncSession() {
      try {
        const client = await getSupabaseClient()

        if (!isMounted) return

        setSupabaseClient(client)
        setIsAuthConfigured(true)

        const { data, error } = await client.auth.getSession()

        if (!isMounted) return

        if (error) {
          setAuthError(error.message)
        }

        setAuthSession(data.session ?? null)
        setAuthUser(data.session?.user ?? null)
        setIsAuthLoading(false)

        authSubscription = client.auth.onAuthStateChange((_event, session) => {
          setAuthSession(session)
          setAuthUser(session?.user ?? null)
          setAuthError('')
          setIsSigningIn(false)
        }).data.subscription
      } catch (error) {
        if (!isMounted) return

        setAuthError(error instanceof Error ? error.message : 'Không thể đọc cấu hình Supabase Auth.')
        setIsAuthConfigured(false)
        setIsAuthLoading(false)
      }
    }

    syncSession()

    return () => {
      isMounted = false
      authSubscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let retryTimer = null

    async function loadSupabaseMusic() {
      if (isAuthLoading) return

      if (retryTimer) {
        window.clearTimeout(retryTimer)
        retryTimer = null
      }

      setIsMusicLoading(true)
      setMusicLoadError('')
      setUploadedTracksLoadError('')
      setCustomPlaylistsLoadError('')
      let didLoadMusic = false
      const authHeaders = authSession?.access_token
        ? { Authorization: `Bearer ${authSession.access_token}` }
        : {}

      try {
        const [tracksResponse, categoriesResponse] = await Promise.all([
          fetch('/api/tracks'),
          fetch('/api/categories'),
        ])

        const [tracksPayload, categoriesPayload] = await Promise.all([
          tracksResponse.json().catch(() => ({})),
          categoriesResponse.json().catch(() => ({})),
        ])

        if (!tracksResponse.ok || !categoriesResponse.ok) {
          throw new Error(
            getSupabaseErrorMessage(
              tracksResponse.ok ? categoriesPayload : tracksPayload,
              'Không thể tải dữ liệu từ Supabase.',
            ),
          )
        }

        const tracks = tracksPayload.tracks ?? []
        const categories = categoriesPayload.categories ?? []
        let nextUploadedTracks = []
        let nextUploadedTracksLoadError = ''
        let nextCustomPlaylists = []
        let nextCustomPlaylistsLoadError = ''

        if (authSession?.access_token) {
          try {
            const uploadedTracksResponse = await fetch('/api/me/tracks', {
              headers: authHeaders,
            })
            const uploadedTracksPayload = await uploadedTracksResponse.json().catch(() => ({}))

            if (!uploadedTracksResponse.ok) {
              throw new Error(
                getSupabaseErrorMessage(
                  uploadedTracksPayload,
                  'Không thể tải nhạc đã upload của tài khoản.',
                ),
              )
            }

            nextUploadedTracks = uploadedTracksPayload.tracks ?? []
          } catch (error) {
            nextUploadedTracksLoadError =
              error instanceof Error ? error.message : 'Không thể tải nhạc đã upload của tài khoản.'
          }

          try {
            const playlistPayload = await getStoredPlaylists(authSession.access_token)

            nextCustomPlaylists = playlistPayload.playlists
            nextCustomPlaylistsLoadError = playlistPayload.warning
          } catch (error) {
            nextCustomPlaylistsLoadError =
              error instanceof Error ? error.message : 'Không thể tải danh sách phát của tài khoản.'
          }
        }

        if (!isMounted) return

        const nextCategories = categories.length ? categories : buildCategoriesFromTracks(tracks)
        const nextTrackById = new Map(tracks.map((track) => [track.id, track]))

        setUploadedTracks(nextUploadedTracks)
        setUploadedTracksLoadError(nextUploadedTracksLoadError)
        setCustomPlaylists(nextCustomPlaylists)
        setCustomPlaylistsLoadError(nextCustomPlaylistsLoadError)
        setMusicLibrary(tracks)
        setMusicCategories(nextCategories)
        didLoadMusic = true
        setPlayerQueue((currentQueue) => {
          if (!currentQueue.length) return tracks

          return currentQueue
            .map((song) => nextTrackById.get(song.id))
            .filter(Boolean)
        })
        setCurrentSongId((songId) => {
          if (!songId || nextTrackById.has(songId)) return songId

          setIsPlaying(false)
          setCurrentTime(0)
          return ''
        })
      } catch (error) {
        if (!isMounted) return

        setUploadedTracks([])
        setUploadedTracksLoadError('')
        setCustomPlaylists([])
        setCustomPlaylistsLoadError('')
        setMusicLibrary([])
        setMusicCategories([])
        setPlayerQueue([])
        setCurrentSongId('')
        setIsPlaying(false)
        setMusicLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu từ Supabase.')
        setIsMusicLoading(false)
        retryTimer = window.setTimeout(loadSupabaseMusic, 2500)
      } finally {
        if (isMounted && didLoadMusic) {
          setIsMusicLoading(false)
        }
      }
    }

    loadSupabaseMusic()
    window.addEventListener('musicweb:tracks-updated', loadSupabaseMusic)

    return () => {
      isMounted = false
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
      window.removeEventListener('musicweb:tracks-updated', loadSupabaseMusic)
    }
  }, [authSession?.access_token, isAuthLoading])

  async function signInWithGoogle() {
    const client = supabaseClient ?? await getSupabaseClient().catch((error) => {
      setAuthError(error instanceof Error ? error.message : 'Không thể đọc cấu hình Supabase Auth.')
      setIsAuthConfigured(false)
      return null
    })

    if (!client) {
      return
    }

    setSupabaseClient(client)
    setIsAuthConfigured(true)
    setIsSigningIn(true)
    setAuthError('')

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        scopes: 'email profile',
      },
    })

    if (error) {
      setAuthError(error.message)
      setIsSigningIn(false)
    }
  }

  async function signOut() {
    const client = supabaseClient ?? await getSupabaseClient().catch(() => null)

    if (!client) return

    const { error } = await client.auth.signOut()

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthSession(null)
    setAuthUser(null)
  }

  async function updateProfileName(displayName) {
    const client = supabaseClient ?? await getSupabaseClient().catch(() => null)

    if (!client) return

    const { data, error } = await client.auth.updateUser({
      data: {
        display_name: displayName,
        full_name: displayName,
        name: displayName,
      },
    })

    if (error) {
      setAuthError(error.message)
      return
    }

    setAuthUser(data.user)
  }

  async function createPlaylist(playlist) {
    if (!authSession?.access_token) {
      throw new Error('Bạn cần đăng nhập Google để lưu danh sách phát.')
    }

    const createdPlaylist = await createStoredPlaylist(playlist, authSession.access_token)

    setCustomPlaylists((currentPlaylists) => [
      createdPlaylist,
      ...currentPlaylists.filter((currentPlaylist) => currentPlaylist.id !== createdPlaylist.id),
    ])
    setCustomPlaylistsLoadError('')

    return createdPlaylist
  }

  async function updatePlaylist(playlistId, playlist) {
    if (!authSession?.access_token) {
      throw new Error('Bạn cần đăng nhập Google để cập nhật danh sách phát.')
    }

    const updatedPlaylist = await updateStoredPlaylist(playlistId, playlist, authSession.access_token)

    setCustomPlaylists((currentPlaylists) =>
      currentPlaylists.map((currentPlaylist) =>
        currentPlaylist.id === updatedPlaylist.id ? updatedPlaylist : currentPlaylist,
      ),
    )
    setCustomPlaylistsLoadError('')

    return updatedPlaylist
  }

  async function deletePlaylist(playlistId) {
    if (!authSession?.access_token) {
      throw new Error('Bạn cần đăng nhập Google để xóa danh sách phát.')
    }

    await deleteStoredPlaylist(playlistId, authSession.access_token)
    setCustomPlaylists((currentPlaylists) =>
      currentPlaylists.filter((currentPlaylist) => currentPlaylist.id !== playlistId),
    )
    setCustomPlaylistsLoadError('')
  }

  const appClassName = [
    'app-shell',
    isSidebarCollapsed ? 'app-sidebar-collapsed' : '',
    isCompactSidebar ? 'app-sidebar-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const isHomeWaitingPage = location.pathname === '/' && (isMusicLoading || musicLoadError)
  const isContainedScrollPage =
    isHomeWaitingPage ||
    ['/category', '/playlist', '/profile', '/upload'].includes(location.pathname) ||
    location.pathname.startsWith('/category/') ||
    location.pathname.startsWith('/playlist/') ||
    location.pathname.startsWith('/song_detail/')
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
  const musicTrackById = useMemo(() => new Map(musicLibrary.map((track) => [track.id, track])), [musicLibrary])
  const favoriteTracks = useMemo(
    () => favoriteTrackIds.map((trackId) => musicTrackById.get(trackId)).filter(Boolean),
    [favoriteTrackIds, musicTrackById],
  )
  const listeningHistoryTracks = useMemo(
    () => listeningHistoryTrackIds.map((trackId) => musicTrackById.get(trackId)).filter(Boolean),
    [listeningHistoryTrackIds, musicTrackById],
  )
  const isCurrentSongFavorite = currentSong ? favoriteTrackIds.includes(getTrackId(currentSong)) : false

  function rememberPlayedTrack(track) {
    const trackId = getTrackId(track)

    if (!trackId) return

    setListeningHistoryTrackIds((currentTrackIds) => [
      trackId,
      ...currentTrackIds.filter((currentTrackId) => currentTrackId !== trackId),
    ].slice(0, 80))
  }

  function toggleCurrentFavorite() {
    const trackId = getTrackId(currentSong)

    if (!trackId) return

    setFavoriteTrackIds((currentTrackIds) =>
      currentTrackIds.includes(trackId)
        ? currentTrackIds.filter((currentTrackId) => currentTrackId !== trackId)
        : [trackId, ...currentTrackIds],
    )
  }

  function playQueue(queue, startIndex = 0) {
    const playableQueue = queue.filter((song) => song?.audio)

    if (!playableQueue.length) return

    const safeIndex = Math.min(Math.max(startIndex, 0), playableQueue.length - 1)

    setPlayerQueue(playableQueue)
    setCurrentSongId(playableQueue[safeIndex].id)
    setCurrentTime(0)
    setIsPlaying(true)
    rememberPlayedTrack(playableQueue[safeIndex])
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
      playQueue(musicLibrary, 0)
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
    isCurrentSongFavorite,
    onEnded: playNext,
    onToggleFavorite: toggleCurrentFavorite,
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
  const auth = {
    error: authError,
    isAuthenticated: Boolean(authSession?.access_token),
    isConfigured: isAuthConfigured,
    isLoading: isAuthLoading,
    isSigningIn,
    session: authSession,
    signInWithGoogle,
    signOut,
    updateProfileName,
    user: authUser,
  }

  return (
    <div className={appClassName}>
      {/* NOTE: Phần topbar ở trên cùng */}
      <Topbar auth={auth} player={player} songs={musicLibrary} />

      <div className="app-layout">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((value) => !value)}
        />

        {/* NOTE: Phần nội dung trang thay đổi theo route */}
        <main className={pageContentClassName}>
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  player={player}
                  songs={musicLibrary}
                  isLoading={isMusicLoading}
                  error={musicLoadError}
                />
              }
            />
            <Route
              path="/category"
              element={
                <AuthGate auth={auth}>
                  <Category
                    categories={musicCategories}
                    isLoading={isMusicLoading}
                    error={musicLoadError}
                  />
                </AuthGate>
              }
            />
            <Route
              path="/category/:categoryId"
              element={
                <AuthGate auth={auth}>
                  <CategoryDetail
                    categories={musicCategories}
                    player={player}
                    tracks={musicLibrary}
                    isLoading={isMusicLoading}
                    error={musicLoadError}
                  />
                </AuthGate>
              }
            />
            <Route
              path="/playlist"
              element={
                <AuthGate auth={auth}>
                  <Playlist
                    tracks={musicLibrary}
                    customPlaylists={customPlaylists}
                    customPlaylistsError={customPlaylistsLoadError}
                    isLoading={isMusicLoading}
                    error={musicLoadError}
                    onCreatePlaylist={createPlaylist}
                    onUpdatePlaylist={updatePlaylist}
                    onDeletePlaylist={deletePlaylist}
                  />
                </AuthGate>
              }
            />
            <Route
              path="/playlist/:playlistId"
              element={
                <AuthGate auth={auth}>
                  <PlaylistDetail
                    player={player}
                    tracks={musicLibrary}
                    customPlaylists={customPlaylists}
                    isLoading={isMusicLoading}
                    error={musicLoadError}
                  />
                </AuthGate>
              }
            />
            <Route
              path="/song_detail/:songId"
              element={
                <SongDetail
                  player={player}
                  tracks={musicLibrary}
                  isLoading={isMusicLoading}
                  error={musicLoadError}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <AuthGate auth={auth}>
                  <Profile
                    auth={auth}
                    player={player}
                    tracks={musicLibrary}
                    favoriteTracks={favoriteTracks}
                    listeningHistoryTracks={listeningHistoryTracks}
                    uploadedTracks={uploadedTracks}
                    isLoading={isMusicLoading}
                    error={uploadedTracksLoadError || musicLoadError}
                  />
                </AuthGate>
              }
            />
            <Route
              path="/upload"
              element={
                <AuthGate auth={auth}>
                  <Upload auth={auth} />
                </AuthGate>
              }
            />
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
