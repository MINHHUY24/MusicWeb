import {
  CaretDown,
  Check,
  Image,
  MagnifyingGlass,
  Sparkle,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CardPlaylist from "../components/card_playlist.jsx";
import LoadingState from "../components/loading_state.jsx";
import {
  buildPlaylists,
  mapAvailableSongs,
  toneOptions,
} from "../datas/playlistData.js";
import { formatMinutes, localizePlaylist, useLanguage } from "../i18n.jsx";
import "../styles/playlist.css";

const initialForm = {
  name: "",
  description: "",
  cover: "",
  coverName: "",
  tone: "blue",
  songIds: [],
};

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function Playlist({ tracks = [], isLoading = false, error = "" }) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isToneMenuOpen, setIsToneMenuOpen] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  const availableSongs = useMemo(() => mapAvailableSongs(tracks), [tracks]);
  const defaultPlaylists = useMemo(() => buildPlaylists(tracks), [tracks]);
  const playlists = useMemo(
    () => [...customPlaylists, ...defaultPlaylists],
    [customPlaylists, defaultPlaylists],
  );

  const selectedSongs = useMemo(
    () => availableSongs.filter((song) => form.songIds.includes(song.id)),
    [availableSongs, form.songIds],
  );

  const totalDuration = useMemo(
    () => selectedSongs.reduce((total, song) => total + song.minutes, 0),
    [selectedSongs],
  );

  const selectedTone =
    toneOptions.find((option) => option.value === form.tone) ?? toneOptions[0];
  const selectedToneLabel = t(`playlistPage.tones.${selectedTone.value}`, {}, selectedTone.label);
  const localizedPlaylists = playlists.map((playlist) => localizePlaylist(playlist, t));

  const filteredSongs = useMemo(() => {
    const keyword = normalizeSearchText(songSearch.trim());

    if (!keyword) return availableSongs;

    return availableSongs.filter((song) => {
      const searchableText = normalizeSearchText(`${song.title} ${song.artist}`);

      return searchableText.includes(keyword);
    });
  }, [availableSongs, songSearch]);

  useEffect(() => {
    document.body.classList.toggle("playlist-dialog-active", isDialogOpen);

    if (!isDialogOpen) {
      return () => {
        document.body.classList.remove("playlist-dialog-active");
      };
    }

    function handleDialogKeyDown(event) {
      if (event.key !== "Escape") return;

      setIsDialogOpen(false);
      setIsToneMenuOpen(false);
      setSongSearch("");
      setForm(initialForm);
    }

    window.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      document.body.classList.remove("playlist-dialog-active");
      window.removeEventListener("keydown", handleDialogKeyDown);
    };
  }, [isDialogOpen]);

  function openCreateDialog() {
    setIsDialogOpen(true);
  }

  function closeCreateDialog() {
    setIsDialogOpen(false);
    setIsToneMenuOpen(false);
    setSongSearch("");
    setForm(initialForm);
  }

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleCoverUpload(event) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = () => {
      setForm((currentForm) => ({
        ...currentForm,
        cover: String(reader.result),
        coverName: file.name,
      }));
    };

    reader.readAsDataURL(file);
  }

  function toggleSong(songId) {
    setForm((currentForm) => {
      const isSelected = currentForm.songIds.includes(songId);

      return {
        ...currentForm,
        songIds: isSelected
          ? currentForm.songIds.filter((id) => id !== songId)
          : [...currentForm.songIds, songId],
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const playlistName = form.name.trim();

    if (!playlistName) return;

    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      title: playlistName,
      description: form.description.trim() || t("playlistPage.defaultDescription"),
      songCount: selectedSongs.length,
      durationMinutes: totalDuration,
      duration: formatMinutes(totalDuration, language),
      tone: form.tone,
      cover: form.cover,
    };

    setCustomPlaylists((currentPlaylists) => [newPlaylist, ...currentPlaylists]);
    closeCreateDialog();
  }

  if (isLoading) {
    return (
      <section className="page-section playlist-page">
        <LoadingState title={t("common.waitingTitle")} description={t("common.waitingMusicDescription")} quiet />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section playlist-page">
        <LoadingState title={t("common.musicLoadErrorTitle")} description={error} variant="error" />
      </section>
    );
  }

  return (
    <section className="page-section playlist-page">
      {/* NOTE: Khu card playlist */}
      <section className="playlist-panel" aria-label={t("playlistPage.aria")}>
        <div className="playlist-panel-heading">
          <div>
            <h2>{t("playlistPage.title")}</h2>
            <p>{t("playlistPage.description")}</p>
          </div>

          <span className="playlist-panel-badge">
            <Sparkle size={17} weight="fill" />
            {playlists.length} {t("common.playlists")}
          </span>
        </div>

        <div className="playlist-grid">
          <CardPlaylist
            title={t("playlistPage.createTitle")}
            description={t("playlistPage.createDescription")}
            isCreate
            tone="blue"
            onClick={openCreateDialog}
          />

          {localizedPlaylists.map((playlist) => {
            const playlistDuration = Number.isFinite(playlist.durationMinutes)
              ? formatMinutes(playlist.durationMinutes, language)
              : playlist.duration;

            return (
              <CardPlaylist
                key={playlist.id}
                title={playlist.title}
                description={playlist.description}
                cover={playlist.cover}
                songCount={playlist.songCount}
                duration={playlistDuration}
                tone={playlist.tone}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              />
            );
          })}
        </div>
      </section>

      {isDialogOpen ? (
        // NOTE: Dialog nhập thông tin tạo playlist
        <div className="playlist-dialog-backdrop" role="presentation">
          <section
            className="playlist-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-dialog-title"
          >
            <div className="playlist-dialog-heading">
              <div>
                <h2 id="playlist-dialog-title">{t("playlistPage.newDialogTitle")}</h2>
              </div>

              <button
                className="playlist-dialog-close"
                type="button"
                aria-label={t("common.close")}
                onClick={closeCreateDialog}
              >
                <X size={22} weight="bold" />
              </button>
            </div>

            <form className="playlist-form" onSubmit={handleSubmit}>
              <div className="playlist-form-main">
                {/* NOTE: Upload ảnh bìa playlist */}
                <label className="playlist-cover-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                  />

                  <span className="playlist-cover-preview">
                    {form.cover ? (
                      <img src={form.cover} alt={t("playlistPage.coverAlt")} />
                    ) : (
                      <span className="playlist-cover-empty">
                        <Image size={32} weight="bold" />
                        <span>{t("playlistPage.cover")}</span>
                      </span>
                    )}
                  </span>

                  <span className="playlist-cover-action">
                    <UploadSimple size={18} weight="bold" />
                    {form.coverName || t("playlistPage.uploadImage")}
                  </span>
                </label>

                {/* NOTE: Thông tin cơ bản của playlist */}
                <div className="playlist-form-fields">
                  <label className="playlist-field">
                    <span>{t("playlistPage.name")}</span>
                    <input
                      type="text"
                      value={form.name}
                      placeholder={t("playlistPage.namePlaceholder")}
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                    />
                  </label>

                  <label className="playlist-field">
                    <span>{t("playlistPage.descriptionLabel")}</span>
                    <textarea
                      value={form.description}
                      placeholder={t("playlistPage.descriptionPlaceholder")}
                      rows="4"
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                    />
                  </label>

                  <div className="playlist-field">
                    <span>{t("playlistPage.vibe")}</span>

                    {/* NOTE: Dropdown chọn màu vibe */}
                    <div
                      className={
                        isToneMenuOpen
                          ? "playlist-tone-select playlist-tone-select-open"
                          : "playlist-tone-select"
                      }
                      onBlur={(event) => {
                        if (event.currentTarget.contains(event.relatedTarget)) return;
                        setIsToneMenuOpen(false);
                      }}
                    >
                      <button
                        className="playlist-tone-button"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isToneMenuOpen}
                        onClick={() => setIsToneMenuOpen((value) => !value)}
                      >
                        <span>{selectedToneLabel}</span>
                        <CaretDown size={18} weight="bold" />
                      </button>

                      {isToneMenuOpen ? (
                        <div
                          className="playlist-tone-menu"
                          role="listbox"
                          aria-label={t("playlistPage.vibe")}
                        >
                          {toneOptions.map((option) => {
                            const isSelected = option.value === form.tone;

                            return (
                              <button
                                className={
                                  isSelected
                                    ? "playlist-tone-option playlist-tone-option-selected"
                                    : "playlist-tone-option"
                                }
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  updateForm("tone", option.value);
                                  setIsToneMenuOpen(false);
                                }}
                              >
                                <span
                                  className={`playlist-tone-dot playlist-tone-dot-${option.value}`}
                                />
                                <span>{t(`playlistPage.tones.${option.value}`, {}, option.label)}</span>
                                {isSelected ? (
                                  <Check size={16} weight="bold" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* NOTE: Chọn bài hát cho playlist */}
              <div className="playlist-song-picker">
                <div className="playlist-song-picker-heading">
                  <div>
                    <h3>{t("playlistPage.songsHeading")}</h3>
                    <p>{t("playlistPage.songsDescription")}</p>
                  </div>

                  <span>
                    {t("playlistPage.selectedSummary", {
                      count: selectedSongs.length,
                      duration: formatMinutes(totalDuration, language),
                    })}
                  </span>
                </div>

                {/* NOTE: Search bài hát trong dialog */}
                <label className="playlist-song-search">
                  <MagnifyingGlass size={18} weight="bold" />
                  <input
                    type="search"
                    value={songSearch}
                    placeholder={t("playlistPage.songSearchPlaceholder")}
                    onChange={(event) => setSongSearch(event.target.value)}
                  />
                </label>

                <div className="playlist-song-list">
                  {filteredSongs.map((song) => {
                    const isSelected = form.songIds.includes(song.id);

                    return (
                      <button
                        className={
                          isSelected
                            ? "playlist-song-option playlist-song-option-selected"
                            : "playlist-song-option"
                        }
                        key={song.id}
                        type="button"
                        onClick={() => toggleSong(song.id)}
                      >
                        <span className="playlist-song-check">
                          {isSelected ? (
                            <Check size={16} weight="bold" />
                          ) : null}
                        </span>
                        <span>
                          <strong>{song.title}</strong>
                          <small>{song.artist}</small>
                        </span>
                        <em>{t("playlistPage.songMinute", { count: song.minutes })}</em>
                      </button>
                    );
                  })}

                  {filteredSongs.length === 0 ? (
                    <p className="playlist-song-empty">
                      {t("playlistPage.noSongResults")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="playlist-dialog-actions">
                <button
                  className="playlist-secondary-button"
                  type="button"
                  onClick={closeCreateDialog}
                >
                  {t("common.cancel")}
                </button>
                <button className="playlist-primary-button" type="submit">
                  {t("playlistPage.save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default Playlist;
