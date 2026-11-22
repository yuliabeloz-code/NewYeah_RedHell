/*
  ==================== НАСТРОЙКИ ====================
*/

const CONFIG = {
  // Укажите адрес вашей Edge Function:
  apiUrl: "https://egpenpcljhhicmngdgqv.supabase.co/functions/v1/mini-app",

  /*
    Даты проверяются по местному времени устройства.

    Формат:
    "ГГГГ-ММ-ДДTЧЧ:ММ:СС"

    Например:
    "2026-12-03T00:00:00"
  */
  treeAvailableFrom: "2026-11-20T00:00:00",
  musicAvailableFrom: "2026-11-20T00:00:00",
  predictionAvailableFrom: "2026-11-20T00:00:00",

  backgroundMusic: "background.mp3",

  // Добавляйте или удаляйте песни здесь.
  songs: [
    { title: "Песня 1", file: "music01.mp3", image: "vinyl01.png" },
    { title: "Песня 2", file: "music02.mp3", image: "vinyl02.png" }
  ]
};

/*
  ==================== ПРИЛОЖЕНИЕ ====================
*/

const tg = window.Telegram?.WebApp;

const app = document.getElementById("app");
const navigation = document.getElementById("navigation");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const audio = document.getElementById("audio");

const zodiac = [
  ["Овен", "zz01.png"],
  ["Телец", "zz02.png"],
  ["Близнецы", "zz03.png"],
  ["Рак", "zz04.png"],
  ["Лев", "zz05.png"],
  ["Дева", "zz06.png"],
  ["Весы", "zz07.png"],
  ["Скорпион", "zz08.png"],
  ["Стрелец", "zz09.png"],
  ["Козерог", "zz10.png"],
  ["Водолей", "zz11.png"],
  ["Рыбы", "zz12.png"]
];

let state = {
  profile: null,
  tasks: [],
  decorations: []
};

let currentPage = "home";
let songIndex = 0;
let audioMode = "";
let previewFile = null;
let previewUrl = null;
let previewPosition = { x: 0.5, y: 0.5 };

if (tg) {
  tg.ready();
  tg.expand();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function availableFrom(dateString) {
  const date = new Date(dateString);
  return Number.isFinite(date.getTime()) && Date.now() >= date.getTime();
}

function isDaytime() {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 16;
}

function showError(message) {
  alert(message || "Произошла ошибка.");
}

async function api(action, data = {}) {
  if (!tg?.initData) {
    throw new Error(
      "Откройте приложение через Telegram. " +
      "Обычный браузер не передаёт данные авторизации."
    );
  }

  const response = await fetch(CONFIG.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      initData: tg.initData,
      ...data
    })
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Ошибка соединения.");
  }

  return result;
}

async function uploadToy(file, position) {
  const form = new FormData();

  form.append("action", "upload_decoration");
  form.append("initData", tg.initData);
  form.append("file", file);
  form.append("x", String(position.x));
  form.append("y", String(position.y));

  const response = await fetch(CONFIG.apiUrl, {
    method: "POST",
    body: form
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || "Ошибка загрузки игрушки.");
  }

  return result;
}

function closeModal() {
  modal.classList.add("hidden");
  modalBody.innerHTML = "";

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewFile = null;
  previewUrl = null;
  previewPosition = { x: 0.5, y: 0.5 };
}

function openModal() {
  modal.classList.remove("hidden");
}

document.getElementById("close-modal")
  .addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

function applyState(result) {
  state = {
    profile: result.profile,
    tasks: result.tasks || [],
    decorations: result.decorations || []
  };
}

