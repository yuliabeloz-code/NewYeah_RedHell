const welcomeScreen = document.getElementById("welcome-screen");
const homeScreen = document.getElementById("home-screen");
const knockButton = document.getElementById("knock-button");
const navigationButtons = document.querySelectorAll(".nav-button");

const views = [
  document.getElementById("living-room-view"),
  document.getElementById("calendar-view"),
  document.getElementById("personal-room-view")
];

knockButton.addEventListener("click", function () {
  welcomeScreen.hidden = true;
  homeScreen.hidden = false;
  document.body.classList.add("entered");
  window.scrollTo(0, 0);
});

navigationButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const selectedView = button.dataset.view;

    views.forEach(function (view) {
      view.hidden = view.id !== selectedView;
    });

    navigationButtons.forEach(function (navButton) {
      navButton.removeAttribute("aria-current");
    });

    button.setAttribute("aria-current", "page");
  });
});

function updateLivingRoom() {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 16;

  document.getElementById("living-room").src = isDay
    ? "images/living-room.jpg"
    : "images/living-room-night.jpg";
}

updateLivingRoom();
setInterval(updateLivingRoom, 60 * 1000);

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    updateLivingRoom();
  }
});
