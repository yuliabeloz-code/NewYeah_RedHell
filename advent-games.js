/*
  ============================================================
  НАСТРОЙКИ ДАТ
  ============================================================

  Время берётся с устройства участника.

  Формат даты:
  "2026-12-03T00:00:00"

  null означает, что кнопка доступна без ограничения по дате.

  Для адвента можно указать отдельную дату для каждой ячейки.
*/

const EXTRA_CONFIG = {
  adventCellDates: [
    "2026-11-22T00:00:00", // Ячейка 1
    "2026-11-23T00:00:00", // Ячейка 2
    "2026-11-24T00:00:00", // Ячейка 3
    "2026-11-25T00:00:00", // Ячейка 4
    "2026-11-26T00:00:00", // Ячейка 5
    "2026-11-27T00:00:00", // Ячейка 6
    "2026-11-28T00:00:00", // Ячейка 7
    "2026-11-29T00:00:00", // Ячейка 8
    "2026-11-30T00:00:00", // Ячейка 9
    "2026-12-01T00:00:00", // Ячейка 10
    "2026-12-02T00:00:00", // Ячейка 11
    "2026-12-03T00:00:00", // Ячейка 12
    "2026-12-04T00:00:00", // Ячейка 13
    "2026-12-05T00:00:00"  // Ячейка 14
  ],

  // Пример даты: "2026-12-03T00:00:00"
  gamesAvailableFrom: null,

  // Пока механика этих разделов не описана.
  // Даты можно указать заранее для будущего продолжения.
  letterAvailableFrom: null,
  starsAvailableFrom: null,

  // Общие настройки игр.
  gameDurationSeconds: 60
};


/*
  ============================================================
  ОБЩИЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  ============================================================
*/

let gameCleanup = null;

function extraAvailable(dateString) {
  if (dateString === null) return true;

  const date = new Date(dateString);

  return Number.isFinite(date.getTime()) &&
    Date.now() >= date.getTime();
}

function localDateString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function candyIcon() {
  return '<img class="candy-icon" src="candy.png" alt="">';
}

