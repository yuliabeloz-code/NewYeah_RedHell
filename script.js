/* =========================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
   ========================================= */

const welcomeScreen = document.getElementById("welcome-screen");
const homeScreen = document.getElementById("home-screen");
const knockButton = document.getElementById("knock-button");
const navigationButtons = document.querySelectorAll(".nav-button");

/* Заголовок «Добро пожаловать домой, чертята!» */
const homeTitle = document.querySelector(".home-header h1");

/* Изображение гостиной */
const livingRoomImage = document.getElementById("living-room");

/* Разделы нижнего меню */
const views = [
  document.getElementById("living-room-view"),
  document.getElementById("calendar-view"),
  document.getElementById("personal-room-view")
];

/* =========================================
   ВХОД В ДОМ
   ========================================= */

knockButton.addEventListener("click", function () {
  welcomeScreen.hidden = true;
  homeScreen.hidden = false;

  document.body.classList.add("entered");
  window.scrollTo(0, 0);
});

/* =========================================
   ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ
   ========================================= */

navigationButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const selectedView = button.dataset.view;

    views.forEach(function (view) {
      view.hidden = view.id !== selectedView;
    });

    /* Заголовок виден только в гостиной */
    homeTitle.hidden = selectedView !== "living-room-view";

    navigationButtons.forEach(function (navButton) {
      navButton.removeAttribute("aria-current");
    });

    button.setAttribute("aria-current", "page");
  });
});

/* =========================================
   ДНЕВНОЕ И НОЧНОЕ ИЗОБРАЖЕНИЕ ГОСТИНОЙ

   День: с 06:00 до 15:59.
   Ночь: с 16:00 до 05:59.
   ========================================= */

function updateLivingRoom() {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 16;

  livingRoomImage.src = isDay
    ? "living-room.jpg"
    : "living-room-night.jpg";
}

updateLivingRoom();

setInterval(updateLivingRoom, 60 * 1000);

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    updateLivingRoom();
  }
});

/* =========================================
   ЁЛКА И ЗАГРУЗКА ИГРУШЕК
   ========================================= */

const roomFrame = livingRoomImage.closest(".room-frame");

/* Слой с ёлкой поверх изображения гостиной */
const treeOverlay = document.createElement("div");
treeOverlay.className = "tree-overlay";
treeOverlay.setAttribute("aria-hidden", "true");

roomFrame.appendChild(treeOverlay);

/* Зелёный блок под изображением гостиной */
const decorationPanel = document.createElement("div");
decorationPanel.className = "decoration-panel";

/* Кнопка загрузки игрушки */
const decorateButton = document.createElement("button");
decorateButton.type = "button";
decorateButton.className = "decorate-button";
decorateButton.textContent = "Украсить ёлку";

/* Скрытое поле выбора файла */
const toyFileInput = document.createElement("input");
toyFileInput.type = "file";
toyFileInput.accept = "image/png,image/webp";
toyFileInput.hidden = true;

/* Подсказка и сообщения об ошибках */
const decorationMessage = document.createElement("p");
decorationMessage.className = "decoration-message";
decorationMessage.setAttribute("role", "status");
decorationMessage.textContent =
  "Выберите игрушку в формате PNG или WebP с прозрачным фоном.";

decorationPanel.appendChild(decorateButton);
decorationPanel.appendChild(toyFileInput);
decorationPanel.appendChild(decorationMessage);

roomFrame.insertAdjacentElement("afterend", decorationPanel);

/*
  Места для игрушек на ёлке.

  Первое число — положение слева направо.
  Второе число — положение сверху вниз.

  При необходимости их можно изменить.
*/
const toyPositions = [
  { x: 50, y: 25 },
  { x: 42, y: 35 },
  { x: 58, y: 35 },
  { x: 35, y: 47 },
  { x: 50, y: 45 },
  { x: 65, y: 47 },
  { x: 30, y: 60 },
  { x: 43, y: 58 },
  { x: 57, y: 58 },
  { x: 70, y: 60 },
  { x: 25, y: 73 },
  { x: 38, y: 71 },
  { x: 50, y: 73 },
  { x: 62, y: 71 },
  { x: 75, y: 73 }
];

let toyCount = 0;

/* Открываем выбор файла */
decorateButton.addEventListener("click", function () {
  toyFileInput.click();
});

