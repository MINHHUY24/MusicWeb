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
  buildCustomPlaylists,
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

function Playlist({
  tracks = [],
  customPlaylists = [],
  customPlaylistsError = "",
  isLoading = false,
  error = "",
  onCreatePlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
}) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isToneMenuOpen, setIsToneMenuOpen] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitError, setSubmitError] = useState("");
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [activePlaylistMenuId, setActivePlaylistMenuId] = useState("");
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);

  const availableSongs = useMemo(() => mapAvailableSongs(tracks), [tracks]);
  const savedCustomPlaylists = useMemo(
    () => buildCustomPlaylists(customPlaylists, tracks),
    [customPlaylists, tracks],
  );
  const editablePlaylistIds = useMemo(
    () => new Set(savedCustomPlaylists.map((playlist) => playlist.id)),
    [savedCustomPlaylists],
  );
  const playlists = savedCustomPlaylists;

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
  const selectedToneLabel = t(
    `playlistPage.tones.${selectedTone.value}`,
    {},
    selectedTone.label,
  );
  const localizedPlaylists = playlists.map((playlist) =>
    localizePlaylist(playlist, t),
  );

  const filteredSongs = useMemo(() => {
    const keyword = normalizeSearchText(songSearch.trim());

    if (!keyword) return availableSongs;

    return availableSongs.filter((song) => {
      const searchableText = normalizeSearchText(
        `${song.title} ${song.artist}`,
      );

      return searchableText.includes(keyword);
    });
  }, [availableSongs, songSearch]);

  useEffect(() => {
    const hasModalOpen = isDialogOpen || Boolean(playlistToDelete);

    document.body.classList.toggle("playlist-dialog-active", hasModalOpen);

    if (!hasModalOpen) {
      return () => {
        document.body.classList.remove("playlist-dialog-active");
      };
    }

    function handleDialogKeyDown(event) {
      if (event.key !== "Escape") return;

      if (isDialogOpen) {
        setIsDialogOpen(false);
        setIsToneMenuOpen(false);
        setSongSearch("");
        setForm(initialForm);
        setSubmitError("");
        setIsSavingPlaylist(false);
        setDialogMode("create");
        setEditingPlaylist(null);
        return;
      }

      setPlaylistToDelete(null);
      setDeleteError("");
      setIsDeletingPlaylist(false);
    }

    window.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      document.body.classList.remove("playlist-dialog-active");
      window.removeEventListener("keydown", handleDialogKeyDown);
    };
  }, [isDialogOpen, playlistToDelete]);

  useEffect(() => {
    if (!activePlaylistMenuId) return undefined;

    function closeActiveMenu() {
      setActivePlaylistMenuId("");
    }

    function handleMenuKeyDown(event) {
      if (event.key === "Escape") {
        closeActiveMenu();
      }
    }

    window.addEventListener("click", closeActiveMenu);
    window.addEventListener("keydown", handleMenuKeyDown);

    return () => {
      window.removeEventListener("click", closeActiveMenu);
      window.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [activePlaylistMenuId]);

  function openCreateDialog() {
    setDialogMode("create");
    setEditingPlaylist(null);
    setForm(initialForm);
    setSubmitError("");
    setActivePlaylistMenuId("");
    setIsDialogOpen(true);
  }

  function closeCreateDialog() {
    setIsDialogOpen(false);
    setIsToneMenuOpen(false);
    setSongSearch("");
    setForm(initialForm);
    setSubmitError("");
    setIsSavingPlaylist(false);
    setDialogMode("create");
    setEditingPlaylist(null);
  }

  function openEditDialog(playlist) {
    setDialogMode("edit");
    setEditingPlaylist(playlist);
    setActivePlaylistMenuId("");
    setSubmitError("");
    setSongSearch("");
    setForm({
      name: playlist.title || "",
      description: playlist.description || "",
      cover: playlist.cover || "",
      coverName: "",
      tone: playlist.tone || "blue",
      songIds: playlist.trackIds ?? [],
    });
    setIsDialogOpen(true);
  }

  function openDeleteDialog(playlist) {
    setPlaylistToDelete(playlist);
    setActivePlaylistMenuId("");
    setDeleteError("");
  }

  function closeDeleteDialog() {
    setPlaylistToDelete(null);
    setDeleteError("");
    setIsDeletingPlaylist(false);
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

  async function handleSubmit(event) {
    event.preventDefault();

    const playlistName = form.name.trim();

    if (!playlistName) return;

    setSubmitError("");
    setIsSavingPlaylist(true);

    try {
      const playlistPayload = {
        title: playlistName,
        description:
          form.description.trim() || t("playlistPage.defaultDescription"),
        tone: form.tone,
        cover: form.cover,
        trackIds: form.songIds,
      };

      if (dialogMode === "edit") {
        if (!editingPlaylist || !onUpdatePlaylist) {
          throw new Error(t("playlistPage.updateError"));
        }

        await onUpdatePlaylist(editingPlaylist.id, playlistPayload);
      } else {
        if (!onCreatePlaylist) {
          throw new Error(t("playlistPage.saveError"));
        }

        await onCreatePlaylist(playlistPayload);
      }

      closeCreateDialog();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : dialogMode === "edit"
            ? t("playlistPage.updateError")
            : t("playlistPage.saveError"),
      );
    } finally {
      setIsSavingPlaylist(false);
    }
  }

  async function handleDeletePlaylist() {
    if (!playlistToDelete) return;

    setDeleteError("");
    setIsDeletingPlaylist(true);

    try {
      if (!onDeletePlaylist) {
        throw new Error(t("playlistPage.deleteError"));
      }

      await onDeletePlaylist(playlistToDelete.id);
      closeDeleteDialog();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : t("playlistPage.deleteError"),
      );
    } finally {
      setIsDeletingPlaylist(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-section playlist-page">
        <LoadingState
          title={t("common.waitingTitle")}
          description={t("common.waitingMusicDescription")}
          quiet
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section playlist-page">
        <LoadingState
          title={t("common.musicLoadErrorTitle")}
          description={error}
          variant="error"
        />
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
            {customPlaylistsError ? (
              <p className="playlist-panel-error">{customPlaylistsError}</p>
            ) : null}
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
            const canManagePlaylist = editablePlaylistIds.has(playlist.id);

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
                isMenuOpen={activePlaylistMenuId === playlist.id}
                onMenuToggle={
                  canManagePlaylist
                    ? () =>
                        setActivePlaylistMenuId((currentPlaylistId) =>
                          currentPlaylistId === playlist.id ? "" : playlist.id,
                        )
                    : undefined
                }
                onEdit={
                  canManagePlaylist ? () => openEditDialog(playlist) : undefined
                }
                onDelete={
                  canManagePlaylist
                    ? () => openDeleteDialog(playlist)
                    : undefined
                }
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
                <h2 id="playlist-dialog-title">
                  {dialogMode === "edit"
                    ? t("playlistPage.editDialogTitle")
                    : t("playlistPage.newDialogTitle")}
                </h2>
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
                        if (event.currentTarget.contains(event.relatedTarget))
                          return;
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
                                <span>
                                  {t(
                                    `playlistPage.tones.${option.value}`,
                                    {},
                                    option.label,
                                  )}
                                </span>
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
                        <em>
                          {t("playlistPage.songMinute", {
                            count: song.minutes,
                          })}
                        </em>
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
                {submitError ? (
                  <p className="playlist-form-error">{submitError}</p>
                ) : null}
                <button
                  className="playlist-secondary-button"
                  type="button"
                  onClick={closeCreateDialog}
                  disabled={isSavingPlaylist}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="playlist-primary-button"
                  type="submit"
                  disabled={isSavingPlaylist}
                >
                  {isSavingPlaylist
                    ? dialogMode === "edit"
                      ? t("playlistPage.updating")
                      : t("playlistPage.saving")
                    : dialogMode === "edit"
                      ? t("playlistPage.update")
                      : t("playlistPage.save")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {playlistToDelete ? (
        <div className="playlist-dialog-backdrop" role="presentation">
          <section
            className="playlist-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-delete-title"
          >
            <div>
              <h2 id="playlist-delete-title">
                {t("playlistPage.deleteDialogTitle")}
              </h2>
              <p>
                {t("playlistPage.deleteDialogDescription", {
                  name: playlistToDelete.title,
                })}
              </p>
            </div>

            {deleteError ? (
              <p className="playlist-form-error">{deleteError}</p>
            ) : null}

            <div className="playlist-dialog-actions">
              <button
                className="playlist-secondary-button"
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeletingPlaylist}
              >
                {t("common.cancel")}
              </button>
              <button
                className="playlist-danger-button"
                type="button"
                onClick={handleDeletePlaylist}
                disabled={isDeletingPlaylist}
              >
                {isDeletingPlaylist
                  ? t("playlistPage.deleting")
                  : t("playlistPage.confirmDelete")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default Playlist;
