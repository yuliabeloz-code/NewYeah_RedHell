/*
  ============================================================
  ДАТЫ ДОСТУПА К КНОПКАМ И ГОЛОВОЛОМКАМ
  ============================================================

  Все даты в этом блоке определяются по времени устройства.

  null — ограничение по дате отсутствует.

  ВАЖНО:
  даты открытия головоломок также проверяются в SQL-функции
  public.solve_star. При изменении расписания поменяйте его
  и там.
*/

const SANTA_STARS_CONFIG = {
  // Магазин доступен без отдельного ограничения.
  // Пример: "2026-12-01T00:00:00"
  shopAvailableFrom: null,

  // Письмо доступно с 1 декабря включительно.
  letterAvailableFrom: "2026-12-01T00:00:00",

  // С 6 декабря, 00:00 кнопка уже недоступна.
  letterAvailableUntil: "2026-12-06T00:00:00",

  // Кнопка "Посмотреть на звёзды".
  starsAvailableFrom: "2026-12-04T00:00:00",

  // Отдельная дата открытия каждой головоломки.
  starDates: [
    "2026-12-04T00:00:00", // Созвездие 1
    "2026-12-05T00:00:00", // Созвездие 2
    "2026-12-06T00:00:00", // Созвездие 3
    "2026-12-07T00:00:00", // Созвездие 4
    "2026-12-08T00:00:00", // Созвездие 5
    "2026-12-09T00:00:00", // Созвездие 6
    "2026-12-10T00:00:00", // Созвездие 7
    "2026-12-11T00:00:00", // Созвездие 8
    "2026-12-12T00:00:00", // Созвездие 9
    "2026-12-13T00:00:00"  // Созвездие 10
  ]
};


/*
  ============================================================
  ПРОВЕРКИ ДАТ
  ============================================================
*/

function isLetterPeriodOpen() {
  const start = new Date(
    SANTA_STARS_CONFIG.letterAvailableFrom
  ).getTime();

  const end = new Date(
    SANTA_STARS_CONFIG.letterAvailableUntil
  ).getTime();

  const now = Date.now();

  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    now >= start &&
    now < end
  );
}

function isStarAvailable(number) {
  const date = SANTA_STARS_CONFIG.starDates[number - 1];

  if (!date) return false;

  return extraAvailable(date);
}

function twoDigits(number) {
  return String(number).padStart(2, "0");
}


/*
  ============================================================
  ДОПОЛНЯЕМ ЛИЧНУЮ КОМНАТУ ИЗ ПРЕДЫДУЩЕЙ ЧАСТИ
  ============================================================

  Предыдущая функция создаёт кнопки и загружает баланс.
  Здесь добавляем действия для письма и звёзд.
*/

const previousBedroomRenderer = renderBedroom;

renderBedroom = async function () {
  /*
    Предыдущая версия использует эти настройки при создании
    кнопок. Устанавливаем даты до вызова старой функции.
  */
  EXTRA_CONFIG.letterAvailableFrom =
    SANTA_STARS_CONFIG.letterAvailableFrom;

  EXTRA_CONFIG.starsAvailableFrom =
    SANTA_STARS_CONFIG.starsAvailableFrom;

  /*
    Асинхронная функция выполняет код до первого await сразу.
    Поэтому кнопки уже созданы, пока загружается баланс.
  */
  const previousRenderPromise = previousBedroomRenderer();

  const letterButton = document.getElementById("open-letter");
  const starsButton = document.getElementById("open-stars");

  function updateAvailability() {
    if (letterButton) {
      letterButton.disabled = !isLetterPeriodOpen();
    }

    if (starsButton) {
      starsButton.disabled = !extraAvailable(
        SANTA_STARS_CONFIG.starsAvailableFrom
      );
    }
  }

  updateAvailability();

  if (letterButton) {
    letterButton.addEventListener("click", () => {
      if (!isLetterPeriodOpen()) {
        updateAvailability();
        return;
      }

      openElfLetter();
    });
  }

  if (starsButton) {
    starsButton.addEventListener("click", () => {
      if (!extraAvailable(SANTA_STARS_CONFIG.starsAvailableFrom)) {
        updateAvailability();
        return;
      }

      openStars();
    });
  }

  /*
    Обновляем активность кнопок, если приложение остаётся
    открытым во время наступления даты.
  */
  const availabilityTimer = setInterval(() => {
    if (
      !letterButton?.isConnected &&
      !starsButton?.isConnected
    ) {
      clearInterval(availabilityTimer);
      return;
    }

    updateAvailability();
  }, 1000);
    await previousRenderPromise;
};