function renderStart() {
  document.body.classList.add("start-screen");
  navigation.classList.add("hidden");

  const hasProfile = Boolean(state.profile);

  app.innerHTML = `
    <section class="start">
      <h1>Назови своё имя, чертёнок</h1>

      <input
        id="name-input"
        maxlength="50"
        autocomplete="name"
        placeholder="Твоё имя"
      >

      <button id="open-door" class="gold-button" type="button">
        Открыть дверь
      </button>
    </section>
  `;

  const input = document.getElementById("name-input");
  const button = document.getElementById("open-door");

  if (hasProfile) {
    // При необходимости замените name на настоящее название поля.
    input.value = state.profile.name ?? "";
    input.readOnly = true;
  }

  button.addEventListener("click", async () => {
    const name = input.value.trim();

    if (!hasProfile && (!name || name.length > 50)) {
      showError("Введите имя длиной от 1 до 50 символов.");
      return;
    }

    button.disabled = true;

    try {
      if (!hasProfile) {
        const result = await api("create_profile", { name });
        applyState(result);
      }

      startBackgroundMusic();

      currentPage = "home";
      renderPage();
    } catch (error) {
      showError(error.message);
      button.disabled = false;
    }
  });
}
function treeMarkup() {
  const toys = state.decorations.map((toy) => `
    <img
      class="toy"
      src="${escapeHtml(toy.image_url)}"
      alt="Игрушка участника ${escapeHtml(toy.owner_name)}"
      title="${escapeHtml(toy.owner_name)}"
      data-owner="${escapeHtml(toy.owner_name)}"
      style="left:${Number(toy.x) * 100}%;top:${Number(toy.y) * 100}%"
    >
  `).join("");

  return `
    <div class="tree-stage">
      <img class="tree-base" src="tree.png" alt="Ёлка">
      ${toys}
    </div>
  `;
}

function clearBedroomBackground() {
  document.body.classList.remove(
    "bedroom-day",
    "bedroom-night"
  );
}

function renderHome() {
  clearBedroomBackground();

  const treeEnabled = availableFrom(CONFIG.treeAvailableFrom);
  const musicEnabled = availableFrom(CONFIG.musicAvailableFrom);
  const predictionEnabled = availableFrom(CONFIG.predictionAvailableFrom);

  const roomImage = isDaytime()
    ? "living-room.jpg"
    : "living-room-night.jpg";

  app.innerHTML = `
    <h1>Добро пожаловать домой, ${escapeHtml(state.profile.name)}</h1>

    <div class="room-frame">
      <img class="room-image" src="${roomImage}" alt="Гостиная">

      <button
        id="tree-button"
        class="room-tree-button"
        type="button"
        aria-label="Открыть ёлку"
        ${treeEnabled ? "" : "disabled"}
      >
        ${treeMarkup()}
      </button>

      <button
        id="music-button"
        class="room-music-button"
        type="button"
        aria-label="Открыть музыку"
        ${musicEnabled ? "" : "disabled"}
      >
        <img src="music.png" alt="">
      </button>
    </div>

    ${predictionEnabled ? `
      <div class="prediction-row">
        <button
          id="prediction-button"
          class="prediction-image-button"
          type="button"
        >
          <span>Получить предсказание</span>
        </button>
      </div>
    ` : ""}
  `;

  document.getElementById("tree-button")
    .addEventListener("click", openTree);

  document.getElementById("music-button")
    .addEventListener("click", openMusic);

  document.getElementById("prediction-button")
    ?.addEventListener("click", openZodiacList);
}

function clearBedroomBackground() {
  document.body.classList.remove("bedroom-day", "bedroom-night");
}

function setBedroomBackground() {
  clearBedroomBackground();

  if (isDaytime()) {
    document.body.classList.add("bedroom-day");
  } else {
    document.body.classList.add("bedroom-night");
  }
}

function renderBedroom() {
  setBedroomBackground();

  app.innerHTML = `
    <h1>Личная комната</h1>

    <div class="task">
      <p>Имя: ${escapeHtml(state.profile.name)}</p>

      <p>
        Конфеты:
        ${Number(state.profile.candy_balance)}
      </p>

      <p>
        Заработано за сохранённый день:
        ${Number(state.profile.candy_earned_today)}
      </p>
    </div>
  `;
}
// Например, функция адвент-календаря
function renderAdvent() {
  clearBedroomBackground();

  const tasksHtml = state.tasks.map((entry) => {
    const task = entry.task || {};

    return `
      <article class="task">
        <h2>${escapeHtml(task.title || "")}</h2>
        <p>${escapeHtml(task.description || "")}</p>
        <p>
          ${entry.completed ? "Выполнено" : "Не выполнено"}
        </p>
      </article>
    `;
  }).join("");

  app.innerHTML = `
    <h1>Адвент-календарь</h1>
    ${tasksHtml}
  `;
}

function renderPage() {
  if (!state.profile) {
    renderStart();
    return;
  }

  document.body.classList.remove("start-screen");
  navigation.classList.remove("hidden");

  if (currentPage === "bedroom") {
    renderBedroom();
  } else if (currentPage === "advent") {
        renderAdvent();
  } else {
    renderHome();
  }
}

