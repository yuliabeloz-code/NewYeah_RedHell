/* =========================================
   КНОПКИ ЛИЧНОЙ КОМНАТЫ
   ========================================= */

const personalRoomView = document.getElementById("personal-room-view");

if (personalRoomView) {
  /* Слой с кнопками поверх фона страницы */
  const personalRoomButtons = document.createElement("div");
  personalRoomButtons.className = "personal-room-buttons";

  /*
    Данные кнопок.

    image — путь к изображению;
    label — подпись под изображением;
    className — класс для настройки положения кнопки в CSS.
  */
  const personalRoomItems = [
    {
      image: "games.png",
      label: "Мини игры",
      className: "personal-room-button--games"
    },
    {
      image: "owl.png",
      label: "Письмо в мастерскую эльфов",
      className: "personal-room-button--owl"
    },
    {
      image: "space.png",
      label: "Посмотреть на звёздное небо",
      className: "personal-room-button--space"
    }
  ];

  personalRoomItems.forEach(function (item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "personal-room-button " + item.className;

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";

    const label = document.createElement("span");
    label.textContent = item.label;

    button.appendChild(image);
    button.appendChild(label);
    personalRoomButtons.appendChild(button);

    /*
      Здесь позже можно добавить действие кнопки:

      button.addEventListener("click", function () {
        // Что должно происходить при нажатии
      });
    */
  });

  personalRoomView.appendChild(personalRoomButtons);
}
