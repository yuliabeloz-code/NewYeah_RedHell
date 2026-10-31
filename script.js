/* =========================================
   ПОЛУЧАЕМ ЭЛЕМЕНТЫ СТРАНИЦЫ
   ========================================= */

const welcomeScreen = document.getElementById("welcome-screen");
const homeScreen = document.getElementById("home-screen");
const knockButton = document.getElementById("knock-button");
const navigationButtons = document.querySelectorAll(".nav-button");

/* Разделы, между которыми переключается нижнее меню */
const views = [
  document.getElementById("living-room-view"),
  document.getElementById("calendar-view"),
  document.getElementById("personal-room-view")
];

/* =========================================
   ВХОД В ДОМ

   После нажатия кнопки:
   1. Скрывается начальный экран.
   2. Открывается экран дома.
   3. Меняется фон.
   4. Страница прокручивается наверх.
   ========================================= */

knockButton.addEventListener("click", function () {
  welcomeScreen.hidden = true;
  homeScreen.hidden = false;

  document.body.classList.add("entered");
  window.scrollTo(0, 0);
});

/* =========================================
   ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ НИЖНЕГО МЕНЮ
   ========================================= */

navigationButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    /* Название раздела берётся из data-view кнопки */
    const selectedView = button.dataset.view;

    /* Показываем выбранный раздел и скрываем остальные */
    views.forEach(function (view) {
      view.hidden = view.id !== selectedView;
    });

    /* Убираем отметку активной страницы со всех кнопок */
    navigationButtons.forEach(function (navButton) {
      navButton.removeAttribute("aria-current");
    });

    /* Отмечаем выбранную кнопку */
    button.setAttribute("aria-current", "page");
  });
});

/* =========================================
   ДНЕВНОЕ И НОЧНОЕ ИЗОБРАЖЕНИЕ ГОСТИНОЙ

   Дневное изображение: с 06:00 до 15:59.
   Ночное изображение: с 16:00 до 05:59.

   Время определяется по часам устройства посетителя.
   Чтобы изменить время переключения, поменяйте
   числа 6 и 16 ниже.
   ========================================= */

function updateLivingRoom() {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 16;

  /* Здесь можно изменить названия файлов изображений */
  document.getElementById("living-room").src = isDay
    ? "living-room.jpg"
    : "living-room-night.jpg";
}

/* Устанавливаем нужное изображение при открытии страницы */
updateLivingRoom();

/* Проверяем время каждую минуту */
setInterval(updateLivingRoom, 60 * 1000);

/* Обновляем изображение при возвращении на вкладку */
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    updateLivingRoom();
  }
});