navigation.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");

  if (!button) return;

  currentPage = button.dataset.page;
  closeModal();
  renderPage();
});

/*
  ==================== ЁЛКА ====================
*/

function openTree() {
  if (!availableFrom(CONFIG.treeAvailableFrom)) return;

  openModal();
  renderTreeModal();
}

function renderTreeModal() {
  modalBody.innerHTML = `
    <h2>Общая ёлка</h2>

    <div id="modal-tree" class="tree-modal-stage">
      ${treeMarkup()}
    </div>

    <div class="modal-actions">
      <label class="gold-button" for="toy-file">
        Украсить ёлку
      </label>

      <input
        id="toy-file"
        type="file"
        accept="image/png"
        class="hidden"
      >

      <button
        id="save-toy"
        class="gold-button"
        type="button"
        disabled
      >
        Сохранить
      </button>
    </div>
  `;

  modalBody.querySelectorAll(".toy[data-owner]").forEach((toy) => {
    toy.addEventListener("click", () => {
      alert(`Игрушку добавил: ${toy.dataset.owner}`);
    });
  });

  document.getElementById("toy-file")
    .addEventListener("change", handleToySelection);

  document.getElementById("save-toy")
    .addEventListener("click", saveToy);
}

function handleToySelection(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (file.type !== "image/png" || file.size > 5 * 1024 * 1024) {
    showError("Выберите PNG размером не более 5 МБ.");
    event.target.value = "";
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewFile = file;
  previewUrl = URL.createObjectURL(file);
  previewPosition = { x: 0.5, y: 0.5 };

  const stage = modalBody.querySelector(".tree-stage");
  stage.querySelector(".toy-preview")?.remove();

  const preview = document.createElement("img");
  preview.className = "toy toy-preview";
  preview.src = previewUrl;
  preview.alt = "Переместите новую игрушку";
  stage.appendChild(preview);

  function setPosition(clientX, clientY) {
    const rect = stage.getBoundingClientRect();

    previewPosition.x = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );

    previewPosition.y = Math.max(
      0,
      Math.min(1, (clientY - rect.top) / rect.height)
    );

    preview.style.left = `${previewPosition.x * 100}%`;
    preview.style.top = `${previewPosition.y * 100}%`;
  }

  preview.style.left = "50%";
  preview.style.top = "50%";

  preview.addEventListener("pointerdown", (pointerEvent) => {
    pointerEvent.preventDefault();
    preview.setPointerCapture(pointerEvent.pointerId);
    setPosition(pointerEvent.clientX, pointerEvent.clientY);
  });

  preview.addEventListener("pointermove", (pointerEvent) => {
    if (preview.hasPointerCapture(pointerEvent.pointerId)) {
      setPosition(pointerEvent.clientX, pointerEvent.clientY);
    }
  });

  document.getElementById("save-toy").disabled = false;
}

async function saveToy() {
  if (!previewFile) return;

  const button = document.getElementById("save-toy");
  button.disabled = true;

  try {
    const result = await uploadToy(previewFile, previewPosition);
    state.decorations = result.decorations;

    closeModal();
    renderPage();
  } catch (error) {
    showError(error.message);
    button.disabled = false;
  }
}

/*
  ==================== МУЗЫКА ====================
*/
const SONGS_PER_PAGE = 4;

let musicPage = 0;
let hasSelectedSong = false;

/* =========================
   Фоновая музыка
========================= */

function startBackgroundMusic() {
  audioMode = "background";
  audio.src = CONFIG.backgroundMusic;
  audio.volume = 0.2;
  audio.loop = true;

  audio.play().catch(() => {
    // Некоторые устройства запрещают автозапуск.
  });
}

/* =========================
   Воспроизведение песен
========================= */

function playSong(index) {
  const songs = CONFIG.songs;

  if (!songs || !songs.length) return;

  songIndex = (
    (index % songs.length) + songs.length
  ) % songs.length;

  hasSelectedSong = true;
  audioMode = "playlist";

  audio.loop = false;
  audio.volume = 0.7;
  audio.src = songs[songIndex].file;

  // При переключении песни показываем страницу с её пластинкой.
  musicPage = Math.floor(songIndex / SONGS_PER_PAGE);

  // Обновляем окно, только если сейчас открыт экран музыки.
  if (
    !modal.classList.contains("hidden") &&
    modalBody.querySelector("#music-screen")
  ) {
    renderMusicModal();
  }

  audio.play().catch(() => {
    showError("Не удалось воспроизвести аудиофайл.");
    updateMusicPlayer();
  });
}

