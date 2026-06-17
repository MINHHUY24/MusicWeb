import { useEffect, useMemo, useRef, useState } from "react";
import CardMusic from "../components/card_music.jsx";
import {
  chillSongs,
  newReleaseSongs,
  trendingSongs,
} from "../datas/homeData.js";

function MusicLane({ title, songs: laneSongs, onSongClick, getArtist, player }) {
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
            {isExpanded ? "Thu gọn" : "Xem thêm >"}
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

function Home({ player }) {
  const [clickCounts, setClickCounts] = useState(() =>
    Object.fromEntries(trendingSongs.map((song) => [song.id, song.clicks])),
  );

  const favoriteSongs = useMemo(
    () =>
      trendingSongs
        .map((song) => ({ ...song, clicks: clickCounts[song.id] ?? 0 }))
        .sort((firstSong, secondSong) => secondSong.clicks - firstSong.clicks),
    [clickCounts],
  );

  function handleSongClick(songId) {
    setClickCounts((currentCounts) => ({
      ...currentCounts,
      [songId]: (currentCounts[songId] ?? 0) + 1,
    }));
  }

  return (
    <section className="page-section home-page">
      {/* NOTE: Phần 3 swimlane bài hát cuộn ngang */}
      <div className="home-swimlanes">
        <MusicLane
          title="Trending Music"
          songs={favoriteSongs}
          getArtist={(song) => `${song.description} • ${song.clicks} clicks`}
          onSongClick={handleSongClick}
          player={player}
        />
        <MusicLane title="Chill" songs={chillSongs} player={player} />
        <MusicLane title="Mới phát hành" songs={newReleaseSongs} player={player} />
      </div>
    </section>
  );
}

export default Home;