/*
  ============================================================
  ПОДКЛЮЧАЕМ МАГАЗИН К МЕНЮ ИГР
  ============================================================
*/

const previousGamesMenu = openGamesMenu;

openGamesMenu = function () {
  previousGamesMenu();

  const shopButton = document.getElementById("santa-shop");

  if (!shopButton) return;

  shopButton.disabled = !extraAvailable(
    SANTA_STARS_CONFIG.shopAvailableFrom
  );

  shopButton.addEventListener("click", () => {
    if (!extraAvailable(SANTA_STARS_CONFIG.shopAvailableFrom)) {
      return;
    }

    openSantaShop();
  });
};


/*
  ============================================================
  МАГАЗИН САНТЫ
  ============================================================
*/

async function openSantaShop() {
  stopCurrentGame();
  openModal();

  modalBody.innerHTML = `
    <div class="santa-shop">
      <h2>Магазин Санты</h2>
      <p class="message">Загрузка магазина…</p>
    </div>
  `;

  const loadingContainer = modalBody.querySelector(".santa-shop");

  try {
    const result = await api("get_santa_shop", {
      localDate: localDateString()
    });

    if (!loadingContainer.isConnected) return;

    renderSantaShop(result.shop);
  } catch (error) {
    if (!loadingContainer.isConnected) return;

    loadingContainer.innerHTML = `
      <h2>Магазин Санты</h2>
      <p class="message">${escapeHtml(error.message)}</p>

      <button
        id="shop-back-after-error"
        class="gold-button"
        type="button"
      >
        К играм
      </button>
    `;

    document.getElementById("shop-back-after-error")
      .addEventListener("click", openGamesMenu);
  }
}

function renderSantaShop(shop) {
  if (state.profile) {
    state.profile.candy_balance = Number(shop.balance);
    state.profile.candy_earned_today = Number(shop.earned_today);
  }

  const owned = Boolean(shop.card_owned);
  const balance = Number(shop.balance);
  const price = Number(shop.card_price || 2027);

  modalBody.innerHTML = `
    <div class="santa-shop">
      <h2>Магазин Санты</h2>

      <div class="santa-shop-stats">
        <div class="candy-line">
          ${candyIcon()}
          <span>Баланс: ${balance}</span>
        </div>

        <p>
          Заработано сегодня:
          ${Number(shop.earned_today)} / 200
        </p>
      </div>

      <h2>Уникальная карта</h2>

      ${
        owned
          ? `
            <p>Карта куплена.</p>

            <button
              id="show-ticket"
              class="gold-button"
              type="button"
            >
              Показать билет
            </button>
          `
          : `
            <p>Стоимость: ${price} конфет.</p>

            <button
              id="buy-card"
              class="gold-button"
              type="button"
              ${balance < price ? "disabled" : ""}
            >
              Купить карту
            </button>

            ${
              balance < price
                ? `<p class="message">
                     Не хватает ${price - balance} конфет.
                   </p>`
                : ""
            }
          `
      }

      <div id="shop-message" class="message"></div>

      <div class="modal-actions">
        <button
          id="shop-back"
          class="gold-button"
          type="button"
        >
          К играм
        </button>
      </div>
    </div>
  `;

  document.getElementById("shop-back")
    .addEventListener("click", openGamesMenu);

  const ticketButton = document.getElementById("show-ticket");

  if (ticketButton) {
    ticketButton.addEventListener("click", showSantaTicket);
  }

  const buyButton = document.getElementById("buy-card");

  if (buyButton) {
    buyButton.addEventListener("click", async () => {
      buyButton.disabled = true;

      const message = document.getElementById("shop-message");
      message.textContent = "Покупаем карту…";

      try {
        const result = await api("buy_santa_card", {
          localDate: localDateString()
        });
                if (!message.isConnected) return;

        if (result.purchase.insufficient_funds) {
          message.textContent =
            "На балансе недостаточно конфет.";

          buyButton.disabled = false;
          return;
        }

        /*
          Покупка идемпотентна: повторный запрос не спишет
          конфеты второй раз.
        */
        await openSantaShop();
      } catch (error) {
        if (!message.isConnected) return;

        message.textContent =
          "Не удалось подтвердить покупку. " +
          "Откройте магазин снова и проверьте билет.";

        buyButton.disabled = false;
      }
    });
  }
}

