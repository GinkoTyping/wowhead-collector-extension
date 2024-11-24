let config = {
  autoJump: false,
  jumpInterval: 1500,
  displayMode: "checkbox",
};
let windowId;

const URLS = {
  "death-knight": ["blood", "frost", "unholy"],
  "demon-hunter": ["havoc", "vengeance"],
  druid: ["balance", "feral", "guardian", "restoration"],
  mage: ["arcane", "fire", "frost"],
  monk: ["brewmaster", "mistweaver", "windwalker"],
  paladin: ["holy", "protection", "retribution"],
  rogue: ["assassination", "outlaw", "subtlety"],
  shaman: ["elemental", "enhancement", "restoration"],
  warlock: ["affliction", "demonology", "destruction"],
  warrior: ["arms", "fury", "protection"],
  evoker: ["devastation", "preservation", "augmentation"],
  hunter: ["beast-mastery", "marksmanship", "survival"],
  priest: ["discipline", "holy", "shadow"],
};
const URLS_ENTRIES = Object.entries(URLS);

// [death-knight_frost, mage_frost]
const collectedURLs = [];
const collectedData = Object.entries(URLS).reduce((pre, [key, value]) => {
  pre[key] = [];
  return pre;
}, {});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case "save":
      handleSave(request, _sender, sendResponse);
      break;
    case "jump":
      handleJump(request, _sender, sendResponse);
      break;
    case "export":
      handlExport(request, _sender, sendResponse);
      break;
    case "querySpecs":
      handleQuerySpecs(request, _sender, sendResponse);
      break;
    case "queryConfig":
      handleQueryConfig(request, _sender, sendResponse);
    case "updateConfig":
      handleUpdateConfig(request, _sender, sendResponse);
      break;
    case "updateWindowId":
      handleUpdateWindowId(request, _sender, sendResponse);
      break;
    default:
      break;
  }
});

function handleUpdateWindowId(request, _sender, sendResponse) {
  windowId = request.windowId;
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

function combineClassAndSpec(classKey, specKey) {
  return `${classKey}_${specKey}`;
}

function saveSpecData(classes, spec, data) {
  if (collectedData[classes]) {
    collectedData[classes].push({ spec, ...data });
  } else {
    collectedData[classes] = [{ spec, ...data }];
  }
}

function handleSave(request, _sender, sendResponse) {
  const { currentTab, data } = request;

  const specInfo = getSpecInfo(currentTab.url);
  saveSpecData(specInfo[0], specInfo[1], data);

  const combineKey = combineClassAndSpec(specInfo[0], specInfo[1]);
  if (!collectedURLs.includes(combineKey)) {
    collectedURLs.push(combineKey);
  }

  console.log({ collectedURLs });
  return sendResponse("Save succeeded.");
}

//#region Jump
function handleJump(request, _sender, sendResponse) {
  const { currentTab } = request;
  const nextURL = getNextURL();
  sendResponse("Jumping...");
  chrome.tabs.create({ url: nextURL, windowId });

  chrome.tabs.query({ windowId }, (tabs) => {
    const lastTab = tabs.find((tab) =>
      [tab.url, tab.pendingUrl].includes(currentTab.url)
    );
    if (lastTab) {
      chrome.tabs.remove(lastTab.id);
    }
  });
}

function getNextURL() {
  let nextURL;
  URLS_ENTRIES.find(([key, value]) => {
    const nextSpec = value.find(
      (spec) => !collectedURLs.includes(combineClassAndSpec(key, spec))
    );
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

function handleQuerySpecs(request, _sender, sendResponse) {
  return sendResponse({ total: URLS, collected: collectedURLs });
}

function handleQueryConfig(request, _sender, sendResponse) {
  return sendResponse(config);
}

function handleUpdateConfig(request, _sender, sendResponse) {
  config = { ...config, ...request.value };

  return sendResponse(`Update success: ${JSON.stringify(config)}`);
}
