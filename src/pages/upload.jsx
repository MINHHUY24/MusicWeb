import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CloudArrowUp,
  Database,
  FileAudio,
  Image,
  MusicNotesSimple,
  Trash,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  audioFileAccept,
  coverFileAccept,
  initialUploadForm,
  uploadCategories,
  uploadSteps,
} from "../datas/uploadData.js";
import {
  deleteStoredTrack,
  getStoredTracks,
  isUploadStorageAvailable,
  saveUploadedTrack,
  saveUploadedTrackToFiles,
} from "../datas/uploadStorage.js";
import "../styles/upload.css";

const audioExtensionPattern = /\.(wav|flac|aiff|aif|alac|mp3|m4a|ogg)$/i;

function formatBytes(bytes) {
  if (!bytes) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Chưa rõ";

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function formatCreatedAt(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTitleFromFile(file) {
  return file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
}

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    audio.src = objectUrl;
  });
}

function createStoredAssetUrls(track) {
  const urls = {};

  if (track.coverBlob) {
    urls[`${track.id}-cover`] = URL.createObjectURL(track.coverBlob);
  }

  if (track.audioBlob) {
    urls[`${track.id}-audio`] = URL.createObjectURL(track.audioBlob);
  }

  return urls;
}

function revokeAssetUrls(urls) {
  Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
}

