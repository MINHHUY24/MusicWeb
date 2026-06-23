import {
  ClockCounterClockwise,
  CircleNotch,
  Heart,
  MusicNotesSimple,
  PencilSimpleLine,
  Play,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LoadingState from "../components/loading_state.jsx";
import UserAvatar from "../components/user_avatar.jsx";
import {
  mapFavoriteTracks,
  mapListeningHistory,
  profileStats,
  userProfile,
} from "../datas/profileData.js";
import { deleteStoredTrack } from "../datas/uploadStorage.js";
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
  const [activeTab, setActiveTab] = useState("favorites");
  const [deletingTrackId, setDeletingTrackId] = useState("");
  const [pendingEditTrack, setPendingEditTrack] = useState(null);
  const [pendingDeleteTrack, setPendingDeleteTrack] = useState(null);
  const [deleteError, setDeleteError] = useState("");
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
      duration:
        track.durationLabel || track.duration || t("profile.unknownDuration"),
      cover: track.cover,
      audio: track.audio,
      meta: formatCreatedAt(track.createdAt, language, t),
      isUploaded: true,
    }));
  }, [language, t, uploadedTracks]);

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

    if (deletingTrackId) return;

    setPendingEditTrack(track);
    setDeleteError("");
  }

  function closeEditDialog() {
    setPendingEditTrack(null);
  }

  function closeDeleteDialog() {
    if (deletingTrackId) return;

    setPendingDeleteTrack(null);
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
          className="profile-delete-dialog-backdrop"
          role="presentation"
          onMouseDown={closeEditDialog}
        >
          <section
            className="profile-delete-dialog profile-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="profile-delete-dialog-icon profile-edit-dialog-icon">
              <PencilSimpleLine size={28} weight="bold" />
            </div>

            <div className="profile-delete-dialog-copy">
              <h3 id="profile-edit-title">{t("profile.editTrackTitle")}</h3>
              <p>
                {t("profile.editTrackConfirm", {
                  title: pendingEditTrack.title,
                })}
              </p>
            </div>

            <div className="profile-delete-dialog-actions">
              <button
                className="profile-delete-cancel"
                type="button"
                onClick={closeEditDialog}
              >
                {t("common.cancel")}
              </button>
              <Link
                className="profile-edit-confirm"
                to={`/upload?edit=${encodeURIComponent(pendingEditTrack.id)}`}
              >
                <PencilSimpleLine size={18} weight="bold" />
                {t("profile.editTrackAction")}
              </Link>
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
