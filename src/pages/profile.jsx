import {
  ClockCounterClockwise,
  Heart,
  MusicNotesSimple,
  Play,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  favoriteTracks,
  listeningHistory,
  profileStats,
  userProfile,
} from "../datas/profileData.js";
import { getStoredTracks, isUploadStorageAvailable } from "../datas/uploadStorage.js";
import "../styles/profile.css";

const profileTabs = [
  { id: "favorites", label: "Yêu thích", icon: Heart },
  { id: "history", label: "Lịch sử", icon: ClockCounterClockwise },
  { id: "uploaded", label: "Nhạc đã up", icon: UploadSimple },
];

function formatCreatedAt(value) {
  if (!value) return "Local upload";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function revokeObjectUrls(urls) {
  Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
}

function Profile({ player }) {
  const [activeTab, setActiveTab] = useState("favorites");
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [uploadedUrls, setUploadedUrls] = useState({});
  const uploadedUrlsRef = useRef({});

  useEffect(() => {
    let isMounted = true;

    if (!isUploadStorageAvailable()) {
      return undefined;
    }

    getStoredTracks().then((tracks) => {
      const urls = {};

      tracks.forEach((track) => {
        if (track.coverBlob) {
          urls[`${track.id}-cover`] = URL.createObjectURL(track.coverBlob);
        }

        if (track.audioBlob) {
          urls[`${track.id}-audio`] = URL.createObjectURL(track.audioBlob);
        }
      });

      if (isMounted) {
        uploadedUrlsRef.current = urls;
        setUploadedUrls(urls);
        setUploadedTracks(tracks);
      } else {
        revokeObjectUrls(urls);
      }
    });

    return () => {
      isMounted = false;
      revokeObjectUrls(uploadedUrlsRef.current);
    };
  }, []);

  const uploadedRows = useMemo(() => {
    return uploadedTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.durationLabel || "Chưa rõ",
      cover: uploadedUrls[`${track.id}-cover`],
      audio: uploadedUrls[`${track.id}-audio`],
      meta: formatCreatedAt(track.createdAt),
    }));
  }, [uploadedTracks, uploadedUrls]);

  const tabsWithCount = useMemo(
    () =>
      profileTabs.map((tab) => ({
        ...tab,
        count:
          tab.id === "favorites"
            ? favoriteTracks.length
            : tab.id === "history"
              ? listeningHistory.length
              : uploadedRows.length,
      })),
    [uploadedRows.length],
  );

  const activeTracks = useMemo(() => {
    if (activeTab === "history") return listeningHistory;
    if (activeTab === "uploaded") return uploadedRows;

    return favoriteTracks;
  }, [activeTab, uploadedRows]);

  const displayStats = profileStats.map((stat) =>
    stat.id === "uploaded" ? { ...stat, value: uploadedRows.length } : stat,
  );

  return (
    <section className="page-section profile-page">
      {/* NOTE: Profile hero - thông tin người dùng */}
      <section className="profile-hero" aria-label="Profile information">
        <div className="profile-cover" />

        <div className="profile-identity">
          <div className="profile-avatar">
            <img src={userProfile.avatar} alt={userProfile.name} />
          </div>

          <div className="profile-copy">
            <span>{userProfile.username}</span>
            <h2>{userProfile.name}</h2>
            <p>{userProfile.bio}</p>
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
      <section className="profile-music-panel" aria-label="Profile music">
        <div className="profile-music-heading">
          <div>
            <h2>Nhạc của bạn</h2>
            <p>Chia theo bài yêu thích, lịch sử nghe và các track đã upload.</p>
          </div>

          <span className="profile-music-badge">
            <Sparkle size={17} weight="fill" />
            {activeTracks.length} bài
          </span>
        </div>

        <div className="profile-tabs" role="tablist" aria-label="Music sections">
          {tabsWithCount.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={isActive ? "profile-tab profile-tab-active" : "profile-tab"}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={19} weight={isActive ? "fill" : "bold"} />
                <span>{tab.label}</span>
                <small>{tab.count}</small>
              </button>
            );
          })}
        </div>

        {activeTracks.length ? (
          <div className="profile-track-list">
            {activeTracks.map((track, index) => (
              <button
                className="profile-track-row"
                type="button"
                key={track.id}
                onClick={() => player?.playQueue(activeTracks, index)}
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

                <span className="profile-track-meta">{track.meta}</span>
                <span className="profile-track-duration">{track.duration}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="profile-empty-state">
            <UploadSimple size={42} weight="bold" />
            <strong>Chưa có nhạc đã upload</strong>
            <span>Upload track đầu tiên để danh sách này tự cập nhật.</span>
            <Link to="/upload">Đi tới Upload</Link>
          </div>
        )}
      </section>
    </section>
  );
}

export default Profile;