function Upload() {
  const [currentStep, setCurrentStep] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [form, setForm] = useState(initialUploadForm);
  const [audioPreview, setAudioPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [audioDuration, setAudioDuration] = useState(null);
  const [storedTracks, setStoredTracks] = useState([]);
  const [storedAssetUrls, setStoredAssetUrls] = useState({});
  const [lastSavedTrack, setLastSavedTrack] = useState(null);
  const [error, setError] = useState(() =>
    isUploadStorageAvailable()
      ? ""
      : "Trình duyệt hiện không hỗ trợ nơi lưu upload local.",
  );
  const [isSaving, setIsSaving] = useState(false);
  const previewUrlsRef = useRef({ audio: "", cover: "" });
  const storedAssetUrlsRef = useRef({});

  const selectedCategory = useMemo(() => {
    return (
      uploadCategories.find((category) => category.value === form.category) ??
      uploadCategories[0]
    );
  }, [form.category]);

  useEffect(() => {
    let isMounted = true;

    if (!isUploadStorageAvailable()) {
      return undefined;
    }

    getStoredTracks()
      .then((tracks) => {
        const urls = tracks.reduce(
          (currentUrls, track) => ({
            ...currentUrls,
            ...createStoredAssetUrls(track),
          }),
          {},
        );

        if (isMounted) {
          storedAssetUrlsRef.current = urls;
          setStoredAssetUrls(urls);
          setStoredTracks(tracks);
        } else {
          revokeAssetUrls(urls);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Không thể đọc thư viện upload local.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeAssetUrls(previewUrlsRef.current);
      revokeAssetUrls(storedAssetUrlsRef.current);
    };
  }, []);

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleAudioSelect(file) {
    if (!file) return;

    const isAudioFile = file.type.startsWith("audio/") || audioExtensionPattern.test(file.name);

    if (!isAudioFile) {
      setError("Vui lòng chọn đúng file audio.");
      return;
    }

    if (previewUrlsRef.current.audio) {
      URL.revokeObjectURL(previewUrlsRef.current.audio);
    }

    const audioUrl = URL.createObjectURL(file);
    previewUrlsRef.current = {
      ...previewUrlsRef.current,
      audio: audioUrl,
    };

    setAudioFile(file);
    setAudioPreview(audioUrl);
    setAudioDuration(null);
    setError("");
    setForm((currentForm) => ({
      ...currentForm,
      title: currentForm.title || getTitleFromFile(file),
    }));

    const duration = await readAudioDuration(file);
    setAudioDuration(duration);
  }

  function handleCoverSelect(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng file hình ảnh.");
      return;
    }

    if (previewUrlsRef.current.cover) {
      URL.revokeObjectURL(previewUrlsRef.current.cover);
    }

    const coverUrl = URL.createObjectURL(file);
    previewUrlsRef.current = {
      ...previewUrlsRef.current,
      cover: coverUrl,
    };

    setCoverFile(file);
    setCoverPreview(coverUrl);
    setError("");
  }

  function handleDrop(event, type) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (type === "cover") {
      handleCoverSelect(file);
      return;
    }

    handleAudioSelect(file);
  }

  function goBack() {
    setError("");
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function goToInfoStep() {
    if (!audioFile) {
      setError("Bạn cần chọn file nhạc trước khi tiếp tục.");
      return;
    }

    setError("");
    setCurrentStep(1);
  }

  async function saveTrack() {
    const title = form.title.trim();
    const artist = form.artist.trim();

    if (!audioFile) {
      setError("Bạn cần chọn file nhạc trước khi lưu.");
      setCurrentStep(0);
      return;
    }

    if (!title || !artist) {
      setError("Tên track và nghệ sĩ là bắt buộc.");
      return;
    }

    const newTrack = {
      id: `track-${Date.now()}`,
      title,
      artist,
      category: selectedCategory.label,
      categoryValue: selectedCategory.value,
      description: form.description.trim(),
      durationSeconds: audioDuration,
      durationLabel: formatDuration(audioDuration),
      audioFileName: audioFile.name,
      audioFileType: audioFile.type || "audio",
      audioFileSize: audioFile.size,
      audioBlob: audioFile,
      coverFileName: coverFile?.name ?? "",
      coverFileType: coverFile?.type ?? "",
      coverBlob: coverFile,
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError("");

    try {
      let sourceSaveFailed = false;

      try {
        await saveUploadedTrackToFiles(newTrack);
      } catch {
        sourceSaveFailed = true;
      }

      const savedTrack = await saveUploadedTrack(newTrack);
      const savedUrls = createStoredAssetUrls(savedTrack);
      const nextStoredUrls = {
        ...savedUrls,
        ...storedAssetUrlsRef.current,
      };

      storedAssetUrlsRef.current = nextStoredUrls;
      setStoredAssetUrls(nextStoredUrls);
      setStoredTracks((currentTracks) => [savedTrack, ...currentTracks]);
      setLastSavedTrack(savedTrack);
      setCurrentStep(2);
      setError(
        sourceSaveFailed
          ? "Dev API không khả dụng nên track chỉ được lưu local trong trình duyệt."
          : "",
      );
    } catch {
      setError("Không thể lưu track vào thư viện local.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeStoredTrack(trackId) {
    try {
      await deleteStoredTrack(trackId);
      const nextStoredUrls = { ...storedAssetUrlsRef.current };
      const coverUrl = nextStoredUrls[`${trackId}-cover`];
      const audioUrl = nextStoredUrls[`${trackId}-audio`];

      if (coverUrl) URL.revokeObjectURL(coverUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);

      delete nextStoredUrls[`${trackId}-cover`];
      delete nextStoredUrls[`${trackId}-audio`];
      storedAssetUrlsRef.current = nextStoredUrls;
      setStoredAssetUrls(nextStoredUrls);
      setStoredTracks((currentTracks) => currentTracks.filter((track) => track.id !== trackId));
    } catch {
      setError("Không thể xóa track khỏi thư viện local.");
    }
  }

  function resetUpload() {
    revokeAssetUrls(previewUrlsRef.current);
    previewUrlsRef.current = { audio: "", cover: "" };
    setCurrentStep(0);
    setAudioFile(null);
    setCoverFile(null);
    setForm(initialUploadForm);
    setAudioPreview("");
    setCoverPreview("");
    setAudioDuration(null);
    setLastSavedTrack(null);
    setError("");
  }

  return (
    <section className="page-section upload-page">
      {/* NOTE: Header trang Upload */}
      <div className="upload-page-heading">
        <div>
          <h2>Upload nhạc</h2>
          <p>Tải file, nhập thông tin và lưu vào source local khi chạy dev server.</p>
        </div>

        <span className="upload-storage-badge">
          <Database size={17} weight="fill" />
          {storedTracks.length} track local
        </span>
      </div>

      {/* NOTE: Wizard upload theo từng bước */}
      <section className="upload-wizard" aria-label="Upload track">
        <div className="upload-stepper" aria-label="Upload steps">
          {uploadSteps.map((step, index) => (
            <div
              key={step.id}
              className={[
                "upload-step",
                index === currentStep ? "upload-step-active" : "",
                index < currentStep ? "upload-step-done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="upload-step-number">{index + 1}</span>
              <span className="upload-step-copy">
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </span>
            </div>
          ))}
        </div>

        {error ? (
          <div className="upload-error" role="alert">
            <WarningCircle size={20} weight="fill" />
            <span>{error}</span>
          </div>
        ) : null}

        {currentStep === 0 ? (
          // NOTE: Bước 1 - chọn file nhạc
          <div className="upload-stage upload-stage-file">
            <div className="upload-stage-copy">
              <span className="upload-kicker">Track file</span>
              <h3>Chọn file audio</h3>
              <p>Hỗ trợ MP3, WAV, FLAC, AIFF, ALAC, M4A và OGG.</p>
            </div>

            <label
              className={audioFile ? "upload-dropzone upload-dropzone-filled" : "upload-dropzone"}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, "audio")}
            >
              <input
                type="file"
                accept={audioFileAccept}
                onChange={(event) => handleAudioSelect(event.target.files?.[0])}
              />
              <span className="upload-dropzone-icon">
                {audioFile ? (
                  <FileAudio size={50} weight="fill" />
                ) : (
                  <CloudArrowUp size={58} weight="bold" />
                )}
              </span>
              <strong>{audioFile ? audioFile.name : "Kéo thả hoặc bấm để chọn file"}</strong>
              <small>
                {audioFile
                  ? `${formatBytes(audioFile.size)} - ${formatDuration(audioDuration)}`
                  : "File sẽ được lưu vào src/datas/songs khi chạy dev server"}
              </small>
            </label>

            {audioPreview ? (
              <div className="upload-audio-card">
                <FileAudio size={28} weight="fill" />
                <div>
                  <strong>{audioFile.name}</strong>
                  <span>{formatBytes(audioFile.size)}</span>
                </div>
                <audio src={audioPreview} controls />
              </div>
            ) : null}
          </div>
        ) : null}

        {currentStep === 1 ? (
          // NOTE: Bước 2 - nhập thông tin track
          <div className="upload-stage upload-stage-info">
            <div className="upload-info-grid">
              {/* NOTE: Upload ảnh bìa track */}
              <div className="upload-cover-block">
                <label
                  className={
                    coverPreview ? "upload-cover-dropzone upload-cover-dropzone-filled" : "upload-cover-dropzone"
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, "cover")}
                >
                  <input
                    type="file"
                    accept={coverFileAccept}
                    onChange={(event) => handleCoverSelect(event.target.files?.[0])}
                  />
                  {coverPreview ? (
                    <img src={coverPreview} alt="Ảnh bìa đang chọn" />
                  ) : (
                    <span className="upload-cover-empty">
                      <Image size={42} weight="bold" />
                      <strong>Ảnh bìa</strong>
                    </span>
                  )}
                </label>

                <label className="upload-cover-button">
                  <UploadSimple size={18} weight="bold" />
                  <span>{coverFile ? coverFile.name : "Tải ảnh lên"}</span>
                  <input
                    type="file"
                    accept={coverFileAccept}
                    onChange={(event) => handleCoverSelect(event.target.files?.[0])}
                  />
                </label>
              </div>

              {/* NOTE: Form thông tin track */}
              <div className="upload-form-fields">
                <label className="upload-field">
                  <span>Tên track</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder="Ví dụ: Nhạc nghe buổi tối"
                    onChange={(event) => updateForm("title", event.target.value)}
                  />
                </label>

                <label className="upload-field">
                  <span>Nghệ sĩ</span>
                  <input
                    type="text"
                    value={form.artist}
                    placeholder="Tên nghệ sĩ hoặc nhóm nhạc"
                    onChange={(event) => updateForm("artist", event.target.value)}
                  />
                </label>

                <label className="upload-field">
                  <span>Thể loại</span>
                  <select
                    value={form.category}
                    onChange={(event) => updateForm("category", event.target.value)}
                  >
                    {uploadCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="upload-field">
                  <span>Mô tả</span>
                  <textarea
                    value={form.description}
                    placeholder="Ghi chú ngắn về track này."
                    onChange={(event) => updateForm("description", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="upload-file-summary">
              <FileAudio size={24} weight="fill" />
              <div>
                <strong>{audioFile?.name}</strong>
                <span>
                  {formatBytes(audioFile?.size)} - {formatDuration(audioDuration)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          // NOTE: Bước 3 - trạng thái lưu thành công
          <div className="upload-stage upload-stage-done">
            <CheckCircle size={88} weight="fill" />
            <h3>Đã lưu track</h3>
            <p>Track đã được lưu và có thể xem lại ở danh sách bên dưới.</p>

            {lastSavedTrack ? (
              <div className="upload-success-card">
                <div className="upload-success-cover">
                  {coverPreview ? (
                    <img src={coverPreview} alt={lastSavedTrack.title} />
                  ) : (
                    <MusicNotesSimple size={34} weight="fill" />
                  )}
                </div>
                <div>
                  <strong>{lastSavedTrack.title}</strong>
                  <span>{lastSavedTrack.artist}</span>
                  <small>
                    {lastSavedTrack.category} - {lastSavedTrack.durationLabel}
                  </small>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* NOTE: Nút điều hướng wizard */}
        <div className="upload-actions">
          {currentStep === 0 ? (
            <span />
          ) : (
            <button className="upload-secondary-button" type="button" onClick={goBack}>
              <ArrowLeft size={18} weight="bold" />
              Quay lại
            </button>
          )}

          {currentStep === 0 ? (
            <button className="upload-primary-button" type="button" onClick={goToInfoStep}>
              Tiếp tục
              <ArrowRight size={18} weight="bold" />
            </button>
          ) : null}

          {currentStep === 1 ? (
            <button
              className="upload-primary-button"
              type="button"
              disabled={isSaving}
              onClick={saveTrack}
            >
              {isSaving ? "Đang lưu" : "Lưu track"}
              <CheckCircle size={18} weight="bold" />
            </button>
          ) : null}

          {currentStep === 2 ? (
            <button className="upload-primary-button" type="button" onClick={resetUpload}>
              Upload bài mới
              <CloudArrowUp size={18} weight="bold" />
            </button>
          ) : null}
        </div>
      </section>

      {/* NOTE: Thư viện upload local */}
      <section className="upload-library" aria-label="Local uploaded tracks">
        <div className="upload-library-heading">
          <div>
            <h2>Thư viện local</h2>
            <p>Khi chạy dev server, audio lưu vào src/datas/songs và cover lưu vào src/assets/image_song.</p>
          </div>
        </div>

        {storedTracks.length ? (
          <div className="upload-library-grid">
            {storedTracks.map((track) => (
              <article className="upload-library-card" key={track.id}>
                <div className="upload-library-cover">
                  {storedAssetUrls[`${track.id}-cover`] ? (
                    <img src={storedAssetUrls[`${track.id}-cover`]} alt={track.title} />
                  ) : (
                    <MusicNotesSimple size={28} weight="fill" />
                  )}
                </div>

                <div className="upload-library-content">
                  <strong>{track.title}</strong>
                  <span>{track.artist}</span>
                  <small>
                    {track.category} - {track.durationLabel}
                  </small>
                  <small>{formatCreatedAt(track.createdAt)}</small>
                </div>

                <div className="upload-library-actions">
                  {storedAssetUrls[`${track.id}-audio`] ? (
                    <audio src={storedAssetUrls[`${track.id}-audio`]} controls />
                  ) : null}

                  <button
                    type="button"
                    aria-label={`Xóa ${track.title}`}
                    onClick={() => removeStoredTrack(track.id)}
                  >
                    <Trash size={18} weight="bold" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="upload-library-empty">
            <MusicNotesSimple size={42} weight="fill" />
            <strong>Chưa có track nào</strong>
            <span>Upload một file nhạc để bắt đầu tạo thư viện cá nhân.</span>
          </div>
        )}
      </section>
    </section>
  );
}

export default Upload;