/* =========================
   Открытие окна музыки
========================= */

function openMusic() {
  if (!availableFrom(CONFIG.musicAvailableFrom)) return;

  openModal();
  renderMusicModal();
}

/* =========================
   Отображение окна музыки
========================= */

function renderMusicModal() {
  const songs = CONFIG.songs || [];

  if (!songs.length) {
    modalBody.innerHTML = `
      <div id="music-screen">
        <h2>Музыка</h2>
        <p>Песен пока нет.</p>
      </div>
    `;

    return;
  }

  const pageCount = Math.ceil(songs.length / SONGS_PER_PAGE);

  musicPage = (
    (musicPage % pageCount) + pageCount
  ) % pageCount;

  const startIndex = musicPage * SONGS_PER_PAGE;
  const pageSongs = songs.slice(
    startIndex,
    startIndex + SONGS_PER_PAGE
  );

  const recordsHtml = pageSongs.map((song, index) => {
    const actualIndex = startIndex + index;

    const isActive =
      hasSelectedSong &&
      audioMode === "playlist" &&
      actualIndex === songIndex;

    return `
      <button
        class="vinyl-item ${isActive ? "is-active" : ""}"
        type="button"
        data-song-index="${actualIndex}"
        aria-label="Воспроизвести: ${escapeHtml(song.title)}"
      >
        <img src="${escapeHtml(song.image || "music01.png")}" alt="">
        <span>${escapeHtml(song.title)}</span>
      </button>
    `;
  }).join("");

  const showPlayer =
    hasSelectedSong &&
    audioMode === "playlist" &&
    Boolean(songs[songIndex]);

  modalBody.innerHTML = `
    <div id="music-screen">
      <h2>Музыка</h2>

      <div class="vinyl-grid">
        ${recordsHtml}
      </div>

      ${
        showPlayer
          ? `
            <div class="music-player">
              <div class="player-title">
                ${escapeHtml(songs[songIndex].title)}
              </div>

              <input
                id="music-progress"
                class="music-progress"
                type="range"
                min="0"
                max="0"
                value="0"
                step="0.1"
                aria-label="Позиция воспроизведения"
              >

              <div class="player-time">
                <span id="music-current-time">0:00</span>
                <span id="music-duration">0:00</span>
              </div>

              <div class="player-controls">
                <button
                  id="player-previous"
                  type="button"
                  aria-label="Предыдущая песня"
                  title="Предыдущая песня"
                >⏮</button>

                <button
                  id="player-toggle"
                  type="button"
                  aria-label="Воспроизвести"
                  title="Воспроизвести или поставить на паузу"
                >▶</button>

                <button
                  id="player-next"
                  type="button"
                                    aria-label="Следующая песня"
                  title="Следующая песня"
                >⏭</button>
              </div>
            </div>
          `
          : ""
      }

      <div class="music-pagination">
        <button
          id="previous-page"
          class="gold-button"
          type="button"
          aria-label="Предыдущая страница"
        >←</button>

        <span>Страница ${musicPage + 1} из ${pageCount}</span>

        <button
          id="next-page"
          class="gold-button"
          type="button"
          aria-label="Следующая страница"
        >→</button>
      </div>
    </div>
  `;

  // Нажатие на пластинку.
  modalBody.querySelectorAll("[data-song-index]").forEach((button) => {
    button.addEventListener("click", () => {
      playSong(Number(button.dataset.songIndex));
    });
  });

  // Предыдущая страница пластинок.
  modalBody.querySelector("#previous-page").addEventListener("click", () => {
    musicPage = (musicPage - 1 + pageCount) % pageCount;
    renderMusicModal();
  });

  // Следующая страница пластинок.
  modalBody.querySelector("#next-page").addEventListener("click", () => {
    musicPage = (musicPage + 1) % pageCount;
    renderMusicModal();
  });

  if (!showPlayer) return;

  // Предыдущая песня.
  modalBody.querySelector("#player-previous").addEventListener("click", () => {
    playSong(songIndex - 1);
  });

  // Следующая песня.
  modalBody.querySelector("#player-next").addEventListener("click", () => {
    playSong(songIndex + 1);
  });

  // Пауза и продолжение воспроизведения.
  modalBody.querySelector("#player-toggle").addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {
        showError("Не удалось воспроизвести аудиофайл.");
        updateMusicPlayer();
      });
    } else {
      audio.pause();
    }
  });

  // Перемотка с помощью ползунка.
  modalBody.querySelector("#music-progress").addEventListener("input", (event) => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = Number(event.target.value);
    }
  });

  updateMusicPlayer();
}

