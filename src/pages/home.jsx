import { useEffect, useMemo, useRef, useState } from "react";
import CardMusic from "../components/card_music.jsx";
import LoadingState from "../components/loading_state.jsx";
import { useLanguage } from "../i18n.jsx";

const trendingRandomSeed = Math.random().toString(36).slice(2);

function getTrendingRandomRank(songId) {
  const value = `${trendingRandomSeed}:${songId}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function MusicLane({ title, songs: laneSongs, onSongClick, getArtist, player }) {
  const { t } = useLanguage();
  const laneScrollRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const laneScroll = laneScrollRef.current;
    if (!laneScroll) return undefined;

    function syncCanExpand() {
      const cards = Array.from(laneScroll.children);
      const firstCard = cards[0];
      const styles = window.getComputedStyle(laneScroll);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      const cardWidth = firstCard?.getBoundingClientRect().width ?? 0;
      const totalCardWidth = cards.length * cardWidth + Math.max(cards.length - 1, 0) * gap;
      const shouldExpand = totalCardWidth > laneScroll.clientWidth + 1;

      setCanExpand(shouldExpand);
      if (!shouldExpand) {
        setIsExpanded(false);
      }
    }

    syncCanExpand();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncCanExpand);

      return () => {
        window.removeEventListener("resize", syncCanExpand);
      };
    }

    const resizeObserver = new ResizeObserver(syncCanExpand);
    resizeObserver.observe(laneScroll);

    Array.from(laneScroll.children).forEach((card) => {
      resizeObserver.observe(card);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [laneSongs.length]);

  return (
    // NOTE: Swimlane cuộn ngang từ trái sang phải
    <section className="music-lane" aria-label={title}>
      <div className="lane-heading">
        <h2>{title}</h2>
        {canExpand ? (
          <button
            className="lane-more"
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
          >
            {isExpanded ? t("home.collapse") : t("home.seeMore")}
          </button>
        ) : null}
      </div>

      <div
        className={isExpanded ? "lane-scroll lane-scroll-expanded" : "lane-scroll"}
        ref={laneScrollRef}
      >
        {laneSongs.map((song, index) => (
          <CardMusic
            key={song.id}
            title={song.title}
            artist={getArtist ? getArtist(song) : song.artist}
            cover={song.cover}
            onClick={() => {
              onSongClick?.(song.id);
              player?.playQueue(laneSongs, index);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function Home({ player, songs = [], isLoading = false, error = "" }) {
  const { t } = useLanguage();
  const [optimisticClicks, setOptimisticClicks] = useState({});

  const trendingSongs = useMemo(() => {
    return songs
      .map((song) => ({
        ...song,
        clicks: optimisticClicks[song.id] ?? song.clicks ?? 0,
        randomRank: getTrendingRandomRank(song.id),
      }))
      .sort((firstSong, secondSong) => {
        const clickDiff = secondSong.clicks - firstSong.clicks;

        if (clickDiff !== 0) return clickDiff;

        return firstSong.randomRank - secondSong.randomRank;
      });
  }, [optimisticClicks, songs]);

  const chillLaneSongs = useMemo(
    () => [
      ...songs.filter((song) => song.category === "vpop"),
      ...songs.filter((song) => song.category !== "vpop"),
    ],
    [songs],
  );
  const newReleaseLaneSongs = useMemo(() => [...songs].reverse(), [songs]);

  function handleSongClick(songId) {
    const baseClicks = songs.find((song) => song.id === songId)?.clicks ?? 0;

    setOptimisticClicks((currentCounts) => ({
      ...currentCounts,
      [songId]: (currentCounts[songId] ?? baseClicks) + 1,
    }));

    fetch(`/api/tracks/${encodeURIComponent(songId)}/click`, {
      method: "POST",
    })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.track) return;

        setOptimisticClicks((currentCounts) => ({
          ...currentCounts,
          [songId]: payload.track.clicks ?? currentCounts[songId] ?? baseClicks + 1,
        }));
      })
      .catch(() => {
        setOptimisticClicks((currentCounts) => ({
          ...currentCounts,
          [songId]: baseClicks,
        }));
      });
  }

  if (isLoading) {
    return (
      <section className="page-section home-page page-loading-page">
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
      <section className="page-section home-page page-loading-page">
        <LoadingState
          title={t("common.musicLoadErrorTitle")}
          description={error}
          variant="error"
        />
      </section>
    );
  }

  if (!songs.length) {
    return (
      <section className="page-section home-page">
        <LoadingState
          title={t("common.emptyMusicTitle")}
          description={t("common.emptyMusicDescription")}
          variant="empty"
        />
      </section>
    );
  }

  return (
    <section className="page-section home-page">
      {/* NOTE: Phần 3 swimlane bài hát cuộn ngang */}
      <div className="home-swimlanes">
        <MusicLane
          title={t("home.trending")}
          songs={trendingSongs}
          onSongClick={handleSongClick}
          player={player}
        />
        <MusicLane
          title={t("home.chill")}
          songs={chillLaneSongs}
          onSongClick={handleSongClick}
          player={player}
        />
        <MusicLane
          title={t("home.newRelease")}
          songs={newReleaseLaneSongs}
          onSongClick={handleSongClick}
          player={player}
        />
      </div>
    </section>
  );
}

export default Home;
