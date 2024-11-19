let config = {};

const collectDataBtn = document.querySelector("#collect");
const exportDataBtn = document.querySelector("#export");
const autoJumpCheckbox = document.querySelector("#auto-jump");

collectDataBtn.onclick = function () {
  const message = { action: "BIS" };
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, message, (response) => {
      console.log(`BIS data:`, response);

      chrome.runtime.sendMessage(
        { action: "save", currentTab, data: response },
        (res) => {
          console.log(res);
        }
      );

      if (config.autoJump) {
        chrome.runtime.sendMessage(
          { action: "jump", currentTab, data: response },
          (res) => {
            console.log(res);
          }
        );
      }
    });
  });
};

exportDataBtn.onclick = function () {
  chrome.runtime.sendMessage({ action: "export" }, (data) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });

    // TODO: Maybe using local server to write files.
    saveAs(blob, "spec-data.json");
  });
};

autoJumpCheckbox.onclick = function () {
  config.autoJump = autoJumpCheckbox.checked;
  chrome.runtime.sendMessage(
    { action: "updateConfig", value: { autoJump: autoJumpCheckbox.checked } },
    (res) => {
      console.log(res);
    }
  );
};

let specsContainer;
function insertSpectDom(total, collected) {
  specsContainer = specsContainer ?? document.querySelector(".specs");
  const classNames = Object.keys(total);
  classNames.forEach((classKey) => {
    const container = document.createElement("div");
    container.classList.add(classKey);
    container.classList.add("class-specs");
  
    const classTitle = document.createElement("p");
    classTitle.innerText = classKey;

    const specContainer = document.createElement("div");
    total[classKey].forEach((specKey) => {
      const span = document.createElement("span");
      span.innerText = specKey;
      if (collected.includes(specKey)) {
        span.classList.add("collected");
      }
      specContainer.appendChild(span);
    });

    container.appendChild(classTitle);
    container.appendChild(specContainer);
    specsContainer.appendChild(container);
  });
}
chrome.runtime.sendMessage({ action: "querySpecs" }, (specs) => {
  const { total, collected } = specs;
  console.log("Received from background:", { total, collected });
  insertSpectDom(total, collected);
});

chrome.runtime.sendMessage({ action: "queryConfig" }, updateUIByConfig);

function updateUIByConfig(response) {
  config = response;

  autoJumpCheckbox.checked = config.autoJump;
}
