/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const languageStorageKey = "musicweb:language";
const supportedLanguages = ["vi", "en"];

const translations = {
  vi: {
    nav: {
      mainMenu: "Menu chính",
      menu: "Menu",
      openMenu: "Mở menu",
      collapseMenu: "Thu gọn menu",
      home: "Trang chủ",
      playlist: "Danh sách",
      category: "Thể loại",
      upload: "Upload",
      profile: "Hồ sơ",
    },
    common: {
      close: "Đóng",
      cancel: "Hủy",
      back: "Quay lại",
      continue: "Tiếp tục",
      save: "Lưu",
      unknown: "Chưa rõ",
      song: "bài",
      songs: "bài hát",
      category: "thể loại",
      categories: "thể loại",
      playlist: "danh sách phát",
      playlists: "danh sách phát",
      minute: "phút",
      hour: "giờ",
      noSongPlaying: "Chưa phát bài hát",
      unknownArtist: "Chưa rõ nghệ sĩ",
      loadingMusicTitle: "Đang tải nhạc từ Supabase",
      loadingMusicDescription: "Vui lòng chờ trong lúc thư viện được đồng bộ.",
      waitingTitle: "Vui lòng chờ đợi",
      waitingMusicDescription:
        "Thư viện nhạc đang được đồng bộ, quá trình này có thể mất thêm một chút thời gian.",
      emptyMusicTitle: "Chưa có bài hát",
      emptyMusicDescription: "Upload bài hát lên Supabase để bắt đầu nghe.",
      musicLoadErrorTitle: "Không tải được dữ liệu nhạc",
    },
    topbar: {
      searchPlaceholder: "Tìm bài hát hoặc nghệ sĩ",
      clearSearch: "Xóa tìm kiếm",
      searchType: "Chọn kiểu tìm kiếm",
      searchModes: {
        songs: "Bài hát",
        artists: "Nghệ sĩ",
        all: "Tất cả",
      },
      resultGroups: {
        songs: "Bài hát",
        artists: "Nghệ sĩ",
      },
      artistSongCount: "{count} bài hát",
      noResults: "Không tìm thấy kết quả phù hợp.",
      hint: "Chọn kiểu tìm kiếm rồi nhập từ khóa.",
      profile: "Hồ sơ",
      account: "Tài khoản",
      accountName: "Minh Huy",
      googleReady: "Sẵn sàng kết nối Google",
      editAccount: "Sửa tên tài khoản",
      displayName: "Tên hiển thị",
      signOut: "Đăng xuất",
      language: "Ngôn ngữ",
      languagePicker: "Chọn ngôn ngữ",
    },
    auth: {
      loadingTitle: "Đang kiểm tra đăng nhập",
      loadingDescription: "Vui lòng chờ trong lúc MusicWeb đồng bộ tài khoản.",
      loginDescription: "Explore and share your music with the world today!",
      loginWithGoogle: "Login with Google",
      connecting: "Đang kết nối...",
      configMissing:
        "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong .env backend.",
      signInFailed: "Không thể đăng nhập Google.",
      signOutFailed: "Không thể đăng xuất.",
      updateFailed: "Không thể cập nhật tài khoản.",
    },
    footer: {
      musicPlayer: "Trình phát nhạc",
      playbackControls: "Điều khiển phát nhạc",
      shuffle: "Trộn bài",
      previous: "Bài trước",
      pause: "Tạm dừng",
      play: "Phát",
      next: "Bài tiếp theo",
      repeat: "Lặp lại",
      favorite: "Thêm vào yêu thích",
      unfavorite: "Bỏ khỏi yêu thích",
      seek: "Tua bài hát",
      volume: "Âm lượng",
      queue: "Danh sách phát tiếp theo",
      queueTitle: "Phát tiếp theo",
      closeQueue: "Đóng danh sách",
      emptyQueue: "Chưa có nhạc phát tiếp theo.",
    },
    home: {
      trending: "Nhạc thịnh hành",
      chill: "Chill",
      newRelease: "Mới phát hành",
      collapse: "Thu gọn",
      seeMore: "Xem thêm >",
      clicks: "lượt nghe",
    },
    songs: {
      "noi-nay-co-anh": {
        description: "Pop Việt nhẹ và dễ nghe.",
      },
      "hay-trao-cho-anh": {
        description: "V-pop pha hip hop bắt tai.",
      },
      "song-gio": {
        description: "Giai điệu Việt nhiều cảm xúc.",
      },
      "di-ve-nha": {
        description: "Rap Việt ấm và gần gũi.",
      },
      ngot: {
        description: "Groove Việt vui và sáng.",
      },
      "come-my-way": {
        description: "Pop quốc tế có màu hiện đại.",
      },
    },
    categoryPage: {
      title: "Thể loại",
      description: "Phân loại bài hát theo thể loại nhạc để nghe nhanh hơn.",
      back: "Quay lại Thể loại",
      pageSongs: "{name} bài hát",
      playCategory: "Phát {name}",
      featured: "{count} bài nổi bật trong thể loại này",
    },
    categories: {
      vpop: {
        title: "V-pop",
        description: "Nhạc Việt đang lưu trong thư viện",
      },
      hiphop: {
        title: "Hip hop",
        description: "Rap, groove và beat hiện đại",
      },
      pop: {
        title: "Pop",
        description: "Pop dễ nghe và bắt tai",
      },
      kpop: {
        title: "K-pop",
        description: "Nhạc Hàn Quốc nổi bật và bắt tai",
      },
      rap: {
        title: "Rap",
        description: "Flow, lyrics và nhịp mạnh",
      },
      rnb: {
        title: "R&B",
        description: "Giai điệu mượt và nhiều groove",
      },
      rock: {
        title: "Rock",
        description: "Guitar, trống và năng lượng mạnh",
      },
      ballad: {
        title: "Ballad",
        description: "Ca khúc chậm và giàu cảm xúc",
      },
      edm: {
        title: "EDM",
        description: "Beat điện tử dành cho không khí sôi động",
      },
      dance: {
        title: "Dance",
        description: "Nhịp nhanh và dễ chuyển động",
      },
      acoustic: {
        title: "Acoustic",
        description: "Bản phối mộc và gần gũi",
      },
      indie: {
        title: "Indie",
        description: "Màu nhạc độc lập và cá tính",
      },
      lofi: {
        title: "Lo-fi",
        description: "Âm thanh nhẹ để thư giãn và tập trung",
      },
      jazz: {
        title: "Jazz",
        description: "Hòa âm ngẫu hứng và tinh tế",
      },
      classical: {
        title: "Cổ điển",
        description: "Nhạc cổ điển và giao hưởng",
      },
      country: {
        title: "Country",
        description: "Giai điệu mộc, kể chuyện và gần gũi",
      },
      bolero: {
        title: "Bolero",
        description: "Trữ tình và hoài niệm",
      },
      remix: {
        title: "Remix",
        description: "Bản phối lại với màu sắc mới",
      },
      cover: {
        title: "Cover",
        description: "Những bản hát lại hoặc làm mới",
      },
      instrumental: {
        title: "Không lời",
        description: "Nhạc không lời và beat nền",
      },
      soundtrack: {
        title: "Nhạc phim",
        description: "Nhạc phim, game và sân khấu",
      },
      other: {
        title: "Khác",
        description: "Các track upload chưa phân loại",
      },
    },
    card: {
      favoriteSongs: "Thêm bài hát yêu thích",
      songCount: "{count} bài hát",
    },
    playlistPage: {
      title: "Danh sách phát của bạn",
      description:
        "Các danh sách phát cá nhân, mix nhanh và bộ sưu tập đang lưu.",
      aria: "Danh sách phát của bạn",
      createTitle: "Tạo danh sách phát",
      createDescription: "Tạo danh sách phát riêng",
      newDialogTitle: "Tạo danh sách phát mới",
      coverAlt: "Ảnh bìa danh sách phát",
      cover: "Ảnh bìa",
      uploadImage: "Tải ảnh lên",
      name: "Tên danh sách phát",
      namePlaceholder: "Ví dụ: Nhạc nghe buổi tối",
      descriptionLabel: "Mô tả",
      descriptionPlaceholder:
        "Mô tả ngắn để dễ nhớ danh sách phát này dùng lúc nào.",
      vibe: "Màu vibe",
      songsHeading: "Bài hát",
      songsDescription:
        "Có thể bỏ qua hoặc tìm bài muốn thêm vào danh sách phát.",
      songSearchPlaceholder: "Tìm bài hát hoặc nghệ sĩ",
      noSongResults: "Không tìm thấy bài hát phù hợp.",
      save: "Lưu danh sách phát",
      defaultDescription: "Danh sách phát cá nhân",
      selectedSummary: "{count} bài - {duration}",
      songMinute: "{count} phút",
      playlists: {
        allSongs: {
          title: "Tất cả bài hát",
          description: "Toàn bộ nhạc trong thư viện",
        },
        sonTung: {
          title: "Sơn Tùng M-TP",
          description: "Các track Sơn Tùng hiện có",
        },
        vietMix: {
          title: "Việt mix",
          description: "V-pop và hip hop Việt",
        },
      },
      detail: {
        back: "Quay lại danh sách phát",
        play: "Phát {name}",
        aria: "{name} tracks",
        summary: "{count} bài hát - {duration}",
      },
      tones: {
        blue: "Blue glass",
        mint: "Mint chill",
        rose: "Rose night",
        amber: "Amber acoustic",
      },
    },
    profile: {
      info: "Thông tin hồ sơ",
      music: "Nhạc trong hồ sơ",
      musicSections: "Các mục nhạc",

      stats: {
        liked: "Yêu thích",
        history: "Đã nghe",
        uploaded: "Đã up",
      },
      tabs: {
        favorites: "Yêu thích",
        history: "Lịch sử",
        uploaded: "Nhạc đã up",
      },
      noUploadedTitle: "Chưa có nhạc đã upload",
      noUploadedDescription:
        "Upload track đầu tiên để danh sách này tự cập nhật.",
      noFavoritesTitle: "Chưa có bài yêu thích",
      noFavoritesDescription:
        "Bấm tim ở thanh phát nhạc để thêm bài vào yêu thích.",
      noHistoryTitle: "Chưa có lịch sử nghe",
      noHistoryDescription: "Bài hát sẽ xuất hiện ở đây sau khi bạn phát nhạc.",
      goToUpload: "Đi tới Upload",
      supabaseUpload: "Supabase upload",
      unknownDuration: "Chưa rõ",
      recentlyPlayed: "Nghe gần đây",
      inLibrary: "Trong thư viện",
      deleteTrack: "Xóa {title}",
      deleteTrackTitle: "Xóa bài hát này?",
      deleteTrackConfirm:
        'Bài "{title}" sẽ bị xóa khỏi Supabase và không còn xuất hiện trong thư viện.',
      deleteTrackAction: "Xóa bài",
      deletingTrack: "Đang xóa",
      deleteTrackFailed: "Không thể xóa bài hát.",
    },
    upload: {
      pageAria: "Upload track",
      title: "Upload nhạc",
      description:
        "Tải file, nhập thông tin và lưu qua Node.js backend vào Supabase.",
      stepsAria: "Các bước upload",
      steps: {
        file: {
          label: "File nhạc",
          description: "Chọn file audio muốn lưu",
        },
        info: {
          label: "Thông tin",
          description: "Nhập tên, nghệ sĩ và ảnh bìa",
        },
        done: {
          label: "Hoàn tất",
          description: "Track đã lưu vào Supabase",
        },
      },
      apiUnavailable: "Trình duyệt hiện không thể kết nối API upload.",
      cannotLoadCategories: "Không thể tải thể loại.",
      invalidAudio: "Vui lòng chọn đúng file audio.",
      invalidImage: "Vui lòng chọn đúng file hình ảnh.",
      needAudioContinue: "Bạn cần chọn file nhạc trước khi tiếp tục.",
      needAudioSave: "Bạn cần chọn file nhạc trước khi lưu.",
      titleArtistRequired: "Tên track và nghệ sĩ là bắt buộc.",
      saveFailed: "Không thể lưu track lên server.",
      trackFile: "Track file",
      chooseAudio: "Chọn file audio",
      supportedAudio: "Hỗ trợ MP3, WAV, FLAC, AIFF, ALAC, M4A và OGG.",
      chooseDrop: "Kéo thả hoặc bấm để chọn file",
      storageHint: "File sẽ được lưu vào Supabase Storage qua Node.js backend",
      coverAlt: "Ảnh bìa đang chọn",
      cover: "Ảnh bìa",
      uploadImage: "Tải ảnh lên",
      trackName: "Tên track",
      trackPlaceholder: "Ví dụ: Nhạc nghe buổi tối",
      artist: "Nghệ sĩ",
      artistPlaceholder: "Tên nghệ sĩ hoặc nhóm nhạc",
      category: "Thể loại",
      categorySearch: "Tìm thể loại...",
      noCategoryResults: "Không có thể loại phù hợp",
      descriptionLabel: "Mô tả",
      descriptionPlaceholder: "Ghi chú ngắn về track này.",
      savedTitle: "Đã lưu track",
      savedDescription:
        "Track đã được lưu vào Supabase và sẽ xuất hiện ở các trang hiển thị nhạc.",
      saving: "Đang lưu",
      saveTrack: "Lưu track",
      uploadNew: "Upload bài mới",
    },
  },
  en: {
    nav: {
      mainMenu: "Main menu",
      menu: "Menu",
      openMenu: "Open menu",
      collapseMenu: "Collapse menu",
      home: "Home",
      playlist: "Playlists",
      category: "Categories",
      upload: "Upload",
      profile: "Profile",
    },
    common: {
      close: "Close",
      cancel: "Cancel",
      back: "Back",
      continue: "Continue",
      save: "Save",
      unknown: "Unknown",
      song: "song",
      songs: "songs",
      category: "category",
      categories: "categories",
      playlist: "playlist",
      playlists: "playlists",
      minute: "minute",
      hour: "hour",
      noSongPlaying: "No song playing",
      unknownArtist: "Unknown artist",
      loadingMusicTitle: "Loading music from Supabase",
      loadingMusicDescription: "Please wait while the library is syncing.",
      waitingTitle: "Please wait",
      waitingMusicDescription:
        "The music library is still syncing and may take a little longer.",
      emptyMusicTitle: "No songs yet",
      emptyMusicDescription: "Upload songs to Supabase to start listening.",
      musicLoadErrorTitle: "Could not load music data",
    },
    topbar: {
      searchPlaceholder: "Search songs or artists",
      clearSearch: "Clear search",
      searchType: "Choose search type",
      searchModes: {
        songs: "Songs",
        artists: "Artists",
        all: "All",
      },
      resultGroups: {
        songs: "Songs",
        artists: "Artists",
      },
      artistSongCount: "{count} songs",
      noResults: "No matching results found.",
      hint: "Choose a search type, then enter a keyword.",
      profile: "Profile",
      account: "Account",
      accountName: "Minh Huy",
      googleReady: "Ready to connect Google",
      editAccount: "Edit account name",
      displayName: "Display name",
      signOut: "Sign out",
      language: "Language",
      languagePicker: "Choose language",
    },
    auth: {
      loadingTitle: "Checking sign-in",
      loadingDescription: "Please wait while MusicWeb syncs your account.",
      loginDescription: "Explore and share your music with the world today!",
      loginWithGoogle: "Login with Google",
      connecting: "Connecting...",
      configMissing:
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY in the backend .env.",
      signInFailed: "Could not sign in with Google.",
      signOutFailed: "Could not sign out.",
      updateFailed: "Could not update the account.",
    },
    footer: {
      musicPlayer: "Music player",
      playbackControls: "Playback controls",
      shuffle: "Shuffle",
      previous: "Previous",
      pause: "Pause",
      play: "Play",
      next: "Next",
      repeat: "Repeat",
      favorite: "Add to favorites",
      unfavorite: "Remove from favorites",
      seek: "Seek song",
      volume: "Volume",
      queue: "Up next",
      queueTitle: "Up next",
      closeQueue: "Close queue",
      emptyQueue: "No songs up next.",
    },
    home: {
      trending: "Trending music",
      chill: "Chill",
      newRelease: "New releases",
      collapse: "Collapse",
      seeMore: "See more >",
      clicks: "plays",
    },
    songs: {
      "noi-nay-co-anh": {
        description: "Light, easy-listening Vietnamese pop.",
      },
      "hay-trao-cho-anh": {
        description: "Catchy V-pop with a hip hop edge.",
      },
      "song-gio": {
        description: "Vietnamese melody with more emotion.",
      },
      "di-ve-nha": {
        description: "Warm and familiar Vietnamese rap.",
      },
      ngot: {
        description: "Bright Vietnamese groove.",
      },
      "come-my-way": {
        description: "Modern pop with an international color.",
      },
    },
    categoryPage: {
      title: "Categories",
      description: "Browse songs by genre and get to the right music faster.",
      back: "Back to Categories",
      pageSongs: "{name} songs",
      playCategory: "Play {name}",
      featured: "{count} featured songs in this genre",
    },
    categories: {
      vpop: {
        title: "V-pop",
        description: "Vietnamese tracks saved in your library",
      },
      hiphop: {
        title: "Hip hop",
        description: "Rap, groove, and modern beats",
      },
      pop: {
        title: "Pop",
        description: "Catchy and easy-listening pop",
      },
      kpop: {
        title: "K-pop",
        description: "Standout Korean pop tracks",
      },
      rap: {
        title: "Rap",
        description: "Flow, lyrics, and heavy rhythm",
      },
      rnb: {
        title: "R&B",
        description: "Smooth melodies with more groove",
      },
      rock: {
        title: "Rock",
        description: "Guitars, drums, and stronger energy",
      },
      ballad: {
        title: "Ballad",
        description: "Slow songs with more emotion",
      },
      edm: {
        title: "EDM",
        description: "Electronic beats for high-energy listening",
      },
      dance: {
        title: "Dance",
        description: "Fast rhythms made for movement",
      },
      acoustic: {
        title: "Acoustic",
        description: "Raw and intimate arrangements",
      },
      indie: {
        title: "Indie",
        description: "Independent sounds with more personality",
      },
      lofi: {
        title: "Lo-fi",
        description: "Soft sounds for relaxing and focus",
      },
      jazz: {
        title: "Jazz",
        description: "Improvised and refined harmony",
      },
      classical: {
        title: "Classical",
        description: "Classical and orchestral music",
      },
      country: {
        title: "Country",
        description: "Warm storytelling melodies",
      },
      bolero: {
        title: "Bolero",
        description: "Sentimental and nostalgic songs",
      },
      remix: {
        title: "Remix",
        description: "Reworked tracks with a fresh color",
      },
      cover: {
        title: "Cover",
        description: "Re-sung or refreshed versions",
      },
      instrumental: {
        title: "Instrumental",
        description: "Instrumentals and background beats",
      },
      soundtrack: {
        title: "Soundtrack",
        description: "Music for film, games, and stage",
      },
      other: {
        title: "Other",
        description: "Uploaded tracks without a category",
      },
    },
    card: {
      favoriteSongs: "Add favorite songs",
      songCount: "{count} songs",
    },
    playlistPage: {
      title: "Your playlists",
      description: "Personal playlists, quick mixes, and saved collections.",
      aria: "Your playlists",
      createTitle: "Create playlist",
      createDescription: "Build a custom playlist",
      newDialogTitle: "Create a new playlist",
      coverAlt: "Playlist cover",
      cover: "Cover",
      uploadImage: "Upload image",
      name: "Playlist name",
      namePlaceholder: "Example: Evening listening",
      descriptionLabel: "Description",
      descriptionPlaceholder:
        "Add a short note so you remember when to use this playlist.",
      vibe: "Vibe color",
      songsHeading: "Songs",
      songsDescription:
        "Skip this step or search for songs to add to the playlist.",
      songSearchPlaceholder: "Search songs or artists",
      noSongResults: "No matching songs found.",
      save: "Save playlist",
      defaultDescription: "Personal playlist",
      selectedSummary: "{count} songs - {duration}",
      songMinute: "{count} min",
      playlists: {
        allSongs: {
          title: "All songs",
          description: "Every track in the library",
        },
        sonTung: {
          title: "Sơn Tùng M-TP",
          description: "Available Sơn Tùng tracks",
        },
        vietMix: {
          title: "Vietnam mix",
          description: "Vietnamese V-pop and hip hop",
        },
      },
      detail: {
        back: "Back to Playlists",
        play: "Play {name}",
        aria: "{name} tracks",
        summary: "{count} songs - {duration}",
      },
      tones: {
        blue: "Blue glass",
        mint: "Mint chill",
        rose: "Rose night",
        amber: "Amber acoustic",
      },
    },
    profile: {
      info: "Profile information",
      music: "Profile music",
      musicSections: "Music sections",
      bio: "A personal music library for saved playlists and uploaded tracks.",
      stats: {
        liked: "Liked",
        history: "Played",
        uploaded: "Uploaded",
      },
      tabs: {
        favorites: "Favorites",
        history: "History",
        uploaded: "Uploaded",
      },
      noUploadedTitle: "No uploaded music yet",
      noUploadedDescription:
        "Upload your first track and this list will update automatically.",
      noFavoritesTitle: "No favorite songs yet",
      noFavoritesDescription:
        "Use the heart button in the player to add favorites.",
      noHistoryTitle: "No listening history yet",
      noHistoryDescription: "Songs will appear here after you play them.",
      goToUpload: "Go to Upload",
      supabaseUpload: "Supabase upload",
      unknownDuration: "Unknown",
      recentlyPlayed: "Recently played",
      inLibrary: "In library",
      deleteTrack: "Delete {title}",
      deleteTrackTitle: "Delete this track?",
      deleteTrackConfirm:
        '"{title}" will be deleted from Supabase and removed from the library.',
      deleteTrackAction: "Delete track",
      deletingTrack: "Deleting",
      deleteTrackFailed: "Could not delete the track.",
    },
    upload: {
      pageAria: "Upload track",
      title: "Upload music",
      description:
        "Upload a file, enter track info, and save it to Supabase through the Node.js backend.",
      stepsAria: "Upload steps",
      steps: {
        file: {
          label: "Track file",
          description: "Choose the audio file to save",
        },
        info: {
          label: "Details",
          description: "Add title, artist, and cover",
        },
        done: {
          label: "Done",
          description: "Track saved to Supabase",
        },
      },
      apiUnavailable: "This browser cannot connect to the upload API.",
      cannotLoadCategories: "Cannot load categories.",
      invalidAudio: "Please choose a valid audio file.",
      invalidImage: "Please choose a valid image file.",
      needAudioContinue: "Choose an audio file before continuing.",
      needAudioSave: "Choose an audio file before saving.",
      titleArtistRequired: "Track title and artist are required.",
      saveFailed: "Could not save the track to the server.",
      trackFile: "Track file",
      chooseAudio: "Choose an audio file",
      supportedAudio: "Supports MP3, WAV, FLAC, AIFF, ALAC, M4A, and OGG.",
      chooseDrop: "Drag and drop or click to choose a file",
      storageHint:
        "The file will be saved to Supabase Storage through the Node.js backend",
      coverAlt: "Selected cover image",
      cover: "Cover",
      uploadImage: "Upload image",
      trackName: "Track name",
      trackPlaceholder: "Example: Evening listening",
      artist: "Artist",
      artistPlaceholder: "Artist or band name",
      category: "Category",
      categorySearch: "Search categories...",
      noCategoryResults: "No matching categories",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Add a short note about this track.",
      savedTitle: "Track saved",
      savedDescription:
        "The track was saved to Supabase and will appear on music pages.",
      saving: "Saving",
      saveTrack: "Save track",
      uploadNew: "Upload another track",
    },
  },
};

