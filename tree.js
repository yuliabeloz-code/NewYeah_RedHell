*/
const SUPABASE_URL = " https://eqmuytbgdnadxuvygnks.supabase.co";
const SUPABASE_PUBLIC_KEY = " sb_publishable_9uKBN-Zs8TygKyJfbE1YFQ_oa-cyJiE";

const TREE_API_URL = `${SUPABASE_URL}/functions/v1/tree-api`;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const telegram = window.Telegram?.WebApp;

const livingTree = document.getElementById("livingTree");
const livingToyLayer = document.getElementById("livingToyLayer");

const treeDialog = document.getElementById("treeDialog");
const closeTreeButton = document.getElementById("closeTreeButton");

const treeStage = document.getElementById("treeStage");
const modalToyLayer = document.getElementById("modalToyLayer");
const draftToyLayer = document.getElementById("draftToyLayer");

const toyFileInput = document.getElementById("toyFileInput");
const addToyButton = document.getElementById("addToyButton");
const saveToyButton = document.getElementById("saveToyButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const toyScale = document.getElementById("toyScale");
const treeMessage = document.getElementById("treeMessage");

const toyDetails = document.getElementById("toyDetails");
const toyDetailsImage = document.getElementById("toyDetailsImage");
const toyDetailsAuthor = document.getElementById("toyDetailsAuthor");
const adminEditButton = document.getElementById("adminEditButton");

let initData = "";
let isAdmin = false;
let ready = false;
let busy = false;

let toys = [];
let selectedToy = null;

/*
  draft:
  {
    mode: "new" | "edit",
    id,
    file,
    imageUrl,
    x,
    y,
    scale
  }
*/
let draft = null;
let draftElement = null;

function showMessage(message) {
  treeMessage.textContent = message;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setBusy(value) {
  busy = value;

  addToyButton.disabled = value || !ready;
  saveToyButton.disabled = value || !draft;
  cancelEditButton.disabled = value;
  toyScale.disabled = value || !draft;
  closeTreeButton.disabled = value;
  adminEditButton.disabled = value;
}

async function apiRequest(action, values = {}) {
  const response = await fetch(TREE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLIC_KEY,
    },
    body: JSON.stringify({
      action,
      initData,
      ...values,
    }),
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Сервер вернул некорректный ответ.");
  }

  if (!response.ok) {
    throw new Error(result.error || "Ошибка запроса к серверу.");
  }

  return result;
}

async function uploadToy() {
  const formData = new FormData();

  formData.append("action", "save");
  formData.append("initData", initData);
  formData.append("file", draft.file);
  formData.append("x", String(draft.x));
  formData.append("y", String(draft.y));
  formData.append("scale", String(draft.scale));

  const response = await fetch(TREE_API_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLIC_KEY,
    },
    body: formData,
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Сервер вернул некорректный ответ.");
  }

  if (!response.ok) {
    throw new Error(result.error || "Не удалось сохранить игрушку.");
  }

  return result;
}

function positionToy(element, toy) {
  element.style.left = `${toy.x}%`;
  element.style.top = `${toy.y}%`;
  element.style.width = `${toy.scale}%`;
}

function createToyElement(toy, interactive) {
  const element = document.createElement(interactive ? "button" : "div");

  element.className = "tree-toy";
  positionToy(element, toy);

  if (interactive) {
    element.type = "button";
    element.setAttribute(
      "aria-label",
      `Игрушка. Добавил: ${toy.author}`,
    );

    element.addEventListener("click", () => {
      if (busy || draft) {
        return;
      }
            showToyDetails(toy);
    });
  }

  const image = document.createElement("img");
  image.src = toy.imageUrl;
  image.alt = "";
  image.draggable = false;

  element.appendChild(image);

  return element;
}

function renderSavedToys() {
  livingToyLayer.replaceChildren();
  modalToyLayer.replaceChildren();

  for (const toy of toys) {
    livingToyLayer.appendChild(createToyElement(toy, false));
    modalToyLayer.appendChild(createToyElement(toy, true));
  }
}

async function refreshToys() {
  const result = await apiRequest("list");

  toys = result.toys;
  renderSavedToys();
}