function showSantaTicket() {
  modalBody.innerHTML = `
    <div class="santa-shop">
      <h2>Ваш билет</h2>

      <img
        class="ticket-image"
        src="biletik.png"
        alt="Билет на уникальную карту"
      >

      <p>
        Покажите этот билет администратору в личных сообщениях.
      </p>

      <button
        id="ticket-back"
        class="gold-button"
        type="button"
      >
        В магазин
      </button>
    </div>
  `;

  document.getElementById("ticket-back")
    .addEventListener("click", openSantaShop);
}


/*
  ============================================================
  ПИСЬМО В МАСТЕРСКУЮ ЭЛЬФОВ
  ============================================================
*/

async function openElfLetter() {
  if (!isLetterPeriodOpen()) return;

  openModal();

  modalBody.innerHTML = `
    <div class="elf-letter">
      <h2>Письмо в мастерскую эльфов</h2>
      <p class="message">Загрузка…</p>
    </div>
  `;

  const loadingContainer = modalBody.querySelector(".elf-letter");

  try {
    const result = await api("get_elf_letter_state", {
      localDate: localDateString()
    });

    if (!loadingContainer.isConnected) return;

    renderElfLetter(result.letterState);
  } catch (error) {
    if (!loadingContainer.isConnected) return;

    loadingContainer.innerHTML = `
      <h2>Письмо в мастерскую эльфов</h2>
      <p class="message">${escapeHtml(error.message)}</p>
    `;
  }
}

function renderElfLetter(letterState) {
  if (!isLetterPeriodOpen()) {
    modalBody.innerHTML = `
      <div class="elf-letter">
        <h2>Письмо в мастерскую эльфов</h2>
        <p>Период отправки завершён.</p>
      </div>
    `;

    return;
  }

  const usedCount = Number(letterState.used_count);
  const maximum = Number(letterState.maximum);
  const usedToday = Boolean(letterState.used_today);
  const waitingCount = Number(letterState.waiting_count);

  if (usedToday || usedCount >= maximum) {
    modalBody.innerHTML = `
      <div class="elf-letter">
        <h2>Письмо в мастерскую эльфов</h2>

        <p>Использовано подарков: ${usedCount} / ${maximum}</p>

        <p>
          ${
            usedToday
              ? "На текущую дату устройства подарок уже отправлен или обрабатывается."
              : "Достигнут общий лимит подарков."
          }
        </p>

        ${
          waitingCount > 0
            ? `
              <p>
                Есть письмо, статус которого требует проверки.
                При необходимости обратитесь к администратору.
              </p>
            `
            : ""
        }
      </div>
    `;

    return;
  }

  let giftNumber = 1;

  modalBody.innerHTML = `
    <div class="elf-letter">
      <h2>Письмо в мастерскую эльфов</h2>

      <p>Использовано подарков: ${usedCount} / ${maximum}</p>

      <div class="gift-selector">
        <button
          id="gift-previous"
          class="gift-arrow"
          type="button"
          aria-label="Предыдущий подарок"
        >
          ‹
        </button>

        <img
          id="gift-image"
          src="owl1.png"
          alt="Подарок 1"
        >

        <button
          id="gift-next"
          class="gift-arrow"
          type="button"
          aria-label="Следующий подарок"
        >
          ›
        </button>
      </div>

      <p id="gift-number">Подарок 1 из 4</p>

      <form id="elf-form" class="elf-form">
        <label>
                  Описание уникального дизайна подарка
          <textarea
            id="gift-design"
            maxlength="300"
            required
          ></textarea>
        </label>

        <label>
          Имя отправителя
          <input
            id="sender-name"
            type="text"
            maxlength="60"
            required
          >
        </label>

        <label>
          Имя получателя
          <input
            id="recipient-name"
            type="text"
            maxlength="60"
            required
          >
        </label>

        <label>
          Поздравление из четырёх предложений
          <textarea
            id="greeting"
            maxlength="400"
            required
          ></textarea>
        </label>

        <button
          id="send-letter"
          class="gold-button"
          type="submit"
        >
          Отправить
        </button>
      </form>

      <p id="letter-message" class="message"></p>
    </div>
  `;

  const image = document.getElementById("gift-image");
  const numberLabel = document.getElementById("gift-number");

  function updateGift() {
    image.src = `owl${giftNumber}.png`;
    image.alt = `Подарок ${giftNumber}`;

    numberLabel.textContent =
      `Подарок ${giftNumber} из 4`;
  }

  document.getElementById("gift-previous")
    .addEventListener("click", () => {
      giftNumber = giftNumber === 1 ? 4 : giftNumber - 1;
      updateGift();
    });

  document.getElementById("gift-next")
    .addEventListener("click", () => {
      giftNumber = giftNumber === 4 ? 1 : giftNumber + 1;
      updateGift();
    });

  const form = document.getElementById("elf-form");
  const sendButton = document.getElementById("send-letter");
  const message = document.getElementById("letter-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isLetterPeriodOpen()) {
      message.textContent = "Период отправки завершён.";
      sendButton.disabled = true;
      return;
    }

    const giftDesign = document
      .getElementById("gift-design")
      .value.trim();

    const senderName = document
      .getElementById("sender-name")
      .value.trim();

    const recipientName = document
      .getElementById("recipient-name")
      .value.trim();

    const greeting = document
      .getElementById("greeting")
      .value.trim();

    if (
      !giftDesign ||
      !senderName ||
      !recipientName ||
      !greeting
    ) {
      message.textContent = "Заполните все поля.";
      return;
    }

    // Простая проверка четырёх предложений.
    const fourSentences =
      /^(?:\s*[^.!?…]+[.!?…]+){4}\s*$/u;

    if (!fourSentences.test(greeting)) {
      message.textContent =
        "Напишите четыре предложения и завершите каждое знаком препинания.";

      return;
    }

    sendButton.disabled = true;
    message.textContent = "Отправляем письмо…";

    try {
      const result = await api("send_elf_letter", {
        localDate: localDateString(),
        giftNumber,
        giftDesign,
        senderName,
        recipientName,
        greeting
      });

      if (!message.isConnected) return;

      modalBody.innerHTML = `
        <div class="elf-letter">
          <h2>Письмо отправлено</h2>

          <p>Ваш подарок отправлен в мастерскую эльфов.</p>

          <p>
            Номер письма:
            ${escapeHtml(result.letterId)}
          </p>
        </div>
      `;
    } catch (error) {
      if (!message.isConnected) return;

      /*
        Не отправляем автоматически повторно: при обрыве
        соединения письмо могло дойти до администратора.
      */
      message.textContent =
        error.message +
        " Проверьте состояние письма, открыв раздел заново.";

      sendButton.disabled = true;
    }
  });
}


