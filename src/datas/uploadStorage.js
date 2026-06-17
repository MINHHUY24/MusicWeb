const DATABASE_NAME = "musicweb-local-datas";
const DATABASE_VERSION = 1;
const TRACK_STORE = "uploadedTracks";

function getIndexedDB() {
  if (typeof window === "undefined") return null;

  return window.indexedDB ?? null;
}

function openUploadDatabase() {
  const indexedDB = getIndexedDB();

  if (!indexedDB) {
    return Promise.reject(new Error("Trình duyệt không hỗ trợ IndexedDB."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(TRACK_STORE)) {
        database.createObjectStore(TRACK_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Không thể mở nơi lưu upload."));
    };
  });
}

async function runTrackStore(mode, executor) {
  const database = await openUploadDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(TRACK_STORE, mode);
    const store = transaction.objectStore(TRACK_STORE);
    let result;

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Không thể xử lý dữ liệu upload."));
    };

    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Lưu upload đã bị hủy."));
    };

    const request = executor(store);

    if (!request) return;

    request.onsuccess = () => {
      result = request.result;
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Không thể đọc dữ liệu upload."));
    };
  });
}

export function isUploadStorageAvailable() {
  return Boolean(getIndexedDB());
}

export async function getStoredTracks() {
  const tracks = await runTrackStore("readonly", (store) => store.getAll());

  if (!Array.isArray(tracks)) return [];

  return tracks.sort((firstTrack, secondTrack) => {
    return new Date(secondTrack.createdAt) - new Date(firstTrack.createdAt);
  });
}

export async function saveUploadedTrack(track) {
  await runTrackStore("readwrite", (store) => store.put(track));

  return track;
}

export async function saveUploadedTrackToFiles(track) {
  const formData = new FormData();
  const { audioBlob, coverBlob, ...trackInfo } = track;

  formData.append("track", JSON.stringify(trackInfo));
  formData.append("audio", audioBlob, track.audioFileName || "track.mp3");

  if (coverBlob) {
    formData.append("cover", coverBlob, track.coverFileName || "cover.jpg");
  }

  const response = await fetch("/api/upload-track", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Không thể lưu track vào source files.");
  }

  return response.json();
}

export async function deleteStoredTrack(trackId) {
  await runTrackStore("readwrite", (store) => store.delete(trackId));
}