function showToyDetails(toy) {
  selectedToy = toy;

  toyDetailsImage.src = toy.imageUrl;
  toyDetailsAuthor.textContent = `Добавил: ${toy.author}`;

  adminEditButton.hidden = !isAdmin;
  toyDetails.hidden = false;
}

function hideToyDetails() {
  selectedToy = null;
  toyDetails.hidden = true;
  toyDetailsImage.removeAttribute("src");
  toyDetailsAuthor.textContent = "";
}

function updateDraftPosition() {
  if (!draft || !draftElement) {
    return;
  }

  positionToy(draftElement, draft);
}

function renderDraft() {
  draftToyLayer.replaceChildren();
  draftElement = null;

  if (!draft) {
    return;
  }

  const element = document.createElement("div");
  element.className = "tree-toy is-draft";
  element.setAttribute("aria-label", "Перетащите игрушку на ёлку");

  const image = document.createElement("img");
  image.src = draft.imageUrl;
  image.alt = "";
  image.draggable = false;

  element.appendChild(image);
  draftToyLayer.appendChild(element);

  draftElement = element;
  updateDraftPosition();

  let dragging = false;

  function moveFromPointer(event) {
    if (!draft) {
      return;
    }

    const rectangle = treeStage.getBoundingClientRect();

    if (!rectangle.width || !rectangle.height) {
      return;
    }

    draft.x = clamp(
      ((event.clientX - rectangle.left) / rectangle.width) * 100,
      0,
      100,
    );

    draft.y = clamp(
      ((event.clientY - rectangle.top) / rectangle.height) * 100,
      0,
      100,
    );

    updateDraftPosition();
  }

  element.addEventListener("pointerdown", (event) => {
    if (busy) {
      return;
    }

    event.preventDefault();
    dragging = true;

    element.setPointerCapture(event.pointerId);
    moveFromPointer(event);
  });

  element.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }

    moveFromPointer(event);
  });

  element.addEventListener("pointerup", (event) => {
    dragging = false;

    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  });

  element.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

function updateControls() {
  saveToyButton.disabled = busy || !draft;
  toyScale.disabled = busy || !draft;
  cancelEditButton.disabled = busy;
  cancelEditButton.hidden = !draft;

  addToyButton.disabled = busy || !ready;

  if (draft) {
    toyScale.value = String(draft.scale);
  }
}

function clearDraft() {
  if (draft?.mode === "new" && draft.imageUrl) {
    URL.revokeObjectURL(draft.imageUrl);
  }

  draft = null;
  draftElement = null;
  draftToyLayer.replaceChildren();

  toyFileInput.value = "";
  updateControls();
}

function confirmDiscardDraft() {
  if (!draft) {
    return true;
  }

  return window.confirm(
    "Изменения игрушки ещё не сохранены. Отменить их?",
  );
}

function openTree() {
  if (!treeDialog.open) {
    treeDialog.showModal();
  }

  if (ready) {
    refreshToys().catch((error) => {
      showMessage(error.message);
    });
  }
}

function closeTree() {
  if (busy) {
    return;
  }

  if (!confirmDiscardDraft()) {
    return;
  }

  clearDraft();
  hideToyDetails();
  showMessage("");
  treeDialog.close();
}

async function validateImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = resolve;
      image.onerror = reject;
      image.src = imageUrl;
    });
        return imageUrl;
  } catch {
    URL.revokeObjectURL(imageUrl);
    throw new Error(
      "Не удалось открыть изображение. Попробуйте другой файл.",
    );
  }
}

async function initialize() {
  if (!telegram || !telegram.initData) {
    showMessage(
      "Откройте эту страницу через Telegram Mini App.",
    );

    return;
  }

  telegram.ready();

  initData = telegram.initData;

  try {
    const result = await apiRequest("profile");

    isAdmin = result.isAdmin;

    if (!result.profile) {
      const suggestedName =
        telegram.initDataUnsafe?.user?.first_name || "";

      const name = window.prompt(
        "Как вас зовут? Это имя увидят другие участники.",
        suggestedName,
      );

      if (name === null || !name.trim()) {
        showMessage(
          "Чтобы участвовать, закройте и снова откройте приложение " +
            "и укажите имя.",
        );

        return;
      }

      await apiRequest("register", {
        name: name.trim(),
      });
    }

    ready = true;
    updateControls();

    await refreshToys();

    showMessage(
      "Нажмите «Украсить ёлку», чтобы добавить игрушку.",
    );
  } catch (error) {
    showMessage(error.message);
  }
}