/*
  ============================================================
  ЗВЁЗДЫ: ОСНОВНАЯ КАРТИНА
  ============================================================
*/

async function openStars() {
  if (!extraAvailable(SANTA_STARS_CONFIG.starsAvailableFrom)) {
        return;
  }

  openModal();

  modalBody.innerHTML = `
    <div class="stars-screen">
      <h2>Посмотреть на звёзды</h2>
      <p class="message">Загрузка…</p>
    </div>
  `;

  const loadingContainer = modalBody.querySelector(".stars-screen");

  try {
    const result = await api("get_star_progress");

    if (!loadingContainer.isConnected) return;

    renderStarsMosaic(result.progress.opened || []);
  } catch (error) {
    if (!loadingContainer.isConnected) return;

    loadingContainer.innerHTML = `
      <h2>Посмотреть на звёзды</h2>
      <p class="message">${escapeHtml(error.message)}</p>
    `;
  }
}

function renderStarsMosaic(openedNumbers) {
  const opened = new Set(openedNumbers.map(Number));

  modalBody.innerHTML = `
    <div class="stars-screen">
      <h2>Посмотреть на звёзды</h2>

      <div class="stars-mosaic">
        ${Array.from({ length: 10 }, (_, index) => {
          const number = index + 1;

          const image = opened.has(number)
            ? `final${twoDigits(number)}.png`
            : "card08.png";

          return `
            <img
              src="${image}"
              alt="${
                opened.has(number)
                  ? `Открытая карта ${number}`
                  : `Закрытая карта ${number}`
              }"
            >
          `;
        }).join("")}
      </div>

      <p>Открыто карт: ${opened.size} / 10</p>

      <button
        id="open-constellations"
        class="gold-button"
        type="button"
      >
        Созвездия
      </button>
    </div>
  `;

  document.getElementById("open-constellations")
    .addEventListener("click", () => {
      renderStarList([...opened]);
    });
}