/* Добавляем загруженную игрушку */
toyFileInput.addEventListener("change", function () {
  const file = toyFileInput.files[0];

  /* Позволяет повторно выбрать тот же файл */
  toyFileInput.value = "";

  if (!file) {
    return;
  }

  if (file.type !== "image/png" && file.type !== "image/webp") {
    decorationMessage.textContent =
      "Пожалуйста, выберите изображение PNG или WebP.";
    return;
  }

  /* Ограничение размера файла — 5 МБ */
  if (file.size > 5 * 1024 * 1024) {
    decorationMessage.textContent =
      "Файл слишком большой. Выберите игрушку размером до 5 МБ.";
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  const testImage = new Image();

  testImage.onload = function () {
    const position = toyPositions[toyCount % toyPositions.length];

    const toy = document.createElement("div");
    toy.className = "tree-toy";
    toy.style.left = position.x + "%";
    toy.style.top = position.y + "%";
    toy.style.backgroundImage = 'url("' + imageUrl + '")';

    treeOverlay.appendChild(toy);

    toyCount += 1;
    decorationMessage.textContent = "Игрушка добавлена на ёлку!";

    /*
      Ссылка нужна, пока игрушка отображается.
      Освобождаем её при закрытии страницы.
    */
    window.addEventListener("pagehide", function () {
      URL.revokeObjectURL(imageUrl);
    }, { once: true });
  };

  testImage.onerror = function () {
    URL.revokeObjectURL(imageUrl);
    decorationMessage.textContent =
      "Не удалось открыть изображение. Попробуйте другой файл.";
  };

  testImage.src = imageUrl;
});
/* =========================================
   МУЗЫКА В ГОСТИНОЙ
   ========================================= */

/*
  Список пластинок.

  image — изображение пластинки.
  audio — музыкальный файл.

  Замените названия файлов и песен на свои.
*/
const musicTracks = [
  {
    title: "Новогодняя песня",
    image: "record-1.png",
    audio: "song-1.mp3"
  },
  {
    title: "Зимний вечер",
    image: "record-2.png",
    audio: "song-2.mp3"
  },
  {
    title: "Музыка у камина",
    image: "record-3.png",
    audio: "song-3.mp3"
  }
];

/* Кнопка рядом с кнопкой украшения ёлки */
const musicButton = document.createElement("button");
musicButton.type = "button";
musicButton.className = "music-button";
musicButton.textContent = "Послушать музыку";
musicButton.setAttribute("aria-expanded", "false");
musicButton.setAttribute("aria-controls", "music-menu");

/* Добавляем кнопку перед сообщением об игрушках */
decorationPanel.insertBefore(musicButton, decorationMessage);

/* Меню с пластинками */
const musicMenu = document.createElement("div");
musicMenu.id = "music-menu";
musicMenu.className = "music-menu";
musicMenu.hidden = true;

const musicTitle = document.createElement("h2");
musicTitle.textContent = "Выберите пластинку";

const recordsList = document.createElement("div");
recordsList.className = "records-list";

/* Плеер с кнопками паузы и регулировкой громкости */
const musicPlayer = document.createElement("audio");
musicPlayer.className = "music-player";
musicPlayer.controls = true;
musicPlayer.preload = "none";

const musicMessage = document.createElement("p");
musicMessage.className = "music-message";
musicMessage.setAttribute("role", "status");
musicMessage.textContent = "Выберите пластинку, чтобы включить музыку.";

musicMenu.appendChild(musicTitle);
musicMenu.appendChild(recordsList);
musicMenu.appendChild(musicPlayer);
musicMenu.appendChild(musicMessage);

decorationPanel.appendChild(musicMenu);

/* Открываем и закрываем меню */
musicButton.addEventListener("click", function () {
  const opening = musicMenu.hidden;

  musicMenu.hidden = !opening;
  musicButton.setAttribute("aria-expanded", String(opening));
});

/* Создаём кнопки-пластинки */
const recordButtons = [];

musicTracks.forEach(function (track) {
  const recordButton = document.createElement("button");
  recordButton.type = "button";
  recordButton.className = "record-button";
  recordButton.setAttribute("aria-pressed", "false");

  const recordImage = document.createElement("img");
  recordImage.src = track.image;
  recordImage.alt = "";

  const recordName = document.createElement("span");
  recordName.textContent = track.title;

  recordButton.appendChild(recordImage);
  recordButton.appendChild(recordName);

  recordButton.addEventListener("click", function () {
    recordButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", "false");
    });

    recordButton.setAttribute("aria-pressed", "true");

    musicPlayer.src = track.audio;
    musicMessage.textContent = "Сейчас играет: " + track.title;

    musicPlayer.play().catch(function () {
      musicMessage.textContent =
        "Не удалось включить музыку. Проверьте музыкальный файл.";
    });
  });

  recordsList.appendChild(recordButton);
  recordButtons.push(recordButton);
});

musicPlayer.addEventListener("error", function () {
  musicMessage.textContent =
    "Не удалось загрузить песню. Проверьте путь к файлу.";
});