function shuffleArray(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function stopCurrentGame() {
  if (typeof gameCleanup === "function") {
    gameCleanup();
  }

  gameCleanup = null;
}
function clearBedroomBackground() {
  document.body.style.backgroundImage = "";
}

/*
  При закрытии модального окна останавливаем таймеры игры.
  Предыдущая функция closeModal остаётся частью старого приложения.
*/
const previousCloseModal = closeModal;

closeModal = function () {
  stopCurrentGame();
  previousCloseModal();
};

async function loadCandyState() {
  const result = await api("get_candy_state", {
    localDate: localDateString()
  });

  if (state.profile && result.candy) {
    state.profile.candy_balance = result.candy.balance;
    state.profile.candy_earned_today = result.candy.earned_today;
    state.profile.candy_daily_date = result.candy.local_date;
  }

  return result.candy;
}

function candySummaryHtml(candy) {
  if (!candy) return "";

  return `
    <div class="candy-line">
      ${candyIcon()}
      <span>Баланс: ${Number(candy.balance)}</span>
    </div>

    <p class="message">
      За сегодня: ${Number(candy.earned_today)} / 200
    </p>
  `;
}

/*
  Результат одной завершённой игры отправляется с уникальным ID.
  Повторная отправка того же ID не начисляет награду дважды.
*/
async function sendGameReward(gameId, gameType, requestedAmount) {
  const result = await api("award_game", {
    gameId,
    gameType,
    requestedAmount,
    localDate: localDateString()
  });

  const reward = result.reward;

  if (state.profile && reward) {
    state.profile.candy_balance = reward.balance;
    state.profile.candy_earned_today = reward.earned_today;
  }

  return reward;
}

/*
  Показываем результат и возможность повторить игру.

  Если соединение пропало, кнопка "Повторить отправку" использует
  тот же gameId. Это позволяет безопасно повторить запрос.
*/
function showGameResult({
  gameId,
  gameType,
  requestedAmount,
  resultText,
  replay
}) {
  stopCurrentGame();
    modalBody.innerHTML = `
    <div class="game-screen">
      <div class="game-result">
        <h2>Игра завершена</h2>

        <p>${escapeHtml(resultText)}</p>

        <p>
          Награда по результату:
          ${Number(requestedAmount)}
          ${candyIcon()}
        </p>

        <div id="reward-status">
          Начисляем конфеты…
        </div>

        <div class="modal-actions">
          <button
            id="retry-reward"
            class="gold-button hidden"
            type="button"
          >
            Повторить отправку
          </button>

          <button
            id="replay-game"
            class="gold-button"
            type="button"
            disabled
          >
            Играть ещё
          </button>

          <button
            id="back-to-games"
            class="gold-button"
            type="button"
            disabled
          >
            К играм
          </button>
        </div>
      </div>
    </div>
  `;

  const resultContainer = modalBody.querySelector(".game-result");
  const status = document.getElementById("reward-status");
  const retryButton = document.getElementById("retry-reward");
  const replayButton = document.getElementById("replay-game");
  const backButton = document.getElementById("back-to-games");

  replayButton.addEventListener("click", replay);
  backButton.addEventListener("click", openGamesMenu);

  let sending = false;

  async function submitReward() {
    if (sending) return;

    sending = true;
    retryButton.classList.add("hidden");
    status.textContent = "Начисляем конфеты…";

    try {
      const reward = await sendGameReward(
        gameId,
        gameType,
        requestedAmount
      );

      if (!resultContainer.isConnected) return;

      status.innerHTML = `
        <p>
          Начислено с учётом лимита:
          <strong>${Number(reward.credited)}</strong>
          ${candyIcon()}
        </p>

        <p>Баланс: ${Number(reward.balance)}</p>

        <p>
          За сегодня:
          ${Number(reward.earned_today)} / 200
        </p>
      `;

      replayButton.disabled = false;
      backButton.disabled = false;
    } catch (error) {
      if (!resultContainer.isConnected) return;

      status.textContent =
        "Не удалось подтвердить награду: " + error.message;

      retryButton.classList.remove("hidden");
    } finally {
      sending = false;
    }
  }

  retryButton.addEventListener("click", submitReward);
  submitReward();
}


/*
  ============================================================
  АДВЕНТ-КАЛЕНДАРЬ

  Заменяем прежний renderAdvent из app.js.
  ============================================================
*/

renderAdvent = async function () {
  clearBedroomBackground();
  app.innerHTML = `
    <h1>Адвент-календарь</h1>
    <p class="message">Загрузка календаря…</p>
  `;

  const page = app;

  try {
    const result = await api("get_advent");

    // Если участник уже ушёл на другую страницу,
    // не перерисовываем её.
    if (currentPage !== "advent" || page !== app) return;

    const cells = result.cells || [];

    app.innerHTML = `
      <h1>Адвент-календарь</h1>

      <div class="advent-grid">
        ${cells.map((cell) => {
          const index = Number(cell.cell_number) - 1;
          const date = EXTRA_CONFIG.adventCellDates[index];

          const unlocked =
            typeof date === "string" &&
            extraAvailable(date);

          return `
            <button
              class="advent-cell"
              type="button"
              data-cell="${Number(cell.cell_number)}"
              ${unlocked ? "" : "disabled"}
              aria-label="Ячейка ${Number(cell.cell_number)}"
            >
              ${Number(cell.cell_number)}
            </button>
          `;
        }).join("")}
      </div>
    `;

    app.querySelectorAll("[data-cell]").forEach((button) => {
      button.addEventListener("click", () => {
        const number = Number(button.dataset.cell);
        const index = number - 1;

        // Повторная проверка времени устройства при нажатии.
                                      if (!extraAvailable(EXTRA_CONFIG.adventCellDates[index])) {
          return;
        }

        const cell = cells.find(
          (item) => Number(item.cell_number) === number
        );

        if (!cell) return;

        const task = cell.task || {};

        openModal()

        modalBody.innerHTML = `
          <h2>Ячейка ${number}</h2>

          <div class="task"
          <h2>${escapeHtml(task.title || "")}</h2>
            <p>${escapeHtml(task.description || "")}</p>

          </div>
        `;
      });
    });
  } catch (error) {
    if (currentPage !== "advent") return;

    app.innerHTML = `
      <h1>Адвент-календарь</h1>
      <p class="message">${escapeHtml(error.message)}</p>
    `;
  }
};


renderBedroom = async function () {
  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour < 16;

  document.body.style.backgroundImage = isDay
    ? 'url("room.jpg")'
    : 'url("roomnight.jpg")';

  app.innerHTML = `
    <h1>Личная комната</h1>

    <div id="bedroom-candy">
      <p class="message">Загрузка баланса…</p>
    </div>

    <div class="room-actions">
      <button
        id="open-games"
        class="room-action"
        type="button"
        ${extraAvailable(EXTRA_CONFIG.gamesAvailableFrom)
          ? ""
          : "disabled"}
      >
        <img src="games.png" alt="">
        <span>Игры</span>
      </button>

      <button
        id="open-letter"
        class="room-action"
        type="button"
        ${extraAvailable(EXTRA_CONFIG.letterAvailableFrom)
          ? ""
          : "disabled"}
      >
        <img src="owl.png" alt="">
        <span>Письмо</span>
      </button>

      <button
        id="open-stars"
        class="room-action"
        type="button"
        ${extraAvailable(EXTRA_CONFIG.starsAvailableFrom)
          ? ""
          : "disabled"}
      >
        <img src="space.png" alt="">
        <span>Звёзды</span>
      </button>
    </div>
  `;

  const candyContainer = document.getElementById("bedroom-candy");

  document.getElementById("open-games")
    .addEventListener("click", () => {
      if (!extraAvailable(EXTRA_CONFIG.gamesAvailableFrom)) return;
      openGamesMenu();
    });

  /*
    Кнопки письма и звёзд отображаются, но обработчики не
    назначаются до получения описания их механики.
  */

  try {
    const candy = await loadCandyState();

    if (!candyContainer.isConnected) return;

    candyContainer.innerHTML = candySummaryHtml(candy);
  } catch (error) {
    if (!candyContainer.isConnected) return;

    candyContainer.innerHTML = `
      <p class="message">${escapeHtml(error.message)}</p>
    `;
  }
};


/*
  ============================================================
  МЕНЮ ИГР
  ============================================================
*/

function openGamesMenu() {
  stopCurrentGame();

  if (!extraAvailable(EXTRA_CONFIG.gamesAvailableFrom)) return;

  openModal();

  modalBody.innerHTML = `
    <div class="games-menu">
      <h2>Игры</h2>

      <div id="games-candy"></div>

      <div class="games-columns">
        <div class="games-list">
          <button
            id="game-catch"
            class="gold-button"
            type="button"
          >
            Поймать подарок
          </button>

          <button
            id="game-sequence"
            class="gold-button"
            type="button"
          >
            Угадай последовательность
          </button>

          <button
            id="game-pairs"
            class="gold-button"
            type="button"
          >
            Найди пару
          </button>

          <button
            id="game-pendulum"
            class="gold-button"
            type="button"
          >
            Маятник
          </button>
        </div>

        <div class="shop-panel">
          <button
            class="gold-button"
            type="button"
            id="santa-shop"
          >
            Магазин Санты
                      </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("game-catch")
    .addEventListener("click", startCatchGame);

  document.getElementById("game-sequence")
    .addEventListener("click", startSequenceGame);

  document.getElementById("game-pairs")
    .addEventListener("click", startPairsGame);

  document.getElementById("game-pendulum")
    .addEventListener("click", startPendulumGame);

  /*
    Кнопке магазина пока не назначено действие:
    товары и правила магазина ещё не описаны.
  */

  const candyContainer = document.getElementById("games-candy");

  loadCandyState()
    .then((candy) => {
      if (candyContainer.isConnected) {
        candyContainer.innerHTML = candySummaryHtml(candy);
      }
    })
    .catch((error) => {
      if (candyContainer.isConnected) {
        candyContainer.innerHTML = `
          <p class="message">${escapeHtml(error.message)}</p>
        `;
      }
    });
}


/*
  ============================================================
  ИГРА 1. ПОЙМАТЬ ПОДАРОК
  ============================================================
*/

function catchReward(count) {
  if (count <= 5) return 10;
  if (count <= 10) return 15;
  if (count <= 16) return 20;
  if (count <= 22) return 25;
  return 30;
}

function startCatchGame() {
  stopCurrentGame();

  const gameId = crypto.randomUUID();
  const duration = 40;

  modalBody.innerHTML = `
    <div class="game-screen">
      <div class="game-top">
        <span>Поймано: <span id="catch-count">0</span> / 30</span>
        <span>⏱ <span id="catch-time">${duration}</span></span>
      </div>

      <p class="game-instructions">
        Перемещайте мешок пальцем или мышью.
      </p>

      <div id="catch-field" class="catch-field">
        <img
          id="catch-basket"
          class="catch-basket"
          src="box07.png"
          alt="Мешок"
        >
      </div>
    </div>
  `;

  const field = document.getElementById("catch-field");
  const basket = document.getElementById("catch-basket");
  const countElement = document.getElementById("catch-count");
  const timeElement = document.getElementById("catch-time");

  let basketX = 0.5;
  let caught = 0;
  let gifts = [];
  let lastSpawn = 0;
  let previousTime = performance.now();
  let startTime = previousTime;
  let frameId = 0;
  let active = true;

  basket.style.left = "50%";

  function moveBasket(event) {
    const rect = field.getBoundingClientRect();

    basketX = Math.max(
      0.08,
      Math.min(0.92, (event.clientX - rect.left) / rect.width)
    );

    basket.style.left = `${basketX * 100}%`;
  }

  field.addEventListener("pointerdown", (event) => {
    field.setPointerCapture(event.pointerId);
    moveBasket(event);
  });

  field.addEventListener("pointermove", (event) => {
    if (
      event.pointerType === "mouse" ||
      field.hasPointerCapture(event.pointerId)
    ) {
      moveBasket(event);
    }
  });

  function spawnGift() {
    const element = document.createElement("img");
    const number = 1 + Math.floor(Math.random() * 6);

    element.className = "catch-gift";
    element.src = `box0${number}.png`;
    element.alt = "";

    const gift = {
      element,
      x: 0.08 + Math.random() * 0.84,
      y: -0.12,
      speed: 0.22 + Math.random() * 0.15
    };

    element.style.left = `${gift.x * 100}%`;
    element.style.top = `${gift.y * 100}%`;

    field.appendChild(element);
    gifts.push(gift);
  }

  function finish() {
    if (!active) return;

    active = false;

    showGameResult({
      gameId,
      gameType: "catch",
      requestedAmount: catchReward(caught),
      resultText: `Поймано подарков: ${caught}.`,
      replay: startCatchGame
    });
  }

  function tick(now) {
    if (!active) return;

    const elapsed = (now - startTime) / 1000;
    const remaining = Math.max(0, Math.ceil(duration - elapsed));

    timeElement.textContent = String(remaining);

    if (elapsed >= duration) {
      finish();
      return;
    }
        const delta = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;

    // Пока не поймано 30 подарков, создаём новые.
    if (caught < 30 && now - lastSpawn >= 650) {
      spawnGift();
      lastSpawn = now;
    }

    const fieldHeight = field.clientHeight;

    gifts = gifts.filter((gift) => {
      gift.y += gift.speed * delta;
      gift.element.style.top = `${gift.y * 100}%`;

      const giftHeightRatio =
        gift.element.offsetHeight / Math.max(1, fieldHeight);

      const nearBasket =
        gift.y + giftHeightRatio >= 0.82 &&
        gift.y <= 0.98;

      const horizontallyAligned =
        Math.abs(gift.x - basketX) < 0.14;

      if (nearBasket && horizontallyAligned && caught < 30) {
        caught++;
        countElement.textContent = String(caught);
        gift.element.remove();
        return false;
      }

      if (gift.y > 1.05) {
        gift.element.remove();
        return false;
      }

      return true;
    });
if (caught >= 30) {
  finish();
  return;
}

frameId = requestAnimationFrame(tick);;
  }

  gameCleanup = () => {
    active = false;
    cancelAnimationFrame(frameId);
  };

  frameId = requestAnimationFrame(tick);
}


/*
  ============================================================
  ИГРА 2. УГАДАЙ ПОСЛЕДОВАТЕЛЬНОСТЬ
  ============================================================
*/

function startSequenceGame() {
  stopCurrentGame();

  const gameId = crypto.randomUUID();

  // Четыре разных цвета из шести.
  const secret = shuffleArray([1, 2, 3, 4, 5, 6]).slice(0, 4);

  let selected = [];
  let history = [];
  let finished = false;

  function slotHtml(number, status = "") {
    if (!number) {
      return '<div class="sequence-slot"></div>';
    }

    return `
      <div class="sequence-slot ${status}">
        <img src="light0${number}.png" alt="Фонарик ${number}">
      </div>
    `;
  }

  function render() {
    if (finished) return;

    modalBody.innerHTML = `
      <div class="game-screen">
        <h2>Угадай последовательность</h2>

        <p class="game-instructions">
          Выберите четыре разных фонарика.
        </p>

        <div class="sequence-row">
          ${[0, 1, 2, 3].map((index) =>
            slotHtml(selected[index])
          ).join("")}
        </div>

        <div class="light-options">
          ${[1, 2, 3, 4, 5, 6].map((number) => `
            <button
              class="light-option"
              type="button"
              data-light="${number}"
              ${selected.includes(number) ? "disabled" : ""}
            >
              <img src="light0${number}.png" alt="Фонарик ${number}">
            </button>
          `).join("")}
        </div>

        <div class="modal-actions">
          <button
            id="sequence-clear"
            class="gold-button"
            type="button"
          >
            Очистить
          </button>

          <button
            id="sequence-check"
            class="gold-button"
            type="button"
            ${selected.length === 4 ? "" : "disabled"}
          >
            Проверить
          </button>
        </div>

        <div class="sequence-history">
          ${history.map((attempt) => `
            <div class="sequence-row">
              ${attempt.map((item) =>
                slotHtml(item.number, item.status)
              ).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    `;

    modalBody.querySelectorAll("[data-light]").forEach((button) => {
      button.addEventListener("click", () => {
        if (selected.length >= 4) return;

        const number = Number(button.dataset.light);

        if (!selected.includes(number)) {
          selected.push(number);
        }

        render();
      });
    });

    document.getElementById("sequence-clear")
      .addEventListener("click", () => {
        selected = [];
        render();
      });

    document.getElementById("sequence-check")
      .addEventListener("click", checkAttempt);
  }

  function checkAttempt() {
    if (selected.length !== 4 || finished) return;
        const attempt = selected.map((number, index) => {
      let status = "absent";

      if (secret[index] === number) {
        status = "correct";
      } else if (secret.includes(number)) {
        status = "present";
      }

      return { number, status };
    });

    const solved = attempt.every(
      (item) => item.status === "correct"
    );

    if (solved) {
      finished = true;

      showGameResult({
        gameId,
        gameType: "sequence",
        requestedAmount: 40,
        resultText: "Последовательность угадана.",
        replay: startSequenceGame
      });

      return;
    }

    // Новая попытка появляется сверху.
    history.unshift(attempt);
    selected = [];
    render();
  }

  gameCleanup = () => {
    finished = true;
  };

  render();
}


/*
  ============================================================
  ИГРА 3. НАЙДИ ПАРУ
  ============================================================
*/

function startPairsGame() {
  stopCurrentGame();

  const gameId = crypto.randomUUID();
  const duration = EXTRA_CONFIG.gameDurationSeconds;

  const cards = shuffleArray([
    1, 1,
    2, 2,
    3, 3,
    4, 4,
    5, 5,
    6, 6
  ]).map((value, index) => ({
    index,
    value,
    matched: false,
    open: false
  }));

  let opened = [];
  let foundPairs = 0;
  let locked = false;
  let active = true;
  let mismatchTimeout = 0;
  let timerId = 0;

  const startTime = performance.now();

  modalBody.innerHTML = `
    <div class="game-screen">
      <div class="game-top">
        <span>Пары: <span id="pairs-count">0</span> / 6</span>
        <span>⏱ <span id="pairs-time">${duration}</span></span>
      </div>

      <div id="pairs-grid" class="pairs-grid"></div>
    </div>
  `;

  const grid = document.getElementById("pairs-grid");
  const countElement = document.getElementById("pairs-count");
  const timeElement = document.getElementById("pairs-time");

  function renderCards() {
    grid.innerHTML = cards.map((card) => {
      const file = card.open || card.matched
        ? `card0${card.value}.png`
        : "card07.png";

      return `
        <button
          class="pair-card"
          type="button"
          data-card="${card.index}"
          ${card.matched ? "disabled" : ""}
          aria-label="Карта ${card.index + 1}"
        >
          <img src="${file}" alt="">
        </button>
      `;
    }).join("");

    grid.querySelectorAll("[data-card]").forEach((button) => {
      button.addEventListener("click", () => {
        openCard(Number(button.dataset.card));
      });
    });
  }

  function finish() {
    if (!active) return;

    active = false;

    showGameResult({
      gameId,
      gameType: "pairs",
      requestedAmount: foundPairs * 10,
      resultText: `Найдено пар: ${foundPairs}.`,
      replay: startPairsGame
    });
  }

  function openCard(index) {
    if (!active || locked) return;

    // Проверяем время также при нажатии.
    if ((performance.now() - startTime) / 1000 >= duration) {
      finish();
      return;
    }

    const card = cards[index];

    if (!card || card.open || card.matched) return;

    card.open = true;
    opened.push(card);
    renderCards();

    if (opened.length < 2) return;

    const [first, second] = opened;

    if (first.value === second.value) {
      first.matched = true;
      second.matched = true;
      opened = [];
      foundPairs++;

      countElement.textContent = String(foundPairs);
      renderCards();

      if (foundPairs === 6) {
        finish();
      }

      return;
    }

    locked = true;

    mismatchTimeout = setTimeout(() => {
      if (!active) return;

      first.open = false;
      second.open = false;
      opened = [];
      locked = false;

      renderCards();
    }, 800);
  }

  function updateTimer() {
    if (!active) return;

    const elapsed = (performance.now() - startTime) / 1000;
    const remaining = Math.max(0, Math.ceil(duration - elapsed));

    timeElement.textContent = String(remaining);

    if (elapsed >= duration) {
      finish();
    }
  }
    gameCleanup = () => {
    active = false;
    clearInterval(timerId);
    clearTimeout(mismatchTimeout);
  };

  renderCards();
  timerId = setInterval(updateTimer, 200);
}


/*
  ============================================================
  ИГРА 4. МАЯТНИК
  ============================================================
*/

function startPendulumGame() {
  stopCurrentGame();

  const gameId = crypto.randomUUID();

  let active = true;
  let manualMode = false;
  let usedCode = false;

  let angle = 0;
  let phase = 0;
  let previousTime = performance.now();
  let frameId = 0;

  modalBody.innerHTML = `
    <div class="game-screen">
      <h2>Маятник</h2>

      <p class="game-instructions">
        Остановите маятник в центральной полосе.
      </p>

      <div id="pendulum-field" class="pendulum-field">
        <img class="clock-face" src="clock01.png" alt="Циферблат">

        <div class="pendulum-target" aria-hidden="true"></div>

        <img
          id="pendulum-arm"
          class="pendulum-arm"
          src="clock02.png"
          alt="Маятник"
        >
      </div>

      <div class="modal-actions">
        <button
          id="stop-pendulum"
          class="gold-button"
          type="button"
        >
          Остановить
        </button>
      </div>

      <div class="secret-code-row">
        <input
          id="secret-code"
          type="text"
          placeholder="Ввести секретный код"
          autocomplete="off"
        >

        <button
          id="secret-button"
          class="green-button"
          type="button"
          aria-label="Подтвердить код"
        >
          ✓
        </button>
      </div>

      <p id="pendulum-message" class="message"></p>
    </div>
  `;

  const field = document.getElementById("pendulum-field");
  const arm = document.getElementById("pendulum-arm");
  const stopButton = document.getElementById("stop-pendulum");
  const secretButton = document.getElementById("secret-button");
  const secretInput = document.getElementById("secret-code");
  const message = document.getElementById("pendulum-message");

  function draw() {
    arm.style.transform = `translateX(-50%) rotate(${angle}deg)`;
  }

  function finish() {
    if (!active) return;

    active = false;

    // Центральный диапазон: от -7 до +7 градусов.
    const hit = Math.abs(angle) <= 7;

    const ordinaryReward = hit ? 30 : 10;
    const requestedAmount = ordinaryReward + (usedCode ? 15 : 0);

    showGameResult({
      gameId,
      gameType: "pendulum",
      requestedAmount,
      resultText: hit
        ? "Попадание в центральный диапазон."
        : "Маятник остановился вне центрального диапазона.",
      replay: startPendulumGame
    });
  }

  function tick(now) {
    if (!active) return;

    const delta = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;

    if (!manualMode) {
      // Скорость плавно меняется во время движения.
      const speed =
        3.0 + 2.8 * Math.sin(now / 1500);

      phase += delta * speed;
      angle = Math.sin(phase) * 35;
      draw();
    }

    frameId = requestAnimationFrame(tick);
  }

  stopButton.addEventListener("click", () => {
    if (!manualMode) {
      finish();
    }
  });

  secretButton.addEventListener("click", () => {
    if (!manualMode) {
      const code = secretInput.value.trim().toLowerCase();

      if (code !== "ящерка") {
        message.textContent = "Код не подошёл.";
        return;
      }

      manualMode = true;
      usedCode = true;

      stopButton.disabled = true;
      secretInput.disabled = true;

      message.textContent =
        "Перетащите маятник и снова нажмите зелёную кнопку.";

      return;
    }

    finish();
  });

  function dragPendulum(event) {
    if (!manualMode || !active) return;

    const rect = field.getBoundingClientRect();

    const pivotX = rect.left + rect.width / 2;
    const pivotY = rect.top + 35;

    const dx = event.clientX - pivotX;
    const dy = Math.max(1, event.clientY - pivotY);

    angle = Math.atan2(-dx, dy) * 180 / Math.PI;
        angle = Math.max(-35, Math.min(35, angle));

    draw();
  }

  field.addEventListener("pointerdown", (event) => {
    if (!manualMode) return;

    field.setPointerCapture(event.pointerId);
    dragPendulum(event);
  });

  field.addEventListener("pointermove", (event) => {
    if (
      manualMode &&
      field.hasPointerCapture(event.pointerId)
    ) {
      dragPendulum(event);
    }
  });

  gameCleanup = () => {
    active = false;
    cancelAnimationFrame(frameId);
  };

  draw();
  frameId = requestAnimationFrame(tick);
}
