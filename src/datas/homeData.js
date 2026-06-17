import { songLibrary } from "./songData.js";

export const trendingSongs = songLibrary;

export const chillSongs = [
  ...songLibrary.filter((song) => song.category === "vpop"),
  ...songLibrary.filter((song) => song.category !== "vpop"),
];

export const newReleaseSongs = [...songLibrary].reverse();
