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

/* =========================================
   ВВОД ИМЕНИ И ВХОД В ДОМ
   ========================================= */

/* Создаём поле имени перед кнопкой входа */
const nameField = document.createElement("div");
nameField.className = "name-field";

const nameLabel = document.createElement("label");
nameLabel.htmlFor = "visitor-name";
nameLabel.textContent = "Как тебя зовут?";

const nameInput = document.createElement("input");
nameInput.id = "visitor-name";
nameInput.className = "name-input";
nameInput.type = "text";
nameInput.placeholder = "Введи своё имя";
nameInput.maxLength = 40;
nameInput.autocomplete = "given-name";
nameInput.setAttribute("aria-describedby", "name-message");

const nameMessage = document.createElement("p");
nameMessage.id = "name-message";
nameMessage.className = "name-message";
nameMessage.setAttribute("role", "status");

nameField.appendChild(nameLabel);
nameField.appendChild(nameInput);
nameField.appendChild(nameMessage);

knockButton.insertAdjacentElement("beforebegin", nameField);

/* Подставляем имя, если оно уже сохранялось в этом браузере */
try {
  nameInput.value = localStorage.getItem("visitorName") || "";
} catch (error) {
  /* Если хранилище недоступно, вход всё равно будет работать */
}

nameInput.addEventListener("input", function () {
  nameMessage.textContent = "";
});

/* Вход по нажатию Enter в поле имени */
nameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    knockButton.click();
  }
});

