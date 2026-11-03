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
