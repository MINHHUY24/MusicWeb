import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, MagnifyingGlass, PencilSimple, SignOut, User, Waveform, X } from '@phosphor-icons/react'
import { useLanguage } from '../i18n.jsx'
import LoginCard from './login_card.jsx'
import UserAvatar from './user_avatar.jsx'
import { getUserAvatar, getUserDisplayName } from '../lib/supabaseClient.js'

const searchModes = [
  { id: 'songs', labelKey: 'topbar.searchModes.songs' },
  { id: 'artists', labelKey: 'topbar.searchModes.artists' },
  { id: 'all', labelKey: 'topbar.searchModes.all' },
]

function normalizeSearchValue(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function getArtistMatches(songs, normalizedQuery) {
  const artists = new Map()

  songs.forEach((song) => {
    const artistName = song.artist || 'Unknown artist'
    const normalizedArtist = normalizeSearchValue(artistName)
    const currentArtist = artists.get(artistName) ?? {
      id: normalizedArtist || artistName,
      name: artistName,
      songs: [],
    }

    currentArtist.songs.push(song)
    artists.set(artistName, currentArtist)
  })

  return Array.from(artists.values()).filter((artist) =>
    normalizeSearchValue(artist.name).includes(normalizedQuery),
  )
}

function Topbar({ auth, songs = [], player }) {
  const { language, setLanguage, t } = useLanguage()
  const [searchValue, setSearchValue] = useState('')
  const [searchMode, setSearchMode] = useState('songs')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [profileName, setProfileName] = useState('')
  const searchRef = useRef(null)
  const accountRef = useRef(null)
  const normalizedQuery = normalizeSearchValue(searchValue)
  const hasSearch = normalizedQuery.length > 0
  const userName = getUserDisplayName(auth?.user)
  const userAvatar = getUserAvatar(auth?.user)
  const isAuthenticated = Boolean(auth?.isAuthenticated)

  const searchResults = useMemo(() => {
    if (!hasSearch) return { songs: [], artists: [] }

    const matchedSongs = songs.filter((song) => {
      const title = normalizeSearchValue(song.title)
      const artist = normalizeSearchValue(song.artist)

      if (searchMode === 'artists') return artist.includes(normalizedQuery)
      if (searchMode === 'all') {
        return title.includes(normalizedQuery) || artist.includes(normalizedQuery)
      }

      return title.includes(normalizedQuery)
    })

    const matchedArtists =
      searchMode === 'songs' ? [] : getArtistMatches(songs, normalizedQuery)

    return {
      songs: matchedSongs.slice(0, 6),
      artists: matchedArtists.slice(0, 5),
    }
  }, [hasSearch, normalizedQuery, searchMode, songs])

  const shouldShowSearchPanel = isSearchFocused || hasSearch
  const hasResults = searchResults.songs.length > 0 || searchResults.artists.length > 0

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false)
      }

      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    }
  }, [])

  function handleSongClick(song) {
    const songIndex = songs.findIndex((item) => item.id === song.id)

    player?.playQueue(songs, Math.max(songIndex, 0))
    setIsSearchFocused(false)
  }

  function handleArtistClick(artist) {
    setSearchValue(artist.name)
    setSearchMode('artists')
    setIsSearchFocused(true)
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()

    const nextName = profileName.trim()

    if (!nextName) return

    await auth?.updateProfileName(nextName)
    setIsEditingName(false)
  }

  return (
    // NOTE: Phần topbar
    <header className="topbar">
      {/* NOTE: Phần logo bên trái */}
      <div className="brand-mark" aria-label="MusicWeb">
        <Waveform size={54} weight="bold" />
      </div>

      {/* NOTE: Phần thanh search ở giữa */}
      <div className="search-area" ref={searchRef}>
        <label className="search-box">
          <MagnifyingGlass size={31} weight="bold" />
          <input
            type="text"
            value={searchValue}
            placeholder={t('topbar.searchPlaceholder')}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          {hasSearch ? (
            <button
              className="search-clear"
              type="button"
              aria-label={t('topbar.clearSearch')}
              onClick={() => {
                setSearchValue('')
                setIsSearchFocused(true)
              }}
            >
              <X size={18} weight="bold" />
            </button>
          ) : null}
        </label>

        {shouldShowSearchPanel ? (
          <div className="search-panel">
            <div className="search-mode-tabs" role="tablist" aria-label={t('topbar.searchType')}>
              {searchModes.map((mode) => (
                <button
                  className={searchMode === mode.id ? 'search-mode-tab search-mode-tab-active' : 'search-mode-tab'}
                  type="button"
                  role="tab"
                  aria-selected={searchMode === mode.id}
                  key={mode.id}
                  onClick={() => setSearchMode(mode.id)}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>

            {hasSearch ? (
              hasResults ? (
                <div className="search-results">
                  {searchResults.songs.length ? (
                    <div className="search-result-group">
                      <p>{t('topbar.resultGroups.songs')}</p>
                      {searchResults.songs.map((song) => (
                        <button
                          className="search-result-row"
                          type="button"
                          key={song.id}
                          onClick={() => handleSongClick(song)}
                        >
                          <span className="search-result-cover">
                            {song.cover ? <img src={song.cover} alt={song.title} /> : null}
                          </span>
                          <span className="search-result-copy">
                            <strong>{song.title}</strong>
                            <small>{song.artist}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {searchResults.artists.length ? (
                    <div className="search-result-group">
                      <p>{t('topbar.resultGroups.artists')}</p>
                      {searchResults.artists.map((artist) => (
                        <button
                          className="search-result-row"
                          type="button"
                          key={artist.name}
                          onClick={() => handleArtistClick(artist)}
                        >
                          <span className="search-result-avatar">
                            <User size={20} weight="bold" />
                          </span>
                          <span className="search-result-copy">
                            <strong>{artist.name}</strong>
                            <small>{t('topbar.artistSongCount', { count: artist.songs.length })}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="search-empty">{t('topbar.noResults')}</div>
              )
            ) : (
              <div className="search-empty">{t('topbar.hint')}</div>
            )}
          </div>
        ) : null}
      </div>

      {/* NOTE: Phần nút profile bên phải */}
      <div className="account-area" ref={accountRef}>
        <button
          className="profile-button"
          type="button"
          aria-label={t('topbar.profile')}
          aria-expanded={isAccountOpen}
          onClick={() => setIsAccountOpen((value) => !value)}
        >
          {isAuthenticated ? <UserAvatar className="profile-button-avatar" src={userAvatar} name={userName} /> : <User size={25} weight="bold" />}
        </button>

        {isAccountOpen ? (
          <div className={isAuthenticated ? 'account-dialog' : 'account-dialog account-dialog-auth'}>
            {isAuthenticated ? (
              <section className="account-module">
                <div className="account-user-row">
                  <UserAvatar className="account-avatar" src={userAvatar} name={userName} />
                  <div className="account-name-copy">
                    <span>{t('topbar.account')}</span>
                    {isEditingName ? (
                      <form className="account-name-form" onSubmit={handleProfileSubmit}>
                        <input
                          type="text"
                          value={profileName}
                          aria-label={t('topbar.displayName')}
                          onChange={(event) => setProfileName(event.target.value)}
                        />
                        <button type="submit">{t('common.save')}</button>
                      </form>
                    ) : (
                      <strong>{userName}</strong>
                    )}
                    <small>{auth.user?.email || t('topbar.googleReady')}</small>
                  </div>
                </div>
                {!isEditingName ? (
                  <button
                    className="account-edit-button"
                    type="button"
                    aria-label={t('topbar.editAccount')}
                    onClick={() => {
                      setProfileName(userName)
                      setIsEditingName(true)
                    }}
                  >
                    <PencilSimple size={18} weight="bold" />
                  </button>
                ) : null}
              </section>
            ) : (
              <LoginCard
                mode="compact"
                error={auth?.isConfigured ? auth?.error : t('auth.configMissing')}
                isLoading={auth?.isSigningIn}
                onSignIn={auth?.signInWithGoogle}
              />
            )}

            <section className="account-module">
              <div className="account-name-copy">
                <span>{t('topbar.language')}</span>
              </div>
              <div className="language-options" role="group" aria-label={t('topbar.languagePicker')}>
                {[
                  { id: 'vi', label: 'Tiếng Việt' },
                  { id: 'en', label: 'English' },
                ].map((option) => (
                  <button
                    className={language === option.id ? 'language-option language-option-active' : 'language-option'}
                    type="button"
                    key={option.id}
                    onClick={() => setLanguage(option.id)}
                  >
                    {option.label}
                    {language === option.id ? <Check size={16} weight="bold" /> : null}
                  </button>
                ))}
              </div>
            </section>

            {isAuthenticated ? (
              <button className="account-sign-out" type="button" onClick={auth?.signOut}>
                <SignOut size={18} weight="bold" />
                {t('topbar.signOut')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export default Topbar
