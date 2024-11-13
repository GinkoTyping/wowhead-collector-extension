const URLS = {
  "death-knight": ["blood", "frost", "unholy"],
  "demon-hunter": ["havoc", "vengeance"],
  druid: ["balance", "feral", "guardian", "restoration"],
  mage: ["arcane", "fire", "frost"],
  monk: ["brewmaster", "mistweaver", "windwalker"],
  palading: ["holy", "protection", "retribution"],
  rogue: ["assassination", "outlaw", "subtlety"],
  shaman: ["elemental", "enhancement", "restoration"],
  warlock: ["affliction", "demonology", "destruction"],
};
const URLS_ENTRIES = Object.entries(URLS);

const collectedURLs = [];

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "jump") {
    const { currentTab } = request;
    const currentURL = currentTab.url
      .replace("https://www.wowhead.com/guide/classes/", "")
      .replace(/([^/]+)$/, "")
      .split("/");
    currentURL.pop();
    collectedURLs.push(currentURL[1]);
    const nextURL = getNextURL();
    sendResponse("Jumping...");
    console.log({ nextURL });
    chrome.tabs.create({ url: nextURL });
  }
});

function getNextURL() {
  let nextURL;
  URLS_ENTRIES.find(([key, value]) => {
    const nextSpec = value.find((spec) => !collectedURLs.includes(spec));
    if (nextSpec) {
      nextURL = `https://www.wowhead.com/guide/classes/${key}/${nextSpec}/bis-gear`;
      return true;
    }
    return false;
  });

  return nextURL;
}
