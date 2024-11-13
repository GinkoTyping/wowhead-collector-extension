const collectDataBtn = document.querySelector("#collect");
const exportDataBtn = document.querySelector("#export");

collectDataBtn.onclick = function () {
  const message = { action: "BIS" };
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, message, (response) => {
      chrome.runtime.sendMessage(
        { action: "jump", currentTab, data: response },
        (res) => {
          console.log(res);
        }
      );
    });
  });
};

exportDataBtn.onclick = function () {
  chrome.runtime.sendMessage({ action: "export" }, (data) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });

    saveAs(blob, "spec-data.json");
  });
};
