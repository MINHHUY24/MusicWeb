import {
  ArrowLeft,
  BookOpenText,
  MusicNotesSimple,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import LoadingState from "../components/loading_state.jsx";
import { useLanguage } from "../i18n.jsx";
import "../styles/song_detail.css";

function hashSongValue(value = "") {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getSongTheme(song) {
  const hash = hashSongValue(`${song.id}:${song.title}:${song.artist}`);
  const hueA = hash % 360;
  const hueB = (hueA + 74 + (hash % 36)) % 360;
  const hueC = (hueA + 184 + (hash % 52)) % 360;

  return {
    "--song-detail-a": `hsl(${hueA} 88% 64% / 0.42)`,
    "--song-detail-b": `hsl(${hueB} 82% 58% / 0.34)`,
    "--song-detail-c": `hsl(${hueC} 88% 66% / 0.28)`,
    "--song-detail-solid": `hsl(${hueA} 72% 70%)`,
    "--song-detail-ink": `hsl(${hueA} 72% 9%)`,
  };
}

function decodeSongId(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getTrackLyricsValue(track) {
  return track?.lyrics || track?.lyricsText || track?.lyric || track?.lyricText || "";
}

function parseLyricsTimestamp(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?$/);

  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fractionText = match[3] || "0";
  const fraction = Number(fractionText.padEnd(3, "0").slice(0, 3)) / 1000;
  const timestamp = minutes * 60 + seconds + fraction;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getSyncedLyricsLines(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .flatMap((rawLine) => {
      const timestampMatches = [...rawLine.matchAll(/\[([0-9:.]+)\]/g)];
      const text = rawLine.replace(/\[[^\]]+\]/g, "").trim();

      if (!text || !timestampMatches.length) return [];

      return timestampMatches
        .map((match) => parseLyricsTimestamp(match[1]))
        .filter((time) => Number.isFinite(time))
        .map((time) => ({
          text,
          time,
        }));
    })
    .sort((left, right) => left.time - right.time);
}

function getLyricsLines(track) {
  const lyrics = getTrackLyricsValue(track);

  if (Array.isArray(lyrics)) {
    return lyrics
      .map((line) => String(line?.text ?? line).trim())
      .filter(Boolean);
  }

  return String(lyrics)
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]+\]/g, "").trim())
    .filter(Boolean);
}

function getLocalTimedLyricsLines(track) {
  const lyrics = getTrackLyricsValue(track);

  if (Array.isArray(lyrics)) {
    return lyrics
      .map((line) => ({
        text: String(line?.text || "").trim(),
        time: Number(line?.time),
      }))
      .filter((line) => line.text && Number.isFinite(line.time));
  }

  return getSyncedLyricsLines(lyrics);
}

function getDurationSeconds(song) {
  const directDuration = Number(song?.durationSeconds);

  if (Number.isFinite(directDuration) && directDuration > 0) {
    return directDuration;
  }

  const durationText = String(song?.duration || song?.durationLabel || "");
  const durationParts = durationText.split(":").map((part) => Number(part));

  if (durationParts.length === 2 && durationParts.every(Number.isFinite)) {
    return durationParts[0] * 60 + durationParts[1];
  }

  if (durationParts.length === 3 && durationParts.every(Number.isFinite)) {
    return durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
  }

  return 0;
}

function getRemoteTimedLines(remoteLyrics, remoteLyricsMatchesSong) {
  if (!remoteLyricsMatchesSong || !Array.isArray(remoteLyrics.timedLines)) {
    return [];
  }

  return remoteLyrics.timedLines
    .map((line) => ({
      text: String(line?.text || "").trim(),
      time: Number(line?.time),
    }))
    .filter((line) => line.text && Number.isFinite(line.time));
}

function getActiveLyricsIndex(entries, currentTime, durationSeconds) {
  if (!entries.length) return -1;

  const safeCurrentTime = Number.isFinite(Number(currentTime))
    ? Number(currentTime)
    : 0;
  const hasSyncedTiming = entries.some((entry) => Number.isFinite(entry.time));

  if (hasSyncedTiming) {
    return entries.reduce((activeIndex, entry, index) => {
      if (!Number.isFinite(entry.time)) return activeIndex;

      return entry.time <= safeCurrentTime + 0.2 ? index : activeIndex;
    }, -1);
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return -1;
  }

  const progress = Math.min(Math.max(safeCurrentTime / durationSeconds, 0), 1);

  return Math.min(entries.length - 1, Math.floor(progress * entries.length));
}