/* =========================
   Обновление медиаплеера
========================= */

function formatMusicTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateMusicPlayer() {
  if (audioMode !== "playlist") return;

  const screen = modalBody.querySelector("#music-screen");

  if (!screen) return;

  const progress = screen.querySelector("#music-progress");
  const currentTime = screen.querySelector("#music-current-time");
  const duration = screen.querySelector("#music-duration");
  const toggle = screen.querySelector("#player-toggle");

  if (!progress || !currentTime || !duration || !toggle) return;

  const total = Number.isFinite(audio.duration)
    ? audio.duration
    : 0;

  progress.max = total;
  progress.value = Math.min(audio.currentTime || 0, total);

  currentTime.textContent = formatMusicTime(audio.currentTime);
  duration.textContent = formatMusicTime(total);

  toggle.textContent = audio.paused ? "▶" : "⏸";

  toggle.setAttribute(
    "aria-label",
    audio.paused ? "Воспроизвести" : "Пауза"
  );
}

/* =========================
   События аудиоплеера
========================= */

audio.addEventListener("timeupdate", updateMusicPlayer);
audio.addEventListener("loadedmetadata", updateMusicPlayer);
audio.addEventListener("durationchange", updateMusicPlayer);
audio.addEventListener("play", updateMusicPlayer);
audio.addEventListener("pause", updateMusicPlayer);

audio.addEventListener("ended", () => {
  if (audioMode === "playlist" && CONFIG.songs.length) {
    playSong(songIndex + 1);
  }
});

/*
  ==================== ПРЕДСКАЗАНИЯ ====================
*/

function openZodiacList() {
  if (!availableFrom(CONFIG.predictionAvailableFrom)) return;

  openModal();

  modalBody.innerHTML = `
    <div class="zodiac-screen">
      <h2>Выберите знак зодиака</h2>

      <div class="zodiac-list">
        ${zodiac.map(([name], index) => `
          <button
            class="zodiac-button"
            data-index="${index}"
            type="button"
          >
            ${escapeHtml(name)}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  modalBody.querySelectorAll(".zodiac-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        showPrediction(Number(button.dataset.index));
      });
    });
}
function showPrediction(index) {
  const [name, file] = zodiac[index];

  modalBody.innerHTML = `
    <h2>${escapeHtml(name)}</h2>

    <img
      class="prediction-card"
      src="${escapeHtml(file)}"
      alt="Предсказание: ${escapeHtml(name)}"
    >

    <div class="modal-actions">
      <button id="back-to-zodiac" class="gold-button" type="button">
        Назад к знакам
      </button>
    </div>
  `;

  document.getElementById("back-to-zodiac")
    .addEventListener("click", openZodiacList);
}

/*
  ==================== ОБНОВЛЕНИЕ И ЗАПУСК ====================
*/

async function refreshDecorations() {
  if (!state.profile) return;

  try {
    const result = await api("get_decorations");
    state.decorations = result.decorations || [];

    // Не перерисовываем открытое окно, чтобы не мешать
    // пользователю перемещать новую игрушку.
    if (
      currentPage === "home" &&
      modal.classList.contains("hidden")
    ) {
      renderHome();
    }
  } catch (error) {
    console.error(error);
  }
}

async function start() {
  app.innerHTML = '<p class="message">Загрузка…</p>';

  if (!tg?.initData) {
    app.innerHTML = `
      <p class="message">
        Откройте приложение через Telegram.
      </p>
    `;
    return;
  }

  try {
    const result = await api("get_state");
    applyState(result);

    // Показываем стартовый экран и новым, и существующим участникам.
    renderStart();
  } catch (error) {
    app.innerHTML = `
      <p class="message">${escapeHtml(error.message)}</p>
    `;
  }
}
setInterval(refreshDecorations, 15000);
window.addEventListener("pagehide", () => {
  audio.pause();
});

start();
