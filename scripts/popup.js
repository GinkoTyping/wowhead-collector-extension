const getDataBtn = document.querySelector("button");

getDataBtn.onclick = function () {
  const message = { action: "BIS" };
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, message, (response) => {
      console.log({ response });
      chrome.runtime.sendMessage({ action: "jump", currentTab }, (res) => {
        console.log(res);
      });
    });
  });
};
