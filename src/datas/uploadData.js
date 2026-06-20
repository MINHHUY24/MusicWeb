import { categoryDefinitions } from "./categoryData.js";

export const uploadSteps = [
  {
    id: "track-file",
    label: "File nhạc",
    description: "Chọn file audio muốn lưu",
  },
  {
    id: "track-info",
    label: "Thông tin",
    description: "Nhập tên, nghệ sĩ và ảnh bìa",
  },
  {
    id: "track-done",
    label: "Hoàn tất",
    description: "Track đã lưu vào Supabase",
  },
];

export const uploadCategories = categoryDefinitions.map((category) => ({
  value: category.id,
  label: category.title,
}));

export const audioFileAccept =
  "audio/*,.wav,.flac,.aiff,.aif,.alac,.mp3,.m4a,.ogg";

export const coverFileAccept = "image/*";

export const initialUploadForm = {
  title: "",
  artist: "",
  category: "vpop",
  description: "",
};
