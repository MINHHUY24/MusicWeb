import { useEffect, useMemo, useRef, useState } from "react";
import CardMusic from "../components/card_music.jsx";
import LoadingState from "../components/loading_state.jsx";
import { useLanguage } from "../i18n.jsx";

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
  const [clickCounts, setClickCounts] = useState({});

  const favoriteSongs = useMemo(
    () =>
      songs
        .map((song) => ({ ...song, clicks: clickCounts[song.id] ?? song.clicks ?? 0 }))
        .sort((firstSong, secondSong) => secondSong.clicks - firstSong.clicks),
    [clickCounts, songs],
  );

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

    setClickCounts((currentCounts) => ({
      ...currentCounts,
      [songId]: (currentCounts[songId] ?? baseClicks) + 1,
    }));
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
          songs={favoriteSongs}
          getArtist={(song) =>
            `${t(`songs.${song.id}.description`, {}, song.description)} • ${song.clicks} ${t("home.clicks")}`
          }
          onSongClick={handleSongClick}
          player={player}
        />
        <MusicLane title={t("home.chill")} songs={chillLaneSongs} player={player} />
        <MusicLane
          title={t("home.newRelease")}
          songs={newReleaseLaneSongs}
          player={player}
        />
      </div>
    </section>
  );
}

export default Home;
