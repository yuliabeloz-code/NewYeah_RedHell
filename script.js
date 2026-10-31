/* =========================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
   ========================================= */

const welcomeScreen = document.getElementById("welcome-screen");
const homeScreen = document.getElementById("home-screen");
const knockButton = document.getElementById("knock-button");
const navigationButtons = document.querySelectorAll(".nav-button");

/* Заголовок «Добро пожаловать домой, чертята!» */
const homeTitle = document.querySelector(".home-header h1");

/* Разделы нижнего меню */
const views = [
  document.getElementById("living-room-view"),
  document.getElementById("calendar-view"),
  document.getElementById("personal-room-view")
];

/* =========================================
   ВХОД В ДОМ

   Скрываем начальный экран, показываем дом,
   меняем фон и прокручиваем страницу наверх.
   ========================================= */

knockButton.addEventListener("click", function () {
  welcomeScreen.hidden = true;
  homeScreen.hidden = false;

  document.body.classList.add("entered");
  window.scrollTo(0, 0);
});

/* =========================================
   ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ

   Заголовок показывается только в гостиной.
   ========================================= */

navigationButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const selectedView = button.dataset.view;

    /* Показываем выбранный раздел */
    views.forEach(function (view) {
      view.hidden = view.id !== selectedView;
    });

    /* Скрываем заголовок везде, кроме гостиной */
    homeTitle.hidden = selectedView !== "living-room-view";

    /* Обновляем отметку активной кнопки */
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

   Чтобы изменить время переключения,
   поменяйте числа 6 и 16.
   ========================================= */

function updateLivingRoom() {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 16;

  /* Здесь можно изменить названия изображений */
  document.getElementById("living-room").src = isDay
    ? "living-room.jpg"
    : "living-room-night.jpg";
}

/* Выбираем изображение при открытии страницы */
updateLivingRoom();

/* Проверяем время каждую минуту */
setInterval(updateLivingRoom, 60 * 1000);

/* Обновляем изображение при возвращении на вкладку */
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    updateLivingRoom();
  }
});
