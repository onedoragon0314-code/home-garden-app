const STORAGE_KEY = "home-garden-notebook-v1";
const defaultState = {
  weather: { condition: "晴れ", temperature: 25, humidity: 60 },
  plants: [
    { id: "tomato", name: "トマト", icon: "🍅", potSize: 10, soil: "湿っている" },
    { id: "parsley", name: "パセリ", icon: "🌿", potSize: 3, soil: "湿っている" },
    { id: "spinach", name: "ほうれん草", icon: "🥬", potSize: 5, soil: "湿っている" },
    { id: "pepper", name: "唐辛子", icon: "🌶️", potSize: 10, soil: "湿っている" },
    { id: "strawberry", name: "よつぼし", icon: "🍓", potSize: 1, soil: "湿っている" }
  ]
};
const elements = {
  today: document.querySelector("#today"), weatherCondition: document.querySelector("#weather-condition"),
  temperature: document.querySelector("#temperature"), humidity: document.querySelector("#humidity"),
  plantList: document.querySelector("#plant-list"), plantCount: document.querySelector("#plant-count"),
  wateringList: document.querySelector("#watering-list"), emptyState: document.querySelector("#empty-state"),
  saveStatus: document.querySelector("#save-status"), dialog: document.querySelector("#plant-dialog"),
  plantForm: document.querySelector("#plant-form"), plantName: document.querySelector("#plant-name"),
  plantIcon: document.querySelector("#plant-icon"), potSize: document.querySelector("#pot-size")
};
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.plants) && saved.weather) return { weather: { ...defaultState.weather, ...saved.weather }, plants: saved.plants };
  } catch (error) { console.warn("保存データを読み込めませんでした。", error); }
  return structuredClone(defaultState);
}
let appState = loadState();
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    elements.saveStatus.textContent = "保存しました";
    window.setTimeout(() => { elements.saveStatus.textContent = "この端末に保存"; }, 1400);
  } catch (error) { elements.saveStatus.textContent = "保存できませんでした"; console.error(error); }
}
function wateringAdvice(plant) {
  if (plant.soil === "乾いている") {
    if (appState.weather.condition === "雨") return { message: "土は乾いています。雨の様子を見てから水やりしましょう。", needsWater: false };
    const amount = Math.max(100, Math.round(plant.potSize * 100));
    return { message: "水やりの目安：約" + amount + "mL", needsWater: true };
  }
  if (plant.soil === "少し乾いている" && appState.weather.condition !== "雨") return { message: "土の表面を確認し、乾いていたら少し水をあげましょう。", needsWater: true };
  return { message: "今日は水やり不要です。", needsWater: false };
}
function renderPlants() {
  elements.plantList.replaceChildren();
  elements.plantCount.textContent = String(appState.plants.length);
  elements.emptyState.hidden = appState.plants.length !== 0;
  appState.plants.forEach((plant) => {
    const row = document.createElement("div"); row.className = "plant-row";
    const name = document.createElement("span"); name.className = "plant-name"; name.textContent = plant.icon + " " + plant.name;
    const pot = document.createElement("span"); pot.className = "plant-pot"; pot.textContent = "鉢 " + plant.potSize + "L";
    const soil = document.createElement("select"); soil.className = "soil-select"; soil.setAttribute("aria-label", plant.name + "の土の状態");
    ["湿っている", "少し乾いている", "乾いている"].forEach((condition) => {
      const option = document.createElement("option"); option.value = condition; option.textContent = condition; soil.appendChild(option);
    });
    soil.value = plant.soil;
    soil.addEventListener("change", () => { plant.soil = soil.value; saveState(); renderWatering(); });
    const remove = document.createElement("button"); remove.className = "icon-button"; remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", plant.name + "を削除");
    remove.addEventListener("click", () => { appState.plants = appState.plants.filter((item) => item.id !== plant.id); saveState(); render(); });
    row.append(name, pot, soil, remove); elements.plantList.appendChild(row);
  });
}
function renderWatering() {
  elements.wateringList.replaceChildren();
  if (appState.plants.length === 0) {
    const message = document.createElement("p"); message.className = "empty-state"; message.textContent = "植物を追加すると、水やりの目安が表示されます。"; elements.wateringList.appendChild(message); return;
  }
  appState.plants.forEach((plant) => {
    const advice = wateringAdvice(plant);
    const item = document.createElement("article"); item.className = "watering-item" + (advice.needsWater ? " needs-water" : "");
    const name = document.createElement("p"); name.className = "watering-name"; name.textContent = plant.icon + " " + plant.name;
    const text = document.createElement("p"); text.className = "watering-advice"; text.textContent = advice.message;
    item.append(name, text); elements.wateringList.appendChild(item);
  });
}
function renderWeather() {
  elements.weatherCondition.value = appState.weather.condition;
  elements.temperature.value = appState.weather.temperature;
  elements.humidity.value = appState.weather.humidity;
}
function render() { renderWeather(); renderPlants(); renderWatering(); }
elements.today.textContent = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());
[elements.weatherCondition, elements.temperature, elements.humidity].forEach((input) => {
  input.addEventListener("change", () => {
    appState.weather.condition = elements.weatherCondition.value;
    appState.weather.temperature = Number(elements.temperature.value) || 0;
    appState.weather.humidity = Number(elements.humidity.value) || 0;
    saveState(); renderWatering();
  });
});
document.querySelector("#add-plant-button").addEventListener("click", () => { elements.plantForm.reset(); elements.potSize.value = "5"; elements.dialog.showModal(); elements.plantName.focus(); });
function closeDialog() { elements.dialog.close(); }
document.querySelector("#close-dialog-button").addEventListener("click", closeDialog);
document.querySelector("#cancel-dialog-button").addEventListener("click", closeDialog);
elements.plantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.plantName.value.trim();
  if (!name) return;
  appState.plants.push({ id: "plant-" + Date.now(), name, icon: elements.plantIcon.value, potSize: Number(elements.potSize.value), soil: "湿っている" });
  saveState(); render(); closeDialog();
});
render();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => console.warn("オフライン利用の準備ができませんでした。", error));
  });
}
