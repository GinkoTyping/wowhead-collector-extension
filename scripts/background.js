let config = {
  autoJump: true,
};

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
const collectedData = {};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "jump") {
    handleJump(request, _sender, sendResponse);
  } else if (request.action === "export") {
    handlExport(request, _sender, sendResponse);
  } else if (request.action === "querySpecs") {
    handleQuerySpecs();
  } else if (request.action === "queryConfig") {
    handleQueryConfig(request, _sender, sendResponse);
  } else if (request.action === "updateConfig") {
    handleUpdateConfig(request, _sender, sendResponse);
  }
});

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

function saveSpecData(classes, spec, data) {
  if (collectedData[classes]) {
    collectedData[classes][spec] = data;
  } else {
    collectedData[classes] = { [spec]: data };
  }
}

//#region Jump
function handleJump(request, _sender, sendResponse) {
  const { currentTab, data } = request;

  const specInfo = getSpecInfo(currentTab.url);
  saveSpecData(specInfo[0], specInfo[1], data);

  collectedURLs.push(specInfo[1]);
  const nextURL = getNextURL();
  sendResponse("Jumping...");
  chrome.tabs.create({ url: nextURL });
}

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
//#region

function handlExport(request, _sender, sendResponse) {
  return sendResponse(collectedData);
}

function handleQuerySpecs() {}

function handleQueryConfig(request, _sender, sendResponse) {
  return sendResponse(config);
}

function handleUpdateConfig(request, _sender, sendResponse) {
  config = { ...config, ...request.value };

  return sendResponse(`Update success: ${JSON.stringify(config)}`);
}