/* Открытие ёлки */
livingTree.addEventListener("click", openTree);

livingTree.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openTree();
  }
});

closeTreeButton.addEventListener("click", closeTree);

/*
  Закрытие диалога клавишей Escape:
  сначала проверяем, нет ли несохранённых изменений.
*/
treeDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeTree();
});

/* Выбор файла */
addToyButton.addEventListener("click", () => {
  if (!ready || busy) {
    return;
  }

  if (draft && !confirmDiscardDraft()) {
    return;
  }

  clearDraft();
  hideToyDetails();

  toyFileInput.click();
});

toyFileInput.addEventListener("change", async () => {
  const file = toyFileInput.files?.[0];

  if (!file) {
    return;
  }

  if (file.type !== "image/png" && file.type !== "image/webp") {
    showMessage("Пожалуйста, выберите изображение PNG или WebP.");
    toyFileInput.value = "";
    return;
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    showMessage("Выберите файл размером не больше 5 МБ.");
    toyFileInput.value = "";
    return;
  }

  setBusy(true);

  try {
    const imageUrl = await validateImage(file);

    draft = {
      mode: "new",
      file,
      imageUrl,
      x: 50,
      y: 50,
      scale: 15,
    };

    renderDraft();
    showMessage(
      "Перетащите игрушку на нужное место, измените размер " +
        "и нажмите «Сохранить».",
    );
  } catch (error) {
    showMessage(error.message);
    toyFileInput.value = "";
  } finally {
    setBusy(false);
    updateControls();
  }
});

/* Изменение размера */
toyScale.addEventListener("input", () => {
  if (!draft || busy) {
    return;
  }

  draft.scale = Number(toyScale.value);
  updateDraftPosition();
});

/* Отмена */
cancelEditButton.addEventListener("click", () => {
  if (busy) {
    return;
  }

  clearDraft();
  showMessage("Размещение игрушки отменено.");
});

/* Администратор начинает изменение сохранённой игрушки */
adminEditButton.addEventListener("click", () => {
  if (!isAdmin || !selectedToy || busy) {
    return;
  }

  if (draft && !confirmDiscardDraft()) {
    return;
  }

  clearDraft();

  draft = {
    mode: "edit",
    id: selectedToy.id,
    imageUrl: selectedToy.imageUrl,
    x: selectedToy.x,
    y: selectedToy.y,
    scale: selectedToy.scale,
  };

  hideToyDetails();
  renderDraft();
  updateControls();

  showMessage(
    "Перетащите игрушку, измените размер и нажмите «Сохранить».",
  );
});

/* Сохранение новой игрушки или изменений администратора */
saveToyButton.addEventListener("click", async () => {
  if (!draft || busy) {
    return;
  }

  setBusy(true);
  showMessage("Сохраняем игрушку...");

  try {
    if (draft.mode === "new") {
      await uploadToy();
    } else {
      await apiRequest("update", {
                id: draft.id,
        x: draft.x,
        y: draft.y,
        scale: draft.scale,
      });
    }

    clearDraft();

    try {
      await refreshToys();
      showMessage("Игрушка сохранена и видна всем участникам!");
    } catch {
      showMessage(
        "Игрушка сохранена, но не удалось обновить ёлку. " +
          "Закройте и снова откройте её.",
      );
    }
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

/*
  Обновление общей ёлки раз в 30 секунд.
  Это не мгновенная подписка: изменения других участников
  появляются при следующем обновлении или открытии окна.
*/
window.setInterval(() => {
  if (!ready || busy || document.hidden) {
    return;
  }

  refreshToys().catch((error) => {
    console.error("Не удалось обновить ёлку:", error);
  });
}, 30_000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ready && !busy) {
    refreshToys().catch((error) => {
      console.error("Не удалось обновить ёлку:", error);
    });
  }
});

updateControls();
initialize();
