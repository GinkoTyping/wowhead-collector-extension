let config = {};

const collectDataBtn = document.querySelector("#collect");
collectDataBtn.onclick = function () {
  const message = { action: "BIS" };
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isValidURL = checkValidURL(currentTab.url);
    if (isValidURL) {
      chrome.tabs.sendMessage(currentTab.id, message, (response) => {
        console.log(`BIS data:`, response);

        chrome.runtime.sendMessage(
          { action: "save", currentTab, data: response },
          (res) => {
            console.log(res);
            updateSpecView();
          }
        );

        if (config.autoJump || hasCollectedCurrentSpec) {
          chrome.runtime.sendMessage(
            { action: "jump", currentTab, data: response },
            (res) => {
              console.log(res);
            }
          );
        }
      });
    } else {
      if (confirm("Not in the BIS page, comfirm to redirect to BIS page.")) {
        const [classKey, specKey] = getSpecInfo(currentTab.url);
        chrome.tabs.create({
          url: `https://www.wowhead.com/guide/classes/${classKey}/${specKey}/bis-gear`,
        });
      }
    }
  });
};
function checkValidURL(url) {
  const regex = /^https:\/\/www\.wowhead\.com\/guide\/classes.*\/bis-gear$/;
  return regex.test(url);
}

const exportDataBtn = document.querySelector("#export");
exportDataBtn.onclick = function () {
  chrome.runtime.sendMessage({ action: "export" }, (data) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });

    // TODO: Maybe using local server to write files.
    saveAs(blob, "spec-data.json");
  });
};

const autoJumpCheckbox = document.querySelector("#auto-jump");
autoJumpCheckbox.onclick = function () {
  config.autoJump = autoJumpCheckbox.checked;
  chrome.runtime.sendMessage(
    { action: "updateConfig", value: { autoJump: autoJumpCheckbox.checked } },
    (res) => {
      console.log(res);
    }
  );
};

const displayRadios = document.querySelector(".radios");
displayRadios.addEventListener("click", (e) => {
  if (e.target.type === "radio" && config.displayMode !== e.target.value) {
    config.displayMode = e.target.value;
    chrome.runtime.sendMessage(
      { action: "updateConfig", value: { displayMode: config.displayMode } },
      (res) => {
        // the size of the popup window changes, need to reload page.
        window.location.reload();
      }
    );
  }
});
function updateUIByDisplayMode() {
  selectedRadio = displayRadios.querySelector(
    `input[value=${config.displayMode}]`
  );
  selectedRadio.checked = true;
  if (config.displayMode === "checkbox") {
    specsSimpleContainer.classList.remove("hide");
    specsContainer.classList.add("hide");
  } else {
    specsContainer.classList.remove("hide");
    specsSimpleContainer.classList.add("hide");
  }
}

//#region Show realtime collected specs status;
let specsContainer;
let specsSimpleContainer;
let collectionInfo;
let hasCollectedCurrentSpec;
const COLLECTED_TEXT = "Collected. Next";
const NOT_COLLECTED_TEXT = "Collecte BIS Data";
function insertDom(total, collected) {
  specsContainer = specsContainer ?? document.querySelector(".specs");
  specsSimpleContainer =
    specsSimpleContainer ?? document.querySelector(".specs-simple");
  specsContainer.innerHTML = "";
  specsSimpleContainer.innerHTML = "";
  const classNames = Object.keys(total);
  classNames.forEach((classKey) => {
    insertSpecSimple(classKey, total[classKey], collected);
    insertSpec(classKey, total[classKey], collected);
  });
}

function insertSpec(classKey, specs, collected) {
  const container = document.createElement("div");
  container.classList.add(classKey);
  container.classList.add("class-specs");

  const classTitle = document.createElement("p");
  classTitle.innerText = classKey;

  const specContainer = document.createElement("div");
  specs.forEach((specKey) => {
    const span = document.createElement("span");
    span.innerText = specKey;
    if (collected.includes(`${classKey}_${specKey}`)) {
      span.classList.add("collected");
    }
    specContainer.appendChild(span);
  });

  container.appendChild(classTitle);
  container.appendChild(specContainer);
  specsContainer.appendChild(container);
}

function insertSpecSimple(classKey, specs, collected) {
  const container = document.createElement("div");
  container.classList.add(classKey);
  container.classList.add("class-specs");

  const classTitle = document.createElement("p");
  classTitle.innerText = classKey;

  const specContainer = document.createElement("div");
  specs.forEach((specKey) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = specKey;
    checkbox.title = specKey;

    if (collected.includes(`${classKey}_${specKey}`)) {
      checkbox.checked = true;
    }
    specContainer.appendChild(checkbox);
  });

  container.appendChild(classTitle);
  container.appendChild(specContainer);
  specsSimpleContainer.appendChild(container);
}

function getSpecInfo(url) {
  const output = url
    .replace("https://www.wowhead.com/guide/classes/", "")
    .replace(/([^/]+)$/, "")
    .split("/");
  if (output) {
    output.pop();
    return output;
  }
  return "";
}
function checkHasCollect() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const [classKey, specKey] = getSpecInfo(currentTab.url);
    hasCollectedCurrentSpec = collectionInfo.collected.includes(
      `${classKey}_${specKey}`
    );
    collectDataBtn.innerText = hasCollectedCurrentSpec
      ? COLLECTED_TEXT
      : NOT_COLLECTED_TEXT;
    collectDataBtn.classList[hasCollectedCurrentSpec ? "add" : "remove"]("off");
  });
}
function updateSpecView() {
  chrome.runtime.sendMessage({ action: "querySpecs" }, (specs) => {
    collectionInfo = specs;
    const { total, collected } = specs;
    console.log("Received from background:", { total, collected });
    insertDom(total, collected);
    checkHasCollect();
  });
}
//#endregion

//#region Set gloable setting from service_worker
function updateConfig() {
  chrome.runtime.sendMessage({ action: "queryConfig" }, updateUIByConfig);
}
function updateUIByConfig(response) {
  config = response;

  autoJumpCheckbox.checked = config.autoJump;
  updateUIByDisplayMode();
}
//#endregion

updateSpecView();
updateConfig();