const LanguageContext = createContext(null);

function getTranslationValue(language, key) {
  return key
    .split(".")
    .reduce((value, part) => value?.[part], translations[language]);
}

function interpolate(value, params) {
  return Object.entries(params).reduce(
    (text, [key, replacement]) =>
      text.replaceAll(`{${key}}`, String(replacement)),
    value,
  );
}

function getInitialLanguage() {
  if (typeof window === "undefined") return "vi";

  const storedLanguage = window.localStorage.getItem(languageStorageKey);

  return supportedLanguages.includes(storedLanguage) ? storedLanguage : "vi";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) return;
    setLanguageState(nextLanguage);
  }

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  const value = useMemo(() => {
    function t(key, params = {}, fallback = key) {
      const translatedValue =
        getTranslationValue(language, key) ??
        getTranslationValue("vi", key) ??
        fallback;

      if (typeof translatedValue !== "string") {
        return fallback;
      }

      return interpolate(translatedValue, params);
    }

    return { language, setLanguage, t };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}

export function formatMinutes(totalMinutes, language) {
  const safeMinutes = Number.isFinite(totalMinutes) ? totalMinutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (language === "en") {
    if (!safeMinutes) return "0 minutes";
    if (!hours) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    if (!minutes) return `${hours} ${hours === 1 ? "hour" : "hours"}`;

    const hourLabel = hours === 1 ? "hour" : "hours";
    const minuteLabel = minutes === 1 ? "minute" : "minutes";

    return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
  }

  if (!safeMinutes) return "0 phút";
  if (!hours) return `${minutes} phút`;
  if (!minutes) return `${hours} giờ`;

  return `${hours} giờ ${minutes} phút`;
}

export function localizeCategory(category, t) {
  if (!category?.id) return category;

  return {
    ...category,
    title: t(`categories.${category.id}.title`, {}, category.title),
    description: t(
      `categories.${category.id}.description`,
      {},
      category.description,
    ),
  };
}

export function localizePlaylist(playlist, t) {
  if (!playlist?.id) return playlist;

  const keyMap = {
    "all-songs": "allSongs",
    "son-tung": "sonTung",
    "viet-mix": "vietMix",
  };
  const playlistKey = keyMap[playlist.id];

  if (!playlistKey) return playlist;

  return {
    ...playlist,
    title: t(`playlistPage.playlists.${playlistKey}.title`, {}, playlist.title),
    description: t(
      `playlistPage.playlists.${playlistKey}.description`,
      {},
      playlist.description,
    ),
  };
}
