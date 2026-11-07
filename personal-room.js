/* =========================================
   ЛИЧНАЯ КОМНАТА
   ========================================= */

function setupPersonalRoom() {
  const personalRoomView = document.getElementById("personal-room-view");

  if (!personalRoomView) {
    console.error(
      'Не найден элемент с id="personal-room-view".'
    );
    return;
  }

  /* Защита от повторного создания меню */
  if (personalRoomView.querySelector(".personal-room-menu")) {
    return;
  }

  const menu = document.createElement("div");
  menu.className = "personal-room-menu";

  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "personal-room-menu__buttons";

  const message = document.createElement("p");
  message.className = "personal-room-menu__message";
  message.setAttribute("role", "status");

  /*
    Здесь можно менять изображения и подписи кнопок.
    Пути указаны относительно HTML-страницы.
  */
  const menuItems = [
    {
      image: "games.png",
      label: "мини игры",
      placeholder: "Скоро здесь появятся мини-игры."
    },
    {
      image: "owl.png",
      label: "письмо в мастерскую эльфов",
      placeholder: "Скоро здесь можно будет написать эльфам."
    },
    {
      image: "space.png",
      label: "посмотреть на звездное небо",
      placeholder: "Скоро здесь можно будет посмотреть на звёздное небо."
    }
  ];

  menuItems.forEach(function (item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "personal-room-menu__button";

    const image = document.createElement("img");
    image.className = "personal-room-menu__image";
    image.src = item.image;

    /* Название кнопки уже есть в подписи под изображением */
    image.alt = "";

    const label = document.createElement("span");
    label.className = "personal-room-menu__label";
    label.textContent = item.label;

    button.appendChild(image);
    button.appendChild(label);

    button.addEventListener("click", function () {
      /*
        Пока кнопка показывает заглушку.
        Позже здесь можно добавить нужное действие.
      */
      message.textContent = item.placeholder;
    });

    buttonsContainer.appendChild(button);
  });

  menu.appendChild(buttonsContainer);
  menu.appendChild(message);
  personalRoomView.appendChild(menu);
}

/* Запускаем код после загрузки HTML */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupPersonalRoom);
} else {
  setupPersonalRoom();
}
