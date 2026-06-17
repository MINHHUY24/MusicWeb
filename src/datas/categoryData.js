import { songLibrary } from "./songData.js";

const categoryDefinitions = [
  {
    id: "vpop",
    title: "V-pop",
    description: "Nhạc Việt đang lưu trong thư viện",
    tone: "blue",
  },
  {
    id: "hiphop",
    title: "Hip hop",
    description: "Rap, groove và beat hiện đại",
    tone: "amber",
  },
  {
    id: "pop",
    title: "Pop",
    description: "Pop dễ nghe và bắt tai",
    tone: "mint",
  },
  {
    id: "other",
    title: "Other",
    description: "Các track upload chưa phân loại",
    tone: "violet",
  },
];

export const categories = categoryDefinitions
  .map((category) => {
    const tracks = songLibrary.filter((song) => song.category === category.id);

    return {
      ...category,
      songCount: tracks.length,
      cover: tracks[0]?.cover,
    };
  })
  .filter((category) => category.songCount > 0);

export const categoryTracks = Object.fromEntries(
  categories.map((category) => [
    category.id,
    songLibrary.filter((song) => song.category === category.id),
  ]),
);
