import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CaretRight,
  Check,
  ClockCounterClockwise,
  GlobeHemisphereWest,
  MagnifyingGlass,
  PencilSimple,
  SignOut,
  User,
  Waveform,
  X,
} from "@phosphor-icons/react";
import { useLanguage } from "../i18n.jsx";
import LoginCard from "./login_card.jsx";
import UserAvatar from "./user_avatar.jsx";
import { getUserAvatar, getUserDisplayName } from "../lib/supabaseClient.js";

const searchModes = [
  { id: "all", labelKey: "topbar.searchModes.all" },
  { id: "songs", labelKey: "topbar.searchModes.songs" },
  { id: "artists", labelKey: "topbar.searchModes.artists" },
];

const languageOptions = [
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
];

function normalizeSearchValue(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getArtistMatches(songs, normalizedQuery) {
  const artists = new Map();

  songs.forEach((song) => {
    const artistName = song.artist || "Unknown artist";
    const normalizedArtist = normalizeSearchValue(artistName);
    const currentArtist = artists.get(artistName) ?? {
      id: normalizedArtist || artistName,
      name: artistName,
      songs: [],
    };

    currentArtist.songs.push(song);
    artists.set(artistName, currentArtist);
  });

  return Array.from(artists.values()).filter((artist) =>
    normalizeSearchValue(artist.name).includes(normalizedQuery),
  );
}

function Topbar({ auth, songs = [], player }) {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [searchMode, setSearchMode] = useState("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [draftLanguage, setDraftLanguage] = useState(language);
  const [languageSearch, setLanguageSearch] = useState("");
  const [profileName, setProfileName] = useState("");
  const searchRef = useRef(null);
  const accountRef = useRef(null);
  const normalizedQuery = normalizeSearchValue(searchValue);
  const hasSearch = normalizedQuery.length > 0;
  const userName = getUserDisplayName(auth?.user);
  const userAvatar = getUserAvatar(auth?.user);
  const isAuthenticated = Boolean(auth?.isAuthenticated);

  const searchResults = useMemo(() => {
    if (!hasSearch) return { songs: [], artists: [] };

    const shouldSearchSongs = searchMode === "songs" || searchMode === "all";
    const shouldSearchArtists =
      searchMode === "artists" || searchMode === "all";
    const matchedSongs = shouldSearchSongs
      ? songs.filter((song) => {
          const title = normalizeSearchValue(song.title);
          const artist = normalizeSearchValue(song.artist);

          if (searchMode === "all") {
            return (
              title.includes(normalizedQuery) ||
              artist.includes(normalizedQuery)
            );
          }

          return title.includes(normalizedQuery);
        })
      : [];

    const matchedArtists = shouldSearchArtists
      ? getArtistMatches(songs, normalizedQuery)
      : [];

    return {
      songs: matchedSongs.slice(0, 6),
      artists: matchedArtists.slice(0, 5),
    };
  }, [hasSearch, normalizedQuery, searchMode, songs]);

  const shouldShowSearchPanel = isSearchFocused || hasSearch;
  const hasResults =
    searchResults.songs.length > 0 || searchResults.artists.length > 0;
  const currentLanguageLabel =
    languageOptions.find((option) => option.id === language)?.label ||
    "Tiếng Việt";
  const normalizedLanguageSearch = normalizeSearchValue(languageSearch);
  const filteredLanguageOptions = languageOptions.filter((option) =>
    normalizeSearchValue(option.label).includes(normalizedLanguageSearch),
  );

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }

      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false);
        setIsLanguageDialogOpen(false);
      }
    }

    function handleDocumentKeyDown(event) {
      if (event.key !== "Escape") return;

      setIsSearchFocused(false);
      setIsAccountOpen(false);
      setIsLanguageDialogOpen(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, []);

  function openLanguageDialog() {
    setDraftLanguage(language);
    setLanguageSearch("");
    setIsLanguageDialogOpen(true);
  }

  function confirmLanguageChange() {
    setLanguage(draftLanguage);
    setIsLanguageDialogOpen(false);
  }

  function handleSongClick(song) {
    const songIndex = songs.findIndex((item) => item.id === song.id);

    player?.playQueue(songs, Math.max(songIndex, 0));
    setIsSearchFocused(false);
  }

  function handleArtistClick(artist) {
    setSearchValue(artist.name);
    setSearchMode("artists");
    setIsSearchFocused(true);
  }

  function openProfilePage(activeTab = "") {
    setIsAccountOpen(false);
    setIsEditingName(false);
    setIsLanguageDialogOpen(false);
    navigate(
      "/profile",
      activeTab
        ? {
            state: { activeTab },
          }
        : undefined,
    );
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    const nextName = profileName.trim();

    if (!nextName) return;

    await auth?.updateProfileName(nextName);
    setIsEditingName(false);
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
          <MagnifyingGlass size={24} weight="bold" />
          <input
            type="text"
            value={searchValue}
            placeholder={t("topbar.searchPlaceholder")}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          {hasSearch ? (
            <button
              className="search-clear"
              type="button"
              aria-label={t("topbar.clearSearch")}
              onClick={() => {
                setSearchValue("");
                setIsSearchFocused(true);
              }}
            >
              <X size={18} weight="bold" />
            </button>
          ) : null}
        </label>

        {shouldShowSearchPanel ? (
          <div className="search-panel">
            <div
              className="search-mode-tabs"
              role="tablist"
              aria-label={t("topbar.searchType")}
            >
              {searchModes.map((mode) => (
                <button
                  className={
                    searchMode === mode.id
                      ? "search-mode-tab search-mode-tab-active"
                      : "search-mode-tab"
                  }
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
                      <p>{t("topbar.resultGroups.songs")}</p>
                      {searchResults.songs.map((song) => (
                        <button
                          className="search-result-row"
                          type="button"
                          key={song.id}
                          onClick={() => handleSongClick(song)}
                        >
                          <span className="search-result-cover">
                            {song.cover ? (
                              <img src={song.cover} alt={song.title} />
                            ) : null}
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
                      <p>{t("topbar.resultGroups.artists")}</p>
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
                            <small>
                              {t("topbar.artistSongCount", {
                                count: artist.songs.length,
                              })}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="search-empty">{t("topbar.noResults")}</div>
              )
            ) : (
              <div className="search-empty">{t("topbar.hint")}</div>
            )}
          </div>
        ) : null}
      </div>

      {/* NOTE: Phần nút profile bên phải */}
      <div className="account-area" ref={accountRef}>
        <button
          className="profile-button"
          type="button"
          aria-label={t("topbar.profile")}
          aria-expanded={isAccountOpen}
          onClick={() => {
            const nextOpen = !isAccountOpen;

            setIsAccountOpen(nextOpen);

            if (!nextOpen) {
              setIsLanguageDialogOpen(false);
            }
          }}
        >
          {isAuthenticated ? (
            <UserAvatar
              className="profile-button-avatar"
              src={userAvatar}
              name={userName}
            />
          ) : (
            <User size={25} weight="bold" />
          )}
        </button>

        {isAccountOpen ? (
          <div
            className={
              isAuthenticated
                ? "account-dialog"
                : "account-dialog account-dialog-auth"
            }
          >
            {isAuthenticated ? (
              <section
                className={
                  isEditingName
                    ? "account-profile-module account-profile-module-editing"
                    : "account-profile-module"
                }
              >
                {isEditingName ? (
                  <div className="account-user-row">
                    <UserAvatar
                      className="account-avatar"
                      src={userAvatar}
                      name={userName}
                    />
                    <div className="account-name-copy">
                      <span>{t("topbar.account")}</span>
                      <form
                        className="account-name-form"
                        onSubmit={handleProfileSubmit}
                      >
                        <input
                          type="text"
                          value={profileName}
                          aria-label={t("topbar.displayName")}
                          onChange={(event) =>
                            setProfileName(event.target.value)
                          }
                        />
                        <button type="submit">{t("common.save")}</button>
                      </form>
                      <small>
                        {auth.user?.email || t("topbar.googleReady")}
                      </small>
                    </div>
                  </div>
                ) : (
                  <button
                    className="account-profile-summary"
                    type="button"
                    onClick={() => openProfilePage()}
                  >
                    <UserAvatar
                      className="account-avatar"
                      src={userAvatar}
                      name={userName}
                    />
                    <div className="account-name-copy">
                      <span>{t("topbar.account")}</span>
                      <strong>{userName}</strong>
                      <small>
                        {auth.user?.email || t("topbar.googleReady")}
                      </small>
                    </div>
                  </button>
                )}
                {!isEditingName ? (
                  <button
                    className="account-edit-button"
                    type="button"
                    aria-label={t("topbar.editAccount")}
                    onClick={(event) => {
                      event.stopPropagation();
                      setProfileName(userName);
                      setIsEditingName(true);
                    }}
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                ) : null}
              </section>
            ) : (
              <LoginCard
                mode="compact"
                error={
                  auth?.isConfigured ? auth?.error : t("auth.configMissing")
                }
                isLoading={auth?.isSigningIn}
                onSignIn={auth?.signInWithGoogle}
              />
            )}

            <section
              className={
                isAuthenticated
                  ? "account-menu-module"
                  : "account-menu-module account-menu-module-compact"
              }
              aria-label={t("topbar.accountMenu")}
            >
              {isAuthenticated ? (
                <button
                  className="account-menu-row"
                  type="button"
                  onClick={() => openProfilePage("history")}
                >
                  <span className="account-menu-icon">
                    <ClockCounterClockwise size={22} weight="bold" />
                  </span>
                  <span className="account-menu-label">
                    {t("topbar.history")}
                  </span>
                  <CaretRight
                    className="account-menu-chevron"
                    size={18}
                    weight="bold"
                  />
                </button>
              ) : null}

              <button
                className="account-menu-row account-menu-row-language"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isLanguageDialogOpen}
                onClick={openLanguageDialog}
              >
                <span className="account-menu-icon">
                  <GlobeHemisphereWest size={22} weight="bold" />
                </span>
                <span className="account-menu-label">
                  {t("topbar.language")}
                </span>
                <span className="account-menu-value">
                  {currentLanguageLabel}
                </span>
                <CaretRight
                  className="account-menu-chevron"
                  size={18}
                  weight="bold"
                />
              </button>

              {/* <div className="account-menu-row account-menu-row-appearance">
                <span className="account-menu-icon">
                  <CircleHalf size={22} weight="fill" />
                </span>
                <span className="account-menu-label">
                  {t("topbar.appearance")}
                </span>
                <div
                  className="appearance-options"
                  role="group"
                  aria-label={t("topbar.appearancePicker")}
                >
                  {appearanceOptions.map((option) => (
                    <button
                      className={
                        appearanceMode === option.id
                          ? "appearance-option appearance-option-active"
                          : "appearance-option"
                      }
                      type="button"
                      key={option.id}
                      aria-pressed={appearanceMode === option.id}
                      onClick={() => setAppearanceMode(option.id)}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div> */}
            </section>

            {isAuthenticated ? (
              <button
                className="account-sign-out"
                type="button"
                onClick={auth?.signOut}
              >
                <SignOut size={18} weight="bold" />
                {t("topbar.signOut")}
              </button>
            ) : null}
          </div>
        ) : null}

        {isLanguageDialogOpen ? (
          <div
            className="language-dialog"
            role="dialog"
            aria-modal="false"
            aria-label={t("topbar.languagePicker")}
          >
            <div className="language-dialog-heading">
              <strong>{t("topbar.languagePicker")}</strong>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setIsLanguageDialogOpen(false)}
              >
                <X size={17} weight="bold" />
              </button>
            </div>

            <label className="language-dialog-search">
              <MagnifyingGlass size={18} weight="bold" />
              <input
                type="text"
                value={languageSearch}
                placeholder={t("topbar.languageSearch")}
                onChange={(event) => setLanguageSearch(event.target.value)}
              />
            </label>

            <div className="language-dialog-list">
              {filteredLanguageOptions.length ? (
                filteredLanguageOptions.map((option) => (
                  <button
                    className={
                      draftLanguage === option.id
                        ? "language-dialog-option language-dialog-option-active"
                        : "language-dialog-option"
                    }
                    type="button"
                    key={option.id}
                    aria-pressed={draftLanguage === option.id}
                    onClick={() => setDraftLanguage(option.id)}
                  >
                    <span>{option.label}</span>
                    {draftLanguage === option.id ? (
                      <Check size={18} weight="bold" />
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="language-dialog-empty">
                  {t("topbar.languageNoResults")}
                </p>
              )}
            </div>

            <button
              className="language-dialog-confirm"
              type="button"
              onClick={confirmLanguageChange}
            >
              {t("topbar.languageConfirm")}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default Topbar;
