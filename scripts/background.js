let exportedData;
chrome.runtime.onInstalled.addListener(() => {
  const url = chrome.runtime.getURL('../export/spec-data.json');
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      exportedData = data;
      console.log({ exportedData });
    })
    .catch((error) => {
      console.error('Error fetching JSON:', error);
    });
});

let config = {
  autoJump: false,
  isOverride: false,
  displayDetail: false,
  jumpInterval: 1500,
};
let windowId;

const URLS = {
  'death-knight': ['blood', 'frost', 'unholy'],
  'demon-hunter': ['havoc', 'vengeance'],
  druid: ['balance', 'feral', 'guardian', 'restoration'],
  mage: ['arcane', 'fire', 'frost'],
  monk: ['brewmaster', 'mistweaver', 'windwalker'],
  paladin: ['holy', 'protection', 'retribution'],
  rogue: ['assassination', 'outlaw', 'subtlety'],
  shaman: ['elemental', 'enhancement', 'restoration'],
  warlock: ['affliction', 'demonology', 'destruction'],
  warrior: ['arms', 'fury', 'protection'],
  evoker: ['devastation', 'preservation', 'augmentation'],
  hunter: ['beast-mastery', 'marksmanship', 'survival'],
  priest: ['discipline', 'holy', 'shadow'],
};
const URLS_ENTRIES = Object.entries(URLS);

// [death-knight_frost, mage_frost]
const collectedURLs = [];
let collectedData = Object.entries(URLS).reduce((pre, [key, value]) => {
  pre[key] = [];
  return pre;
}, {});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'save':
      handleSave(request, _sender, sendResponse);
      break;
    case 'jump':
      const nextURL = getNextURL();
      handleJump(request, nextURL);
      break;
    case 'export':
      handlExport(request, _sender, sendResponse);
      break;
    case 'querySpecs':
      handleQuerySpecs(request, _sender, sendResponse);
      break;
    case 'queryConfig':
      handleQueryConfig(request, _sender, sendResponse);
    case 'updateConfig':
      handleUpdateConfig(request, _sender, sendResponse);
      break;
    case 'updateWindowId':
      handleUpdateWindowId(request, _sender, sendResponse);
      break;
    case 'saveSpellToSearch':
      spellToSearch = request.data;
      handleToNextSpell(request, _sender, sendResponse);
      break;
    case 'toNextSpell':
      handleLogSpellAction(request);
      handleToNextSpell(request, _sender, sendResponse);
      break;
    case 'getSpellsToSearch':
      sendResponse(spellToSearch);
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
    .replace('https://www.wowhead.com/cn/guide/classes/', '')
    .replace(/([^/]+)$/, '')
    .split('/');
  if (output) {
    output.pop();
    return output;
  }
  return '';
}

function combineClassAndSpec(classKey, specKey) {
  return `${classKey}_${specKey}`;
}

function saveSpecData(classes, spec, data) {
  if (config.isOverride) {
    collectedData = exportedData;
  }

  if (collectedData[classes]) {
    if (config.isOverride) {
      const index = collectedData[classes].findIndex((item) => {
        if (item.spec === spec) {
          return true;
        }
        return false;
      });
      if (index === -1) {
        collectedData[classes].push({ spec, ...data });
      } else {
        collectedData[classes][index] = { spec, ...data };
      }
    } else {
      collectedData[classes].push({ spec, ...data });
    }
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
  return sendResponse('Save succeeded.');
}

//#region Jump
function handleJump(request, nextUrl) {
  const { currentTab } = request;
  if (nextUrl) {
    chrome.tabs.create({ url: nextUrl, windowId });

    chrome.tabs.query({ windowId }, (tabs) => {
      const lastTab = tabs.find((tab) =>
        [tab.url, tab.pendingUrl].includes(currentTab.url)
      );
      if (lastTab) {
        chrome.tabs.remove(lastTab.id);
      }
    });
  }
}

function getNextURL() {
  let nextURL;
  URLS_ENTRIES.find(([key, value]) => {
    const nextSpec = value.find(
      (spec) => !collectedURLs.includes(combineClassAndSpec(key, spec))
    );
    if (nextSpec) {
      nextURL = `https://www.wowhead.com/cn/guide/classes/${key}/${nextSpec}/bis-gear`;
      return true;
    }
    return false;
  });

  return nextURL;
}
//#region

function handlExport(request, _sender, sendResponse) {
  return sendResponse(exportedData);
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

//#region 技能数据
let spellToSearch;
let spellDoneCount = 0;
function getSpellUrl(spellId) {
  return `https://www.wowhead.com/cn/spell=${spellId}`;
}

function handleLogSpellAction(request) {
  if (request.isSuccess) {
    console.log(`状态：${request.isSuccess ? '√' : 'X'}`, request.spellData);
  } else {
    console.log(`状态：${request.isSuccess ? '√' : 'X'}`, request.error);
  }
}
function handleToNextSpell(request, _sender, sendResponse) {
  if (spellToSearch.length) {
    const spell = spellToSearch.shift();
    spellDoneCount++;
    console.log(
      `当前SPELL进度: ${spellDoneCount} / ${
        spellToSearch.length + spellDoneCount
      }  ${JSON.stringify(spell)}`
    );
    handleJump({ currentTab: _sender.tab }, getSpellUrl(spell.id));
  }
}
//#endregion
