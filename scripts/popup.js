const getDataBtn = document.querySelector("button");

getDataBtn.onclick = function () {
  const message = { action: "BIS" };
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
      console.log({ response });

      // TODO save all urls in background
      chrome.tabs.create({ url: "https://www.baidu.com" });
    });
  });
};