knockButton.addEventListener("click", function () {
  const visitorName = nameInput.value.trim();

  if (!visitorName) {
    nameMessage.textContent = "Пожалуйста, введи своё имя.";
    nameInput.focus();
    return;
  }

  try {
    localStorage.setItem("visitorName", visitorName);
  } catch (error) {
    /* Если хранилище недоступно, продолжаем без сохранения */
  }

  homeTitle.textContent = "Добро пожаловать домой, " + visitorName + "!";

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

     document.body.classList.toggle(
  "personal-room-background",
  selectedView === "personal-room-view"
);

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
  Укажите свои названия и пути к файлам:
  title — название песни;
  image — изображение пластинки;
  audio — музыкальный файл.
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

/* Кнопка открытия плейлиста */
const musicButton = document.createElement("button");
musicButton.type = "button";
musicButton.className = "music-button";
musicButton.textContent = "Послушать музыку";
musicButton.setAttribute("aria-haspopup", "dialog");
musicButton.setAttribute("aria-controls", "music-menu");
musicButton.setAttribute("aria-expanded", "false");

decorationPanel.insertBefore(musicButton, decorationMessage);

/* Окно плейлиста поверх страницы */
const musicMenu = document.createElement("dialog");
musicMenu.id = "music-menu";
musicMenu.className = "music-menu";
musicMenu.setAttribute("aria-labelledby", "music-menu-title");

/* Заголовок и кнопка закрытия */
const musicHeader = document.createElement("div");
musicHeader.className = "music-menu-header";

const musicTitle = document.createElement("h2");
musicTitle.id = "music-menu-title";
musicTitle.textContent = "Плейлист красного клана";

const closeMusicButton = document.createElement("button");
closeMusicButton.type = "button";
closeMusicButton.className = "music-close";
closeMusicButton.textContent = "×";
closeMusicButton.setAttribute("aria-label", "Закрыть плейлист");

musicHeader.appendChild(musicTitle);
musicHeader.appendChild(closeMusicButton);

/* Стрелки и список пластинок */
const recordsCarousel = document.createElement("div");
recordsCarousel.className = "records-carousel";

const previousButton = document.createElement("button");
previousButton.type = "button";
previousButton.className = "records-arrow";
previousButton.textContent = "‹";
previousButton.setAttribute("aria-label", "Листать пластинки влево");

const recordsList = document.createElement("div");
recordsList.className = "records-list";
recordsList.setAttribute("aria-label", "Пластинки");

const nextButton = document.createElement("button");
nextButton.type = "button";
nextButton.className = "records-arrow";
nextButton.textContent = "›";
nextButton.setAttribute("aria-label", "Листать пластинки вправо");

recordsCarousel.appendChild(previousButton);
recordsCarousel.appendChild(recordsList);
recordsCarousel.appendChild(nextButton);

/* Плеер */
const musicPlayer = document.createElement("audio");
musicPlayer.className = "music-player";
musicPlayer.controls = true;
musicPlayer.preload = "none";
musicPlayer.setAttribute("aria-label", "Музыкальный плеер");

const musicMessage = document.createElement("p");
musicMessage.className = "music-message";
musicMessage.setAttribute("role", "status");
musicMessage.textContent = "Выберите пластинку, чтобы включить музыку.";

musicMenu.appendChild(musicHeader);
musicMenu.appendChild(recordsCarousel);
musicMenu.appendChild(musicPlayer);
musicMenu.appendChild(musicMessage);

document.body.appendChild(musicMenu);

/* Открытие и закрытие окна */
musicButton.addEventListener("click", function () {
  if (!musicMenu.open) {
    musicMenu.showModal();
    musicButton.setAttribute("aria-expanded", "true");
    updateRecordsArrows();
  }
});

closeMusicButton.addEventListener("click", function () {
  musicMenu.close();
});

/* Срабатывает и при закрытии крестиком, и при нажатии Escape */
musicMenu.addEventListener("close", function () {
  musicButton.setAttribute("aria-expanded", "false");
  musicButton.focus();
});

/* Прокрутка пластинок */
function updateRecordsArrows() {
  const maxScroll = recordsList.scrollWidth - recordsList.clientWidth;

  previousButton.disabled = recordsList.scrollLeft <= 1;
  nextButton.disabled = recordsList.scrollLeft >= maxScroll - 1;
}
previousButton.addEventListener("click", function () {
  recordsList.scrollBy({
    left: -150,
    behavior: "smooth"
  });
});

nextButton.addEventListener("click", function () {
  recordsList.scrollBy({
    left: 150,
    behavior: "smooth"
  });
});

recordsList.addEventListener("scroll", updateRecordsArrows);
window.addEventListener("resize", function () {
  if (musicMenu.open) {
    updateRecordsArrows();
  }
});

/* Создание кнопок-пластинок */
const recordButtons = [];
let selectedTrack = null;

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
    selectedTrack = track;

    musicPlayer.src = track.audio;
    musicMessage.textContent = "Запуск: " + track.title;

    musicPlayer.play().catch(function (error) {
      /* Не показываем ошибку, если пользователь уже выбрал другую песню */
      if (selectedTrack !== track || error.name === "AbortError") {
        return;
      }

      musicMessage.textContent =
        "Не удалось включить музыку. Проверьте путь к файлу.";
    });
  });

  recordsList.appendChild(recordButton);
  recordButtons.push(recordButton);
});

musicPlayer.addEventListener("play", function () {
  if (selectedTrack) {
    musicMessage.textContent = "Сейчас играет: " + selectedTrack.title;
  }
});

musicPlayer.addEventListener("error", function () {
  musicMessage.textContent =
    "Не удалось загрузить песню. Проверьте путь к файлу.";
});

/* =========================================
   УБИРАЕМ ФОН ПОД КНОПКАМИ НАВИГАЦИИ
   ========================================= */

if (navigationButtons.length > 0) {
  let navigationContainer = navigationButtons[0].parentElement;

  /* Находим общий контейнер всех кнопок меню */
  while (
    navigationContainer &&
    !Array.from(navigationButtons).every(function (button) {
      return navigationContainer.contains(button);
    })
  ) {
    navigationContainer = navigationContainer.parentElement;
  }

  if (
    navigationContainer &&
    navigationContainer !== document.body &&
    navigationContainer !== homeScreen
  ) {
    navigationContainer.classList.add("navigation-transparent");
  }
}