function SongDetail({ player, tracks = [], isLoading = false, error = "" }) {
  const { t } = useLanguage();
  const { songId = "" } = useParams();
  const navigate = useNavigate();
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const pendingLyricsKeyRef = useRef("");
  const lyricsListRef = useRef(null);
  const [remoteLyrics, setRemoteLyrics] = useState({
    error: "",
    key: "",
    lines: [],
    source: "",
    status: "idle",
    timedLines: [],
  });
  const decodedSongId = decodeSongId(songId);
  const currentSong = player?.currentSong;
  const activeSongId = currentSong?.id || decodedSongId;
  const song =
    tracks.find((track) => track.id === activeSongId) ||
    (currentSong?.id === activeSongId ? currentSong : null) ||
    tracks.find((track) => track.id === decodedSongId) ||
    null;
  const localLyricsLines = song ? getLyricsLines(song) : [];
  const localTimedLyricsLines = song ? getLocalTimedLyricsLines(song) : [];
  const lyricsLookupKey = song
    ? `${song.title || ""}::${song.artist || ""}`
    : "";
  const remoteLyricsMatchesSong = remoteLyrics.key === lyricsLookupKey;
  const remoteTimedLines = getRemoteTimedLines(
    remoteLyrics,
    remoteLyricsMatchesSong,
  );
  const remoteLyricsLines = remoteLyricsMatchesSong ? remoteLyrics.lines : [];
  const lyricsEntries = localTimedLyricsLines.length
    ? localTimedLyricsLines
    : remoteTimedLines.length
      ? remoteTimedLines
      : remoteLyricsLines.length
        ? remoteLyricsLines.map((line) => ({ text: line }))
        : localLyricsLines.map((line) => ({ text: line }));
  const songDurationSeconds = getDurationSeconds(song);
  const activeLyricsIndex = getActiveLyricsIndex(
    lyricsEntries,
    player?.currentTime,
    songDurationSeconds,
  );
  const lyricsStatus = lyricsEntries.length
    ? "loaded"
    : isLyricsOpen &&
        song &&
        (!remoteLyricsMatchesSong || remoteLyrics.status === "idle")
      ? "loading"
      : remoteLyricsMatchesSong
      ? remoteLyrics.status
      : "idle";

  useEffect(() => {
    if (!currentSong?.id || currentSong.id === decodedSongId) return;

    navigate(`/song_detail/${encodeURIComponent(currentSong.id)}`, {
      replace: true,
    });
  }, [currentSong?.id, decodedSongId, navigate]);

  useEffect(() => {
    if (!song || !isLyricsOpen || localTimedLyricsLines.length) return undefined;
    if (
      remoteLyricsMatchesSong &&
      ["loading", "loaded", "not-found", "error"].includes(
        remoteLyrics.status,
      )
    ) {
      return undefined;
    }
    if (pendingLyricsKeyRef.current === lyricsLookupKey) return undefined;

    const controller = new AbortController();
    const query = new URLSearchParams({
      artist: song.artist || "",
      title: song.title || "",
    });

    if (songDurationSeconds > 0) {
      query.set("duration", String(Math.round(songDurationSeconds)));
    }

    pendingLyricsKeyRef.current = lyricsLookupKey;

    fetch(`/api/lyrics?${query.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (response.status === 404) {
          return {
            error: payload.error || t("songDetail.noLyrics"),
            lines: [],
            source: "",
            status: "not-found",
            timedLines: [],
          };
        }

        if (!response.ok) {
          throw new Error(payload.error || t("songDetail.lyricsFetchFailed"));
        }

        const onlineLyricsLines = Array.isArray(payload.lines)
          ? payload.lines.map((line) => String(line).trim()).filter(Boolean)
          : getLyricsLines({ lyrics: payload.lyrics || "" });
        const onlineTimedLines = Array.isArray(payload.timedLines)
          ? payload.timedLines
              .map((line) => ({
                text: String(line?.text || "").trim(),
                time: Number(line?.time),
              }))
              .filter((line) => line.text && Number.isFinite(line.time))
          : [];

        return {
          error: "",
          lines: onlineLyricsLines,
          source: payload.source || "",
          status:
            onlineLyricsLines.length || onlineTimedLines.length
              ? "loaded"
              : "not-found",
          timedLines: onlineTimedLines,
        };
      })
      .then((result) => {
        if (controller.signal.aborted) return;

        if (pendingLyricsKeyRef.current === lyricsLookupKey) {
          pendingLyricsKeyRef.current = "";
        }

        setRemoteLyrics({
          key: lyricsLookupKey,
          ...result,
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;

        if (pendingLyricsKeyRef.current === lyricsLookupKey) {
          pendingLyricsKeyRef.current = "";
        }

        setRemoteLyrics({
          error:
            error instanceof Error
              ? error.message
              : t("songDetail.lyricsFetchFailed"),
          key: lyricsLookupKey,
          lines: [],
          source: "",
          status: "error",
          timedLines: [],
        });
      });

    return () => {
      if (pendingLyricsKeyRef.current === lyricsLookupKey) {
        pendingLyricsKeyRef.current = "";
      }

      controller.abort();
    };
  }, [
    isLyricsOpen,
    localTimedLyricsLines.length,
    lyricsLookupKey,
    remoteLyrics.status,
    remoteLyricsMatchesSong,
    song,
    songDurationSeconds,
    t,
  ]);

  useEffect(() => {
    if (!isLyricsOpen || activeLyricsIndex < 0) return;

    const lyricsList = lyricsListRef.current;
    const activeLine = lyricsListRef.current?.querySelector(
      `[data-lyrics-index="${activeLyricsIndex}"]`,
    );

    if (!lyricsList || !activeLine) return;

    const frameId = window.requestAnimationFrame(() => {
      const listRect = lyricsList.getBoundingClientRect();
      const lineRect = activeLine.getBoundingClientRect();
      const centeredOffset =
        lineRect.top -
        listRect.top -
        lyricsList.clientHeight / 2 +
        lineRect.height / 2;

      lyricsList.scrollTo({
        top: lyricsList.scrollTop + centeredOffset,
        behavior: player?.isPlaying ? "smooth" : "auto",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeLyricsIndex, isLyricsOpen, player?.isPlaying, song?.id]);

  if (isLoading) {
    return (
      <section className="page-section song-detail-page">
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
      <section className="page-section song-detail-page">
        <LoadingState
          title={t("common.musicLoadErrorTitle")}
          description={error}
          variant="error"
        />
      </section>
    );
  }

  if (!song) {
    return <Navigate to="/" replace />;
  }

  const songTheme = getSongTheme(song);
  const stageClassName = isLyricsOpen
    ? "song-detail-stage song-detail-stage-lyrics-open"
    : "song-detail-stage";

  return (
    <section
      className="page-section song-detail-page"
      style={songTheme}
      aria-label={t("songDetail.aria", { title: song.title })}
    >
      <div className="song-detail-heading">
        <Link
          className="song-detail-back"
          to="/"
          aria-label={t("songDetail.back")}
        >
          <ArrowLeft size={19} weight="bold" />
        </Link>
      </div>

      <section className={stageClassName}>
        <div className="song-detail-cover-shell">
          <div className="song-detail-cover">
            {song.cover ? (
              <img
                src={song.cover}
                alt={t("songDetail.coverAlt", { title: song.title })}
              />
            ) : (
              <MusicNotesSimple size={86} weight="fill" />
            )}
          </div>
        </div>

        <div className="song-detail-copy">
          <h2>{song.title}</h2>
          <p>{song.artist || t("common.unknownArtist")}</p>

          <button
            className={
              isLyricsOpen
                ? "song-detail-lyrics-toggle song-detail-lyrics-toggle-active"
                : "song-detail-lyrics-toggle"
            }
            type="button"
            aria-controls="song-detail-lyrics-panel"
            aria-expanded={isLyricsOpen}
            onClick={() => setIsLyricsOpen((value) => !value)}
          >
            <BookOpenText size={20} weight="bold" />
            {isLyricsOpen
              ? t("songDetail.hideLyrics")
              : t("songDetail.showLyrics")}
          </button>
        </div>

        {isLyricsOpen ? (
          <aside
            className="song-detail-lyrics-panel"
            id="song-detail-lyrics-panel"
            aria-label={t("songDetail.lyrics")}
          >
            <div className="song-detail-lyrics-heading">
              <span>{t("songDetail.lyrics")}</span>
              <strong>{song.title}</strong>
            </div>

            {lyricsEntries.length ? (
              <div className="song-detail-lyrics-lines" ref={lyricsListRef}>
                {lyricsEntries.map((entry, index) => (
                  <p
                    className={
                      index === activeLyricsIndex
                        ? "song-detail-lyrics-line song-detail-lyrics-line-active"
                        : index < activeLyricsIndex
                          ? "song-detail-lyrics-line song-detail-lyrics-line-past"
                          : "song-detail-lyrics-line"
                    }
                    data-lyrics-index={index}
                    key={`${entry.text}-${index}`}
                    aria-current={
                      index === activeLyricsIndex ? "true" : undefined
                    }
                  >
                    {entry.text}
                  </p>
                ))}
              </div>
            ) : lyricsStatus === "loading" ? (
              <p className="song-detail-lyrics-empty">
                {t("songDetail.loadingLyrics")}
              </p>
            ) : lyricsStatus === "error" ? (
              <p className="song-detail-lyrics-empty">
                {remoteLyrics.error || t("songDetail.lyricsFetchFailed")}
              </p>
            ) : (
              <p className="song-detail-lyrics-empty">
                {t("songDetail.noLyrics")}
              </p>
            )}
          </aside>
        ) : null}
      </section>
    </section>
  );
}

export default SongDetail;
