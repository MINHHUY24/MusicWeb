import {
  CaretDown,
  Check,
  ClockCounterClockwise,
  CircleNotch,
  FileAudio,
  Heart,
  Image,
  MagnifyingGlass,
  MusicNotesSimple,
  PencilSimpleLine,
  Play,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LoadingState from "../components/loading_state.jsx";
import UserAvatar from "../components/user_avatar.jsx";
import {
  coverFileAccept,
  initialUploadForm,
  uploadCategories,
} from "../datas/uploadData.js";
import {
  mapFavoriteTracks,
  mapListeningHistory,
  profileStats,
  userProfile,
} from "../datas/profileData.js";
import { deleteStoredTrack, updateUploadedTrack } from "../datas/uploadStorage.js";
import { useLanguage } from "../i18n.jsx";
import { getUserAvatar, getUserDisplayName } from "../lib/supabaseClient.js";
import "../styles/profile.css";

const profileTabs = [
  { id: "favorites", labelKey: "profile.tabs.favorites", icon: Heart },
  {
    id: "history",
    labelKey: "profile.tabs.history",
    icon: ClockCounterClockwise,
  },
  { id: "uploaded", labelKey: "profile.tabs.uploaded", icon: UploadSimple },
];

function formatCreatedAt(value, language, t) {
  if (!value) return t("profile.supabaseUpload");

  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeSearchValue(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function Profile({
  auth,
  player,
  favoriteTracks = [],
  listeningHistoryTracks = [],
  uploadedTracks = [],
  isLoading = false,
  error = "",
}) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const initialActiveTab = profileTabs.some(
    (tab) => tab.id === location.state?.activeTab,
  )
    ? location.state.activeTab
    : "favorites";
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [deletingTrackId, setDeletingTrackId] = useState("");
  const [pendingEditTrack, setPendingEditTrack] = useState(null);
  const [pendingDeleteTrack, setPendingDeleteTrack] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState(initialUploadForm);
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [editCoverPreview, setEditCoverPreview] = useState("");
  const [isEditCategoryPickerOpen, setIsEditCategoryPickerOpen] =
    useState(false);
  const [editCategorySearch, setEditCategorySearch] = useState("");
  const [availableUploadCategories, setAvailableUploadCategories] =
    useState(uploadCategories);
  const editPreviewUrlRef = useRef("");
  const editCategoryPickerRef = useRef(null);
  const favoriteRows = useMemo(
    () => mapFavoriteTracks(favoriteTracks),
    [favoriteTracks],
  );
  const historyRows = useMemo(
    () => mapListeningHistory(listeningHistoryTracks),
    [listeningHistoryTracks],
  );
  const profileName = getUserDisplayName(auth?.user) || userProfile.name;
  const profileAvatar = getUserAvatar(auth?.user) || userProfile.avatar;
  const profileUsername = auth?.user?.email
    ? `@${auth.user.email.split("@")[0]}`
    : userProfile.username;

  const uploadedRows = useMemo(() => {
    return uploadedTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      category: track.category,
      categoryLabel: track.categoryLabel,
      description: track.description,
      durationLabel: track.durationLabel,
      durationSeconds: track.durationSeconds,
      createdAt: track.createdAt,
      duration:
        track.durationLabel || track.duration || t("profile.unknownDuration"),
      cover: track.cover,
      audio: track.audio,
      meta: formatCreatedAt(track.createdAt, language, t),
      isUploaded: true,
    }));
  }, [language, t, uploadedTracks]);

  const selectedEditCategory = useMemo(() => {
    return (
      availableUploadCategories.find(
        (category) => category.value === editForm.category,
      ) ??
      availableUploadCategories[0] ??
      uploadCategories[0]
    );
  }, [availableUploadCategories, editForm.category]);

  const selectedEditCategoryLabel = t(
    `categories.${selectedEditCategory?.value}.title`,
    {},
    selectedEditCategory?.label ?? "",
  );

  const filteredEditCategories = useMemo(() => {
    const searchValue = normalizeSearchValue(editCategorySearch.trim());

    if (!searchValue) {
      return availableUploadCategories;
    }

    return availableUploadCategories.filter((category) => {
      const localizedLabel = t(
        `categories.${category.value}.title`,
        {},
        category.label,
      );

      return normalizeSearchValue(
        `${localizedLabel} ${category.value}`,
      ).includes(searchValue);
    });
  }, [availableUploadCategories, editCategorySearch, t]);

  const tabsWithCount = useMemo(
    () =>
      profileTabs.map((tab) => ({
        ...tab,
        count:
          tab.id === "favorites"
            ? favoriteRows.length
            : tab.id === "history"
              ? historyRows.length
              : uploadedRows.length,
      })),
    [favoriteRows.length, historyRows.length, uploadedRows.length],
  );

  const activeTracks = useMemo(() => {
    if (activeTab === "history") return historyRows;
    if (activeTab === "uploaded") return uploadedRows;

    return favoriteRows;
  }, [activeTab, favoriteRows, historyRows, uploadedRows]);
  const emptyState = useMemo(() => {
    if (activeTab === "favorites") {
      return {
        Icon: Heart,
        title: t("profile.noFavoritesTitle"),
        description: t("profile.noFavoritesDescription"),
      };
    }

    if (activeTab === "history") {
      return {
        Icon: ClockCounterClockwise,
        title: t("profile.noHistoryTitle"),
        description: t("profile.noHistoryDescription"),
      };
    }

    return {
      Icon: UploadSimple,
      title: t("profile.noUploadedTitle"),
      description: t("profile.noUploadedDescription"),
      action: t("profile.goToUpload"),
    };
  }, [activeTab, t]);

  const displayStats = profileStats.map((stat) =>
    stat.id === "uploaded"
      ? {
          ...stat,
          label: t(`profile.stats.${stat.id}`, {}, stat.label),
          value: uploadedRows.length,
        }
      : stat.id === "liked"
        ? {
            ...stat,
            label: t(`profile.stats.${stat.id}`, {}, stat.label),
            value: favoriteRows.length,
          }
        : stat.id === "history"
          ? {
              ...stat,
              label: t(`profile.stats.${stat.id}`, {}, stat.label),
              value: historyRows.length,
            }
          : { ...stat, label: t(`profile.stats.${stat.id}`, {}, stat.label) },
  );
  const EmptyStateIcon = emptyState.Icon;

  useEffect(() => {
    document.body.classList.toggle(
      "profile-delete-dialog-active",
      Boolean(pendingDeleteTrack || pendingEditTrack),
    );

    return () => {
      document.body.classList.remove("profile-delete-dialog-active");
    };
  }, [pendingDeleteTrack, pendingEditTrack]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/categories", {
      headers: auth?.session?.access_token
        ? { Authorization: `Bearer ${auth.session.access_token}` }
        : {},
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("upload.cannotLoadCategories");
        }

        return response.json();
      })
      .then((payload) => {
        const categoriesFromServer = (payload.categories ?? []).map(
          (category) => ({
            value: category.id,
            label: category.title,
          }),
        );

        if (isMounted && categoriesFromServer.length) {
          setAvailableUploadCategories(categoriesFromServer);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableUploadCategories(uploadCategories);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [auth?.session?.access_token]);

  useEffect(() => {
    if (!isEditCategoryPickerOpen) return undefined;

    function handlePointerDown(event) {
      if (editCategoryPickerRef.current?.contains(event.target)) return;

      setIsEditCategoryPickerOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsEditCategoryPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditCategoryPickerOpen]);

  useEffect(() => {
    return () => {
      if (editPreviewUrlRef.current) {
        URL.revokeObjectURL(editPreviewUrlRef.current);
      }
    };
  }, []);

  function handleTrackKeyDown(event, track, index) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest?.("button")) return;

    event.preventDefault();
    player?.playQueue(activeTracks, index);
  }

  function openDeleteDialog(event, track) {
    event.stopPropagation();

    if (deletingTrackId) return;

    setPendingDeleteTrack(track);
    setDeleteError("");
  }

  function openEditDialog(event, track) {
    event.stopPropagation();

    if (deletingTrackId || isSavingEdit) return;

    setDeleteError("");
    setEditError("");
    setEditCoverFile(null);
    setEditCoverPreview(track.cover || "");
    setEditCategorySearch("");
    setIsEditCategoryPickerOpen(false);
    setEditForm({
      ...initialUploadForm,
      title: track.title || "",
      artist: track.artist || "",
      category: track.category || initialUploadForm.category,
      description:
        track.description === "Track upload Supabase"
          ? ""
          : track.description || "",
    });
    setPendingEditTrack(track);
  }

  function closeEditDialog() {
    if (isSavingEdit) return;

    if (editPreviewUrlRef.current) {
      URL.revokeObjectURL(editPreviewUrlRef.current);
      editPreviewUrlRef.current = "";
    }

    setPendingEditTrack(null);
    setEditError("");
    setEditCoverFile(null);
    setEditCoverPreview("");
    setEditCategorySearch("");
    setIsEditCategoryPickerOpen(false);
  }

  function closeDeleteDialog() {
    if (deletingTrackId) return;

    setPendingDeleteTrack(null);
  }

  function updateEditForm(field, value) {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function selectEditCategory(categoryValue) {
    updateEditForm("category", categoryValue);
    setEditCategorySearch("");
    setIsEditCategoryPickerOpen(false);
  }

  function handleEditCoverSelect(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditError(t("upload.invalidImage"));
      return;
    }

    if (editPreviewUrlRef.current) {
      URL.revokeObjectURL(editPreviewUrlRef.current);
    }

    const coverUrl = URL.createObjectURL(file);
    editPreviewUrlRef.current = coverUrl;
    setEditCoverFile(file);
    setEditCoverPreview(coverUrl);
    setEditError("");
  }

  function handleEditCoverDrop(event) {
    event.preventDefault();
    handleEditCoverSelect(event.dataTransfer.files?.[0]);
  }

  async function saveEditTrack() {
    if (!pendingEditTrack || isSavingEdit) return;

    const title = editForm.title.trim();
    const artist = editForm.artist.trim();

    if (!title || !artist) {
      setEditError(t("upload.titleArtistRequired"));
      return;
    }

    const nextTrack = {
      id: pendingEditTrack.id,
      title,
      artist,
      category: selectedEditCategoryLabel,
      categoryValue: selectedEditCategory.value,
      description: editForm.description.trim(),
      durationSeconds: pendingEditTrack.durationSeconds ?? null,
      durationLabel:
        pendingEditTrack.durationLabel ||
        pendingEditTrack.duration ||
        t("profile.unknownDuration"),
      audioFileName: "",
      audioFileType: "",
      audioFileSize: null,
      audioBlob: null,
      coverFileName: editCoverFile?.name ?? "",
      coverFileType: editCoverFile?.type ?? "",
      coverBlob: editCoverFile,
      createdAt: pendingEditTrack.createdAt,
    };

    setIsSavingEdit(true);
    setEditError("");

    try {
      await updateUploadedTrack(
        pendingEditTrack.id,
        nextTrack,
        auth?.session?.access_token,
      );
      closeEditDialog();
      window.dispatchEvent(new CustomEvent("musicweb:tracks-updated"));
    } catch (saveError) {
      setEditError(
        saveError instanceof Error
          ? saveError.message
          : t("upload.updateFailed"),
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function confirmDeleteTrack() {
    if (!pendingDeleteTrack || deletingTrackId) return;

    setDeletingTrackId(pendingDeleteTrack.id);
    setDeleteError("");

    try {
      await deleteStoredTrack(
        pendingDeleteTrack.id,
        auth?.session?.access_token,
      );
      setPendingDeleteTrack(null);
      window.dispatchEvent(new CustomEvent("musicweb:tracks-updated"));
    } catch (deleteTrackError) {
      setDeleteError(
        deleteTrackError instanceof Error
          ? deleteTrackError.message
          : t("profile.deleteTrackFailed"),
      );
    } finally {
      setDeletingTrackId("");
    }
  }

  return (
    <section className="page-section profile-page">
      {/* NOTE: Profile hero - thông tin người dùng */}
      <section className="profile-hero" aria-label={t("profile.info")}>
        <div className="profile-cover" />

        <div className="profile-identity">
          <UserAvatar
            className="profile-avatar"
            src={profileAvatar}
            name={profileName}
          />

          <div className="profile-copy">
            <span>{profileUsername}</span>
            <h2>{profileName}</h2>
          </div>
        </div>

        <div className="profile-stats">
          {displayStats.map((stat) => (
            <div className="profile-stat" key={stat.id}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* NOTE: Profile music - chia nhạc thành 3 tab */}
      <section className="profile-music-panel" aria-label={t("profile.music")}>
        <div
          className="profile-tabs"
          role="tablist"
          aria-label={t("profile.musicSections")}
        >
          {tabsWithCount.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={
                  isActive ? "profile-tab profile-tab-active" : "profile-tab"
                }
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={19} weight={isActive ? "fill" : "bold"} />
                <span>{t(tab.labelKey)}</span>
                <small>{tab.count}</small>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingState
            title={t("common.waitingTitle")}
            description={t("common.waitingMusicDescription")}
            quiet
          />
        ) : error ? (
          <LoadingState
            title={t("common.musicLoadErrorTitle")}
            description={error}
            variant="error"
            quiet
          />
        ) : activeTracks.length ? (
          <div className="profile-track-list">
            {deleteError ? (
              <div className="profile-delete-error">{deleteError}</div>
            ) : null}
            {activeTracks.map((track, index) => (
              <div
                className={
                  [
                    "profile-track-row",
                    track.isUploaded ? "profile-track-row-uploaded" : "",
                    activeTab === "history" ? "profile-track-row-history" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                role="button"
                tabIndex={0}
                key={track.id}
                onClick={() => player?.playQueue(activeTracks, index)}
                onKeyDown={(event) => handleTrackKeyDown(event, track, index)}
              >
                <span className="profile-track-cover">
                  {track.cover ? (
                    <img src={track.cover} alt={track.title} />
                  ) : (
                    <MusicNotesSimple size={26} weight="fill" />
                  )}
                  <span className="profile-track-play">
                    <Play size={16} weight="fill" />
                  </span>
                </span>

                <span className="profile-track-info">
                  <strong>{track.title}</strong>
                  <span>{track.artist}</span>
                </span>

                {activeTab === "history" ? null : (
                  <span className="profile-track-meta">
                    {track.metaKey
                      ? t(track.metaKey)
                      : t(
                          `categories.${track.category}.title`,
                          {},
                          track.meta || "",
                        )}
                  </span>
                )}
                {/* <span className="profile-track-duration">{track.duration}</span> */}
                {track.isUploaded ? (
                  <span className="profile-track-actions">
                    <button
                      className="profile-track-edit"
                      type="button"
                      aria-label={t("profile.editTrack", {
                        title: track.title,
                      })}
                      disabled={deletingTrackId === track.id}
                      onClick={(event) => openEditDialog(event, track)}
                    >
                      <PencilSimpleLine size={18} weight="bold" />
                    </button>
                    <button
                      className="profile-track-delete"
                      type="button"
                      aria-label={t("profile.deleteTrack", {
                        title: track.title,
                      })}
                      disabled={deletingTrackId === track.id}
                      onClick={(event) => openDeleteDialog(event, track)}
                    >
                      {deletingTrackId === track.id ? (
                        <CircleNotch size={18} weight="bold" />
                      ) : (
                        <Trash size={18} weight="bold" />
                      )}
                    </button>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="profile-empty-state">
            <EmptyStateIcon size={42} weight="bold" />
            <strong>{emptyState.title}</strong>
            <span>{emptyState.description}</span>
            {emptyState.action ? (
              <Link to="/upload">{emptyState.action}</Link>
            ) : null}
          </div>
        )}
      </section>

      {pendingEditTrack ? (
        <div
          className="profile-delete-dialog-backdrop profile-track-edit-backdrop"
          role="presentation"
          onMouseDown={closeEditDialog}
        >
          <section
            className={[
              "profile-track-edit-dialog",
              isEditCategoryPickerOpen
                ? "profile-track-edit-dialog-menu-open"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="profile-track-edit-header">
              <div>
                <span>{t("profile.editTrackKicker")}</span>
                <h3 id="profile-edit-title">{t("profile.editTrackTitle")}</h3>
              </div>
              <button
                className="profile-track-edit-close"
                type="button"
                aria-label={t("common.close")}
                disabled={isSavingEdit}
                onClick={closeEditDialog}
              >
                <X size={26} weight="bold" />
              </button>
            </header>

            {editError ? (
              <div className="profile-delete-error" role="alert">
                {editError}
              </div>
            ) : null}

            <div className="upload-stage upload-stage-info profile-track-edit-stage">
              <div className="upload-info-grid profile-track-edit-grid">
                <div className="upload-cover-block">
                  <label
                    className={
                      editCoverPreview
                        ? "upload-cover-dropzone upload-cover-dropzone-filled"
                        : "upload-cover-dropzone"
                    }
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleEditCoverDrop}
                  >
                    <input
                      type="file"
                      accept={coverFileAccept}
                      onChange={(event) =>
                        handleEditCoverSelect(event.target.files?.[0])
                      }
                    />
                    {editCoverPreview ? (
                      <img src={editCoverPreview} alt={t("upload.coverAlt")} />
                    ) : (
                      <span className="upload-cover-empty">
                        <Image size={42} weight="bold" />
                        <strong>{t("upload.cover")}</strong>
                      </span>
                    )}
                  </label>

                  <label className="upload-cover-button">
                    <UploadSimple size={18} weight="bold" />
                    <span>
                      {editCoverFile
                        ? editCoverFile.name
                        : t("upload.uploadImage")}
                    </span>
                    <input
                      type="file"
                      accept={coverFileAccept}
                      onChange={(event) =>
                        handleEditCoverSelect(event.target.files?.[0])
                      }
                    />
                  </label>
                </div>

                <div className="upload-form-fields">
                  <label className="upload-field">
                    <span>{t("upload.trackName")}</span>
                    <input
                      type="text"
                      value={editForm.title}
                      placeholder={t("upload.trackPlaceholder")}
                      onChange={(event) =>
                        updateEditForm("title", event.target.value)
                      }
                    />
                  </label>

                  <label className="upload-field">
                    <span>{t("upload.artist")}</span>
                    <input
                      type="text"
                      value={editForm.artist}
                      placeholder={t("upload.artistPlaceholder")}
                      onChange={(event) =>
                        updateEditForm("artist", event.target.value)
                      }
                    />
                  </label>

                  <label className="upload-field upload-category-field">
                    <span>{t("upload.category")}</span>
                    <div
                      className={[
                        "upload-category-picker",
                        isEditCategoryPickerOpen
                          ? "upload-category-picker-open"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      ref={editCategoryPickerRef}
                    >
                      <button
                        className="upload-category-trigger"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isEditCategoryPickerOpen}
                        onClick={() =>
                          setIsEditCategoryPickerOpen((isOpen) => !isOpen)
                        }
                      >
                        <span>{selectedEditCategoryLabel}</span>
                        <CaretDown size={18} weight="bold" />
                      </button>

                      {isEditCategoryPickerOpen ? (
                        <div
                          className="upload-category-menu"
                          onWheel={(event) => event.stopPropagation()}
                          onTouchMove={(event) => event.stopPropagation()}
                        >
                          <label className="upload-category-search">
                            <MagnifyingGlass size={17} weight="bold" />
                            <input
                              type="search"
                              value={editCategorySearch}
                              placeholder={t("upload.categorySearch")}
                              autoFocus
                              onChange={(event) =>
                                setEditCategorySearch(event.target.value)
                              }
                            />
                          </label>

                          <div
                            className="upload-category-options"
                            role="listbox"
                          >
                            {filteredEditCategories.length ? (
                              filteredEditCategories.map((category) => {
                                const isSelected =
                                  category.value === editForm.category;

                                return (
                                  <button
                                    key={category.value}
                                    className={
                                      isSelected
                                        ? "upload-category-option upload-category-option-selected"
                                        : "upload-category-option"
                                    }
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() =>
                                      selectEditCategory(category.value)
                                    }
                                  >
                                    <span>
                                      {t(
                                        `categories.${category.value}.title`,
                                        {},
                                        category.label,
                                      )}
                                    </span>
                                    {isSelected ? (
                                      <Check size={17} weight="bold" />
                                    ) : null}
                                  </button>
                                );
                              })
                            ) : (
                              <span className="upload-category-empty">
                                {t("upload.noCategoryResults")}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </label>

                  <label className="upload-field">
                    <span>{t("upload.descriptionLabel")}</span>
                    <textarea
                      value={editForm.description}
                      placeholder={t("upload.descriptionPlaceholder")}
                      onChange={(event) =>
                        updateEditForm("description", event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="upload-file-summary">
                <FileAudio size={24} weight="fill" />
                <div>
                  <strong>{pendingEditTrack.title}</strong>
                  <span>{pendingEditTrack.duration}</span>
                </div>
              </div>
            </div>

            <div className="profile-track-edit-actions">
              <button
                className="profile-delete-cancel"
                type="button"
                disabled={isSavingEdit}
                onClick={closeEditDialog}
              >
                {t("common.cancel")}
              </button>
              <button
                className="profile-edit-confirm"
                type="button"
                disabled={isSavingEdit}
                onClick={saveEditTrack}
              >
                {isSavingEdit ? (
                  <CircleNotch size={18} weight="bold" />
                ) : (
                  <Check size={18} weight="bold" />
                )}
                {isSavingEdit ? t("upload.saving") : t("upload.updateTrack")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingDeleteTrack ? (
        <div
          className="profile-delete-dialog-backdrop"
          role="presentation"
          onMouseDown={closeDeleteDialog}
        >
          <section
            className="profile-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="profile-delete-dialog-icon">
              <Trash size={28} weight="bold" />
            </div>

            <div className="profile-delete-dialog-copy">
              <h3 id="profile-delete-title">{t("profile.deleteTrackTitle")}</h3>
              <p>
                {t("profile.deleteTrackConfirm", {
                  title: pendingDeleteTrack.title,
                })}
              </p>
            </div>

            <div className="profile-delete-dialog-actions">
              <button
                className="profile-delete-cancel"
                type="button"
                disabled={Boolean(deletingTrackId)}
                onClick={closeDeleteDialog}
              >
                {t("common.cancel")}
              </button>
              <button
                className="profile-delete-confirm"
                type="button"
                disabled={Boolean(deletingTrackId)}
                onClick={confirmDeleteTrack}
              >
                {deletingTrackId ? (
                  <CircleNotch size={18} weight="bold" />
                ) : (
                  <Trash size={18} weight="bold" />
                )}
                {deletingTrackId
                  ? t("profile.deletingTrack")
                  : t("profile.deleteTrackAction")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default Profile;