/*
  ============================================================
  ЗВЁЗДЫ: СПИСОК ГОЛОВОЛОМОК
  ============================================================
*/

function renderStarList(openedNumbers) {
  const opened = new Set(openedNumbers.map(Number));

  modalBody.innerHTML = `
    <div class="stars-screen">
      <h2>Созвездия</h2>

      <div class="star-list">
        ${Array.from({ length: 10 }, (_, index) => {
          const number = index + 1;
          const available = isStarAvailable(number);
          const solved = opened.has(number);

          return `
            <button
              class="gold-button"
              type="button"
              data-star="${number}"
              ${available ? "" : "disabled"}
            >
              Созвездие ${number}
              ${solved ? " ✓" : ""}
            </button>
          `;
        }).join("")}
      </div>

      <button
        id="back-to-mosaic"
        class="gold-button"
        type="button"
      >
        К картине
      </button>
    </div>
  `;

  modalBody.querySelectorAll("[data-star]").forEach((button) => {
    button.addEventListener("click", () => {
      const number = Number(button.dataset.star);

      if (!isStarAvailable(number)) return;

      renderStarPuzzle(number, [...opened]);
    });
  });

  document.getElementById("back-to-mosaic")
    .addEventListener("click", () => {
      renderStarsMosaic([...opened]);
    });
}


/*
  ============================================================
  ЗВЁЗДЫ: ГОЛОВОЛОМКА
  ============================================================
*/

function renderStarPuzzle(number, openedNumbers) {
  if (!isStarAvailable(number)) return;

  const opened = new Set(openedNumbers.map(Number));
  const alreadySolved = opened.has(number);

  modalBody.innerHTML = `
    <div class="stars-screen">
      <h2>Созвездие ${number}</h2>

      <img
        class="star-puzzle-image"
        src="star${twoDigits(number)}.png"
        alt="Изображение созвездия ${number}"
      >

      ${
        alreadySolved
          ? `<p>Это созвездие уже разгадано.</p>`
          : `
            <form id="star-form">
              <label>
                Введите название созвездия
                <input
                  id="star-answer"
                  class="star-answer"
                  type="text"
                                    maxlength="100"
                  required
                >
              </label>

              <div class="modal-actions">
                <button
                  id="check-star"
                  class="gold-button"
                  type="submit"
                >
                  Проверить
                </button>
              </div>
            </form>

            <p id="star-message" class="message"></p>
          `
      }

      <button
        id="back-to-star-list"
        class="gold-button"
        type="button"
      >
        К созвездиям
      </button>
    </div>
  `;

  document.getElementById("back-to-star-list")
    .addEventListener("click", () => {
      renderStarList([...opened]);
    });

  if (alreadySolved) return;

  const form = document.getElementById("star-form");
  const answerInput = document.getElementById("star-answer");
  const checkButton = document.getElementById("check-star");
  const message = document.getElementById("star-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isStarAvailable(number)) {
      message.textContent = "Головоломка ещё недоступна.";
      return;
    }

    const answer = answerInput.value.trim();

    if (!answer) {
      message.textContent = "Введите название созвездия.";
      return;
    }

    checkButton.disabled = true;
    message.textContent = "Проверяем ответ…";

    try {
      const response = await api("solve_star", {
        localDate: localDateString(),
        starNumber: number,
        answer
      });

      if (!message.isConnected) return;

      if (!response.result.correct) {
        message.textContent = "Неверный ответ. Попробуйте ещё раз.";
        checkButton.disabled = false;
        return;
      }

      opened.add(number);

      modalBody.innerHTML = `
        <div class="stars-screen">
          <h2>Верно!</h2>

          <p>Открыта карта ${number}.</p>

          <img
            class="star-puzzle-image"
            src="final${twoDigits(number)}.png"
            alt="Открытая карта ${number}"
          >

          <button
            id="star-result-mosaic"
            class="gold-button"
            type="button"
          >
            К картине
          </button>

          <button
            id="star-result-list"
            class="gold-button"
            type="button"
          >
            К созвездиям
          </button>
        </div>
      `;

      document.getElementById("star-result-mosaic")
        .addEventListener("click", () => {
          renderStarsMosaic([...opened]);
        });

      document.getElementById("star-result-list")
        .addEventListener("click", () => {
          renderStarList([...opened]);
        });
    } catch (error) {
      if (!message.isConnected) return;

      message.textContent = error.message;
      checkButton.disabled = false;
    }
  });
}
