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
    case 'saveNpcToSearch':
      handleSaveNpcToSearch(request.data);
      toNextNpc(_sender.tab);
      break;

    case 'content_allow-translate-npc':
      sendResponse(npcToSearch?.length);
      break;
    case 'content_to-next-npc':
      console.log(`获取NPC数据${request.isSuccess ? '成功' : '失败'}`);
      toNextNpc(_sender.tab);
      break;

    case 'content_allow-collect-npc':
      sendResponse(doneNpcInDunegon.length);
      break;
    case 'content_to-next-npc-dungeon':
      toNextNpcDungeon(_sender.tab);
      break;

    case 'content_to-next-stat-page':
      updateStatData(request.data);
      toNextStatPage(request, _sender.tab, sendResponse);
      break;
    case 'content_allow-collect-stat':
      sendResponse(colloectedStat.length);
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

//#region NPC

let npcToSearch;
let npcCount = 0;
let npcDoneCount = 0;
function getQueryNpcUrl(dungeonId) {
  return `https://www.wowhead.com/npcs/react-a:-1/react-h:-1?filter=6;${dungeonId};0`;
}
function handleSaveNpcToSearch(data) {
  // TODO TEST
  npcToSearch = data;
  npcCount = npcToSearch.length;
}
function toNextNpc(tab) {
  if (npcToSearch.length) {
    const npc = npcToSearch.pop();
    const id = npc.id;
    const url = `https://www.wowhead.com/cn/npc=${id}`;
    npcDoneCount++;
    console.log(
      `当前NPC进度: ${npcDoneCount} / ${npcCount}  ${JSON.stringify(npc)}`
    );
    handleJump({ currentTab: tab }, url);
  }
}

const npcInDungeon = [
  {
    name: 'The MOTHERLODE!!',
    id: '8064',
  },
  {
    name: 'Theater of Pain',
    id: '12841',
  },
  {
    name: 'The Rookery',
    id: '14938',
  },
  {
    name: 'Priory of the Sacred Flame',
    id: '14954',
  },

  {
    name: 'Operation: Mechagon',
    id: '10225',
  },
  {
    name: 'Operation: Floodgate',
    id: '15452',
  },
  {
    name: 'Darkflame Cleft',
    id: '14882',
  },
  {
    name: 'Cinderbrew Meadery',
    id: '15103',
  },
];
let doneNpcInDunegon = [];
function toNextNpcDungeon(tab) {
  if (npcInDungeon.length) {
    const dungeon = npcInDungeon.pop();
    doneNpcInDunegon.push(dungeon);
    const id = dungeon.id;
    const url = `https://www.wowhead.com/npcs/react-a:-1/react-h:-1?filter=6;${id};0`;

    console.log(
      `当前NPC DUNGEON: ${doneNpcInDunegon.length} / ${
        doneNpcInDunegon.length + npcInDungeon.length
      }  ${JSON.stringify(dungeon)}`
    );
    handleJump({ currentTab: tab }, url);
  }
}
//#endregion

//#region 属性优先级
let colloectedStat = [];
let collectStatData = [];
const totalStatCount = URLS_ENTRIES.reduce((pre, [key, value]) => {
  pre += value.length;
  return pre;
}, 0);
function getStatUrl() {
  let curClass;
  let curSpec;
  Object.entries(URLS).some(([key, value]) => {
    const specToCollect = value.find(
      (spec) => !colloectedStat.includes(`${key}|${spec}`)
    );
    if (specToCollect) {
      curClass = key;
      curSpec = specToCollect;
      return true;
    }
    return false;
  });

  if (!curClass || !curSpec) {
    return '';
  }

  let suffix;
  const tanks = [
    'death-knight|blood',
    'druid|guardian',
    'monk|brewmaster',
    'demon-hunter|vengeance',
    'paladin|protection',
    'warrior|protection',
  ];
  const healers = [
    'druid|restoration',
    'monk|mistweaver',
    'paladin|holy',
    'shaman|restoration',
    'evoker|preservation',
    'priest|holy',
    'priest|discipline',
  ];
  if (tanks.includes(`${curClass}|${curSpec}`)) {
    suffix = 'tank';
  } else if (healers.includes(`${curClass}|${curSpec}`)) {
    suffix = 'healer';
  } else {
    suffix = 'dps';
  }

  console.log(`已采集属性优先级：${colloectedStat.length} / ${totalStatCount}`);

  return `https://www.wowhead.com/cn/guide/classes/${curClass}/${curSpec}/stat-priority-pve-${suffix}`;
}
function updateStatData(newItem) {
  if (!newItem.best.length) {
    console.log(
      `${newItem.classSpec}${newItem.roleClass} 请手动适配属性优先级`
    );
  }

  const existedIndex = collectStatData.findIndex(
    (item) =>
      item.roleClass === newItem.roleClass &&
      item.classSpec === newItem.classSpec
  );
  if (existedIndex === -1) {
    collectStatData.push(newItem);
  } else {
    if (newItem.best.length) {
      collectStatData.splice(existedIndex, 1, newItem);

      // best为空的不采集，手动适配
    } else {
      collectStatData.splice(existedIndex, 1, {
        ...newItem,
        best: collectStatData.best,
      });
    }
  }
  console.log({ collectStatData });
}
function toNextStatPage(request, tab, sendResponse) {
  colloectedStat.push(`${request.data.roleClass}|${request.data.classSpec}`);

  const url = getStatUrl();
  if (url) {
    handleJump({ currentTab: tab }, url);
  } else {
    console.log('采集属性结束。');
    const emptyBestStats = collectStatData
      .filter((item) => !item.best.length)
      .map((item) => `${item.classSpec} ${item.roleClass}`).join(',');
    console.log(`以下专精的最佳副属性为空：${emptyBestStats}`);
    sendResponse(collectStatData);
  }
}

//#endregion
