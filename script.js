/* =========================================
   АДРЕС СЕРВЕРА

   После создания сервера на Render замените
   адрес ниже на адрес вашего сервиса.

   Пример:
   const API_URL = "https://moy-dom.onrender.com";

   Не ставьте / в конце адреса.
   ========================================= */

const API_URL = "https://ВАШ-СЕРВЕР.onrender.com";


/* =========================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
   ========================================= */

const welcomeScreen = document.getElementById("welcome-screen");
const homeScreen = document.getElementById("home-screen");
const knockButton = document.getElementById("knock-button");
const navigationButtons = document.querySelectorAll(".nav-button");
const homeTitle = document.querySelector(".home-header h1");
const userStatus = document.getElementById("user-status");

const views = [
  document.getElementById("living-room-view"),
  document.getElementById("calendar-view"),
  document.getElementById("personal-room-view")
];


/* =========================================
   ПОДГОТОВКА TELEGRAM MINI APP
   ========================================= */

const telegramApp = window.Telegram?.WebApp;

if (telegramApp) {
  telegramApp.ready();
}


/* =========================================
   ВХОД В ДОМ
   ========================================= */

knockButton.addEventListener("click", function () {
  welcomeScreen.hidden = true;
  homeScreen.hidden = false;

  document.body.classList.add("entered");
  window.scrollTo(0, 0);

  // После входа отправляем данные пользователя на сервер.
  saveUser();
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

    // Заголовок показывается только в гостиной.
    homeTitle.hidden = selectedView !== "living-room-view";

    navigationButtons.forEach(function (navButton) {
      navButton.removeAttribute("aria-current");
    });

    button.setAttribute("aria-current", "page");
  });
});


/* =========================================
   ДНЕВНОЕ И НОЧНОЕ ИЗОБРАЖЕНИЕ

   День: с 06:00 до 15:59.
   Ночь: с 16:00 до 05:59.

   Используется время устройства пользователя.
   ========================================= */

function updateLivingRoom() {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 16;

  document.getElementById("living-room").src = isDay
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
   СОХРАНЕНИЕ ПОЛЬЗОВАТЕЛЯ

   Telegram передаёт initData. Сервер проверяет
   эти данные и сохраняет пользователя в базу.
   ========================================= */

async function saveUser() {
  if (!telegramApp || !telegramApp.initData) {
    userStatus.textContent =
      "Откройте приложение через кнопку меню вашего Telegram-бота.";
    return;
  }

  if (API_URL.includes("ВАШ-СЕРВЕР")) {
    userStatus.textContent =
      "Адрес сервера ещё не указан в файле script.js.";
    return;
  }

  userStatus.textContent = "Сохраняем пользователя...";

  try {
    const response = await fetch(`${API_URL}/api/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        init_data: telegramApp.initData
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Telegram не подтвердил данные. Закройте и снова откройте приложение."
        );
      }

      throw new Error("Сервер не смог сохранить пользователя.");
    }

    const data = await response.json();

    userStatus.textContent =
             `Привет, ${data.user.name}! Вы сохранены в базе.`;
  } catch (error) {
    console.error("Ошибка сохранения пользователя:", error);

    userStatus.textContent =
      error instanceof TypeError
        ? "Не удалось связаться с сервером. Попробуйте позже."
        : error.message;
  }
}
