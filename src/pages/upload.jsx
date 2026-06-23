import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Check,
  CheckCircle,
  CloudArrowUp,
  FileAudio,
  Image,
  MagnifyingGlass,
  MusicNotesSimple,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  audioFileAccept,
  coverFileAccept,
  initialUploadForm,
  uploadCategories,
} from "../datas/uploadData.js";
import {
  isUploadStorageAvailable,
  getStoredTracks,
  saveUploadedTrackToFiles,
  updateUploadedTrack,
} from "../datas/uploadStorage.js";
import { useLanguage } from "../i18n.jsx";
import "../styles/upload.css";
import { useNavigate, useSearchParams } from "react-router-dom";

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

function formatDuration(seconds, t) {
  if (!Number.isFinite(seconds) || seconds <= 0) return t("common.unknown");

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function getTitleFromFile(file) {
  return file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
}

function normalizeSearchValue(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function revokeAssetUrls(urls) {
  Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
}

function Upload({ auth }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editTrackId = searchParams.get("edit") || "";
  const isEditMode = Boolean(editTrackId);
  const [currentStep, setCurrentStep] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [editTrack, setEditTrack] = useState(null);
  const [form, setForm] = useState(initialUploadForm);
  const [audioPreview, setAudioPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [audioDuration, setAudioDuration] = useState(null);
  const [lastSavedTrack, setLastSavedTrack] = useState(null);
  const [error, setError] = useState(() =>
    isUploadStorageAvailable() ? "" : "upload.apiUnavailable",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isEditTrackLoading, setIsEditTrackLoading] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [availableUploadCategories, setAvailableUploadCategories] =
    useState(uploadCategories);
  const previewUrlsRef = useRef({ audio: "", cover: "" });
  const categoryPickerRef = useRef(null);
  const hasExistingAudio = Boolean(isEditMode && editTrack?.audio);
  const hasAudioSelection = Boolean(audioFile || hasExistingAudio);
  const uploadWizardClassName = [
    "upload-wizard",
    hasAudioSelection ? "upload-wizard-has-audio" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const hasBlockingEditError = Boolean(
    isEditMode && !editTrack && error === "upload.editTrackNotFound",
  );
  const canRenderUploadStage = !isEditTrackLoading && !hasBlockingEditError;
  const audioSummaryName =
    audioFile?.name || (hasExistingAudio ? t("upload.currentAudio") : "");
  const audioSummaryMeta = audioFile
    ? `${formatBytes(audioFile.size)} - ${formatDuration(audioDuration, t)}`
    : editTrack?.durationLabel ||
      editTrack?.duration ||
      formatDuration(audioDuration, t);

  const selectedCategory = useMemo(() => {
    return (
      availableUploadCategories.find(
        (category) => category.value === form.category,
      ) ??
      availableUploadCategories[0] ??
      uploadCategories[0]
    );
  }, [availableUploadCategories, form.category]);

  const selectedCategoryLabel = t(
    `categories.${selectedCategory?.value}.title`,
    {},
    selectedCategory?.label ?? "",
  );

  const localizedUploadSteps = useMemo(
    () => [
      {
        id: "track-file",
        label: t("upload.steps.file.label"),
        description: t("upload.steps.file.description"),
      },
      {
        id: "track-info",
        label: t("upload.steps.info.label"),
        description: t("upload.steps.info.description"),
      },
      {
        id: "track-done",
        label: t("upload.steps.done.label"),
        description: t("upload.steps.done.description"),
      },
    ],
    [t],
  );

  const filteredUploadCategories = useMemo(() => {
    const searchValue = normalizeSearchValue(categorySearch.trim());

    if (!searchValue) {
      return availableUploadCategories;
    }

    return availableUploadCategories.filter((category) => {
      const localizedLabel = t(
        `categories.${category.value}.title`,
        {},
        category.label,
      );

      return normalizeSearchValue(
        `${localizedLabel} ${category.value}`,
      ).includes(searchValue);
    });
  }, [availableUploadCategories, categorySearch, t]);

  useEffect(() => {
    let isMounted = true;

    if (!isUploadStorageAvailable()) {
      return undefined;
    }

    fetch("/api/categories", {
      headers: auth?.session?.access_token
        ? { Authorization: `Bearer ${auth.session.access_token}` }
        : {},
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("upload.cannotLoadCategories");
        }

        return response.json();
      })
      .then((payload) => {
        const categoriesFromServer = (payload.categories ?? []).map(
          (category) => ({
            value: category.id,
            label: category.title,
          }),
        );

        if (isMounted && categoriesFromServer.length) {
          setAvailableUploadCategories(categoriesFromServer);
          setForm((currentForm) => {
            const hasCurrentCategory = categoriesFromServer.some(
              (category) => category.value === currentForm.category,
            );

            return hasCurrentCategory
              ? currentForm
              : {
                  ...currentForm,
                  category: categoriesFromServer[0].value,
                };
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableUploadCategories(uploadCategories);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [auth?.session?.access_token]);

  useEffect(() => {
    let isMounted = true;

    if (!editTrackId) {
      return undefined;
    }

    if (!isUploadStorageAvailable()) {
      return undefined;
    }

    queueMicrotask(() => {
      if (!isMounted) return;

      setIsEditTrackLoading(true);
      setError("");

      getStoredTracks(auth?.session?.access_token)
        .then((tracks) => {
          const track = tracks.find(
            (currentTrack) => currentTrack.id === editTrackId,
          );

          if (!track) {
            throw new Error("upload.editTrackNotFound");
          }

          if (!isMounted) return;

          revokeAssetUrls(previewUrlsRef.current);
          previewUrlsRef.current = { audio: "", cover: "" };
          setEditTrack(track);
          setAudioFile(null);
          setCoverFile(null);
          setCurrentStep(1);
          setLastSavedTrack(null);
          setAudioPreview(track.audio || "");
          setCoverPreview(track.cover || "");
          setAudioDuration(track.durationSeconds || null);
          setCategorySearch("");
          setIsCategoryPickerOpen(false);
          setForm({
            ...initialUploadForm,
            title: track.title || "",
            artist: track.artist || "",
            category: track.category || initialUploadForm.category,
            description:
              track.description === "Track upload Supabase"
                ? ""
                : track.description || "",
          });
        })
        .catch((loadError) => {
          if (!isMounted) return;

          setEditTrack(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "upload.editTrackNotFound",
          );
        })
        .finally(() => {
          if (isMounted) {
            setIsEditTrackLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [auth?.session?.access_token, editTrackId]);

  useEffect(() => {
    return () => {
      revokeAssetUrls(previewUrlsRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isCategoryPickerOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!categoryPickerRef.current?.contains(event.target)) {
        setIsCategoryPickerOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsCategoryPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCategoryPickerOpen]);

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function selectCategory(categoryValue) {
    updateForm("category", categoryValue);
    setCategorySearch("");
    setIsCategoryPickerOpen(false);
  }

  async function handleAudioSelect(file) {
    if (!file) return;

    const isAudioFile =
      file.type.startsWith("audio/") || audioExtensionPattern.test(file.name);

    if (!isAudioFile) {
      setError("upload.invalidAudio");
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
      setError("upload.invalidImage");
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
    if (!audioFile && !hasExistingAudio) {
      setError("upload.needAudioContinue");
      return;
    }

    setError("");
    setCurrentStep(1);
  }

  async function saveTrack() {
    const title = form.title.trim();
    const artist = form.artist.trim();
    const nextDuration = audioFile
      ? audioDuration
      : (editTrack?.durationSeconds ?? audioDuration);

    if (!audioFile && !hasExistingAudio) {
      setError("upload.needAudioSave");
      setCurrentStep(0);
      return;
    }

    if (!title || !artist) {
      setError("upload.titleArtistRequired");
      return;
    }

    const newTrack = {
      id: `track-${Date.now()}`,
      title,
      artist,
      category: selectedCategoryLabel,
      categoryValue: selectedCategory.value,
      description: form.description.trim(),
      durationSeconds: nextDuration,
      durationLabel: formatDuration(nextDuration, t),
      audioFileName: audioFile?.name || "",
      audioFileType: audioFile?.type || "audio",
      audioFileSize: audioFile?.size || null,
      audioBlob: audioFile,
      coverFileName: coverFile?.name ?? "",
      coverFileType: coverFile?.type ?? "",
      coverBlob: coverFile,
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError("");

    try {
      const savedTrack = isEditMode
        ? await updateUploadedTrack(
            editTrackId,
            newTrack,
            auth?.session?.access_token,
          )
        : await saveUploadedTrackToFiles(newTrack, auth?.session?.access_token);
      setLastSavedTrack(savedTrack);
      setCurrentStep(2);
      window.dispatchEvent(new CustomEvent("musicweb:tracks-updated"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isEditMode
            ? "upload.updateFailed"
            : "upload.saveFailed",
      );
    } finally {
      setIsSaving(false);
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
    setCategorySearch("");
    setIsCategoryPickerOpen(false);
    setError("");
    setEditTrack(null);

    if (isEditMode) {
      navigate("/upload", { replace: true });
    }
  }

  return (
    <section className="page-section upload-page">
      {/* NOTE: Wizard upload theo từng bước */}
      <section
        className={uploadWizardClassName}
        aria-label={t("upload.pageAria")}
      >
        {/* NOTE: Header trang Upload nằm trong box để box cao đồng bộ sidebar */}
        <div className="upload-page-heading">
          <div>
            <h2>{isEditMode ? t("upload.editTitle") : t("upload.title")}</h2>
          </div>
        </div>

        <div className="upload-stepper" aria-label={t("upload.stepsAria")}>
          {localizedUploadSteps.map((step, index) => (
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
            <span>{t(error, {}, error)}</span>
          </div>
        ) : null}

        {isEditTrackLoading ? (
          <div className="upload-status" role="status">
            <MusicNotesSimple size={20} weight="fill" />
            <span>{t("upload.loadingEditTrack")}</span>
          </div>
        ) : null}

        {canRenderUploadStage && currentStep === 0 ? (
          // NOTE: Bước 1 - chọn file nhạc
          <div className="upload-stage upload-stage-file">
            <div className="upload-stage-copy">
              <span className="upload-kicker">{t("upload.trackFile")}</span>
              <h3>{t("upload.chooseAudio")}</h3>
              <p>{t("upload.supportedAudio")}</p>
            </div>

            <label
              className={
                audioFile || hasExistingAudio
                  ? "upload-dropzone upload-dropzone-filled"
                  : "upload-dropzone"
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, "audio")}
            >
              <input
                type="file"
                accept={audioFileAccept}
                onChange={(event) => handleAudioSelect(event.target.files?.[0])}
              />
              <span className="upload-dropzone-icon">
                {audioFile || hasExistingAudio ? (
                  <FileAudio size={50} weight="fill" />
                ) : (
                  <CloudArrowUp size={58} weight="bold" />
                )}
              </span>
              <strong>
                {audioFile
                  ? audioFile.name
                  : hasExistingAudio
                    ? t("upload.currentAudio")
                    : t("upload.chooseDrop")}
              </strong>
            </label>

            {audioPreview ? (
              <div className="upload-audio-card">
                <FileAudio size={28} weight="fill" />
                <div>
                  <strong>
                    {audioFile?.name ||
                      editTrack?.title ||
                      t("upload.currentAudio")}
                  </strong>
                  <span>
                    {audioFile ? formatBytes(audioFile.size) : audioSummaryMeta}
                  </span>
                </div>
                <audio src={audioPreview} controls />
              </div>
            ) : null}
          </div>
        ) : null}

        {canRenderUploadStage && currentStep === 1 ? (
          // NOTE: Bước 2 - nhập thông tin track
          <div className="upload-stage upload-stage-info">
            <div className="upload-info-grid">
              {/* NOTE: Upload ảnh bìa track */}
              <div className="upload-cover-block">
                <label
                  className={
                    coverPreview
                      ? "upload-cover-dropzone upload-cover-dropzone-filled"
                      : "upload-cover-dropzone"
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, "cover")}
                >
                  <input
                    type="file"
                    accept={coverFileAccept}
                    onChange={(event) =>
                      handleCoverSelect(event.target.files?.[0])
                    }
                  />
                  {coverPreview ? (
                    <img src={coverPreview} alt={t("upload.coverAlt")} />
                  ) : (
                    <span className="upload-cover-empty">
                      <Image size={42} weight="bold" />
                      <strong>{t("upload.cover")}</strong>
                    </span>
                  )}
                </label>

                <label className="upload-cover-button">
                  <UploadSimple size={18} weight="bold" />
                  <span>
                    {coverFile ? coverFile.name : t("upload.uploadImage")}
                  </span>
                  <input
                    type="file"
                    accept={coverFileAccept}
                    onChange={(event) =>
                      handleCoverSelect(event.target.files?.[0])
                    }
                  />
                </label>
              </div>

              {/* NOTE: Form thông tin track */}
              <div className="upload-form-fields">
                <label className="upload-field">
                  <span>{t("upload.trackName")}</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder={t("upload.trackPlaceholder")}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                  />
                </label>

                <label className="upload-field">
                  <span>{t("upload.artist")}</span>
                  <input
                    type="text"
                    value={form.artist}
                    placeholder={t("upload.artistPlaceholder")}
                    onChange={(event) =>
                      updateForm("artist", event.target.value)
                    }
                  />
                </label>

                <label className="upload-field upload-category-field">
                  <span>{t("upload.category")}</span>
                  <div
                    className={[
                      "upload-category-picker",
                      isCategoryPickerOpen ? "upload-category-picker-open" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    ref={categoryPickerRef}
                  >
                    <button
                      className="upload-category-trigger"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isCategoryPickerOpen}
                      onClick={() =>
                        setIsCategoryPickerOpen((isOpen) => !isOpen)
                      }
                    >
                      <span>{selectedCategoryLabel}</span>
                      <CaretDown size={18} weight="bold" />
                    </button>

                    {isCategoryPickerOpen ? (
                      <div className="upload-category-menu">
                        <label className="upload-category-search">
                          <MagnifyingGlass size={17} weight="bold" />
                          <input
                            type="search"
                            value={categorySearch}
                            placeholder={t("upload.categorySearch")}
                            autoFocus
                            onChange={(event) =>
                              setCategorySearch(event.target.value)
                            }
                          />
                        </label>

                        <div className="upload-category-options" role="listbox">
                          {filteredUploadCategories.length ? (
                            filteredUploadCategories.map((category) => {
                              const isSelected =
                                category.value === form.category;

                              return (
                                <button
                                  key={category.value}
                                  className={
                                    isSelected
                                      ? "upload-category-option upload-category-option-selected"
                                      : "upload-category-option"
                                  }
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => selectCategory(category.value)}
                                >
                                  <span>
                                    {t(
                                      `categories.${category.value}.title`,
                                      {},
                                      category.label,
                                    )}
                                  </span>
                                  {isSelected ? (
                                    <Check size={17} weight="bold" />
                                  ) : null}
                                </button>
                              );
                            })
                          ) : (
                            <span className="upload-category-empty">
                              {t("upload.noCategoryResults")}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </label>

                <label className="upload-field">
                  <span>{t("upload.descriptionLabel")}</span>
                  <textarea
                    value={form.description}
                    placeholder={t("upload.descriptionPlaceholder")}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            {audioSummaryName ? (
              <div className="upload-file-summary">
                <FileAudio size={24} weight="fill" />
                <div>
                  <strong>{audioSummaryName}</strong>
                  <span>{audioSummaryMeta}</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {canRenderUploadStage && currentStep === 2 ? (
          // NOTE: Bước 3 - trạng thái lưu thành công
          <div className="upload-stage upload-stage-done">
            <CheckCircle size={88} weight="fill" />
            <h3>
              {isEditMode ? t("upload.updatedTitle") : t("upload.savedTitle")}
            </h3>
            <p>
              {isEditMode
                ? t("upload.updatedDescription")
                : t("upload.savedDescription")}
            </p>

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
                    {t(
                      `categories.${lastSavedTrack.categoryValue || lastSavedTrack.category}.title`,
                      {},
                      lastSavedTrack.categoryLabel || lastSavedTrack.category,
                    )}{" "}
                    - {formatDuration(lastSavedTrack.durationSeconds, t)}
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
            <button
              className="upload-secondary-button"
              type="button"
              onClick={goBack}
            >
              <ArrowLeft size={18} weight="bold" />
              {t("common.back")}
            </button>
          )}

          {currentStep === 0 ? (
            <button
              className="upload-primary-button"
              type="button"
              onClick={goToInfoStep}
            >
              {t("common.continue")}
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
              {isSaving
                ? t("upload.saving")
                : isEditMode
                  ? t("upload.updateTrack")
                  : t("upload.saveTrack")}
              <CheckCircle size={18} weight="bold" />
            </button>
          ) : null}

          {currentStep === 2 ? (
            <button
              className="upload-primary-button"
              type="button"
              onClick={resetUpload}
            >
              {t("upload.uploadNew")}
              <CloudArrowUp size={18} weight="bold" />
            </button>
          ) : null}
        </div>
      </section>
    </section>
  );
}

export default Upload;
