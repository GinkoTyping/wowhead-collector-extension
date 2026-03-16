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
    case 'toNextTalent': {
      saveTalentData(request.data)
      const url = getNextTalentURL()
      handleToNextTalent(request, _sender, sendResponse, url);
      break;
    }
    case 'export':
      handlExport(request, _sender, sendResponse);
      break;
    case 'querySpecs':
      handleQuerySpecs(request, _sender, sendResponse);
      break;
    case 'queryConfig':
      handleQueryConfig(request, _sender, sendResponse);
      break;
    case 'updateConfig':
      handleUpdateConfig(request, _sender, sendResponse);
      break;
    case 'updateWindowId':
      handleUpdateWindowId(request, _sender, sendResponse);
      break;

    case 'saveItemToSearch':
      // TODO
      itemToSearch = request.data;
      handleToNextItem(request, _sender, sendResponse);
      break;
    case 'toNextItem':
      handleLogSpellAction({ ...request, spellData: request.data });
      handleToNextItem(request, _sender, sendResponse);
      break;
    case 'getItemsToSearch':
      sendResponse(itemToSearch);
      break;

    case 'saveSpellToSearch':
      spellToSearch = request.data;
      version = request.version;
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
  // 个别页面还没有中文
  let base = url.includes('/cn/') ? 'https://www.wowhead.com/cn/guide/classes/' : 'https://www.wowhead.com/guide/classes/'

  const output = url
    .replace(base, '')
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

// region Jump
let currentActiveTabId = null;
function handleJump(request, nextUrl) {
  const { currentTab } = request;
  if (nextUrl) {
    // 创建新标签页时获取新标签ID
    chrome.tabs.create({ url: nextUrl, windowId }, (newTab) => {
      // 直接使用当前标签的ID关闭
      if (currentTab && currentTab.id) {
        chrome.tabs.remove(currentTab.id);
      }

      // 更新全局记录的当前标签页（用于下次关闭）
      currentActiveTabId = newTab.id;
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
// endregion

// region 跳转天赋页面
let talentURLs = {

  'death-knight': ['blood|tank', 'frost', 'unholy'],
  druid: ['balance', 'feral', 'feral|tank', 'restoration|healer'],
  mage: ['arcane', 'fire', 'frost'],
  paladin: ['holy|healer', 'protection|tank', 'retribution'],
  rogue: ['assassination', 'combat', 'subtlety'],
  shaman: ['elemental', 'enhancement', 'restoration|healer'],
  warlock: ['affliction', 'demonology', 'destruction'],
  warrior: ['arms', 'fury', 'protection|tank'],
  hunter: ['beast-mastery', 'marksmanship', 'survival'],
  priest: ['discipline|healer', 'holy|healer', 'shadow'],
}
let currentTalentURLIndex = 0;
let currentTalent = {
  roleClass: 'death-knight',
  classSpec: 'blood',
  type: 'tank'
}
function getNextTalentURL() {
  if (currentTalent.roleClass) {
    if (currentTalentURLIndex === 0) {
      // 是否是已经完成
      if (Object.keys(talentURLs)?.length) {
        Object.entries(talentURLs).some(([key, value]) => {
          const spec = value.shift()
          currentTalent = {
            roleClass: key,
            classSpec: spec.split('|')[0],
            type: spec.split('|')[1] ?? 'dps',
          }
          return true;
        })
        if (!talentURLs[currentTalent.roleClass]?.length) {
          delete talentURLs[currentTalent.roleClass];
        }
        currentTalentURLIndex ++;
        return `https://www.wowhead.com/wotlk/cn/guide/classes/${currentTalent.roleClass}/${currentTalent.classSpec}/${currentTalent.type}-talent-builds-glyphs-pve`
      } else {
        return ''
      }
    } else {
      currentTalentURLIndex = 0;
      return `https://www.wowhead.com/wotlk/cn/guide/classes/${currentTalent.roleClass}/${currentTalent.classSpec}/${currentTalent.type}-leveling-tips`
    }
  } else {
    currentTalent = {
      roleClass: 'death-knight',
      classSpec: 'blood',
      type: 'tank'
    }
    talentURLs['death-knight'].shift()
    currentTalentURLIndex = 1;
    return `https://www.wowhead.com/wotlk/cn/guide/classes/${currentTalent.roleClass}/${currentTalent.classSpec}/${currentTalent.type}-talent-builds-glyphs-pve`
  }
}
function handleToNextTalent(request, _sender, sendResponse, url) {
  if (url) {
    handleJump({ currentTab: _sender.tab }, url);
  }
}
const talentData = []
function saveTalentData(data) {
  let existed = talentData.find(item => item.classSpec === currentTalent.classSpec && item.roleClass === currentTalent.roleClass && currentTalent.type === item.type);
  let output = {}

  if (data.type === 'build') {
    output.build = data.data;
  } else {
    output.leveling = data.data;
  }

  if (existed) {
    existed[data.type] = data.data;
  } else {
    talentData.push({
      ...currentTalent,
      ...output
    })
  }

  console.log(currentTalent.roleClass, currentTalent.classSpec, data.type);
}
// endregion

function handlExport(request, _sender, sendResponse) {
  if (talentData.length > 0) {
    return sendResponse(talentData);
  } else {
    return sendResponse(collectedData);
  }
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
let version;
function getSpellUrl(spellId) {
  if (version) {
    return `https://www.wowhead.com/${version}/cn/spell=${spellId}`;
  }
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
  // {
  //   name: 'Priory of the Sacred Flame',
  //   id: '14954',
  // },
  // {
  //   name: 'Operation: Floodgate',
  //   id: '15452',
  // },
  // {
  //   name: 'Tazavesh, the Veiled Market',
  //   id: '13577',
  // },
  // {
  //   name: 'Eco-Dome Al\'dani',
  //   id: '16104',
  // },
  // {
  //   name: 'Halls of Atonement',
  //   id: '12831',
  // },
  // {
  //   name: 'Ara-Kara, City of Echoes',
  //   id: '15093',
  // },
  {
    name: 'The Dawnbreaker',
    id: '14971',
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
      .map((item) => `${item.classSpec} ${item.roleClass}`)
      .join(',');
    console.log(`以下专精的最佳副属性为空：${emptyBestStats}`);
    sendResponse(collectStatData);
  }
}

//#endregion

//#region 装备
let itemToSearch;
let itemDoneCount = 0;
function getItemUrl(id) {
  return `https://www.wowhead.com/cn/item=${id}`;
}
function handleToNextItem(request, _sender, sendResponse) {
  if (itemToSearch.length) {
    const item = itemToSearch.shift();
    itemDoneCount++;
    console.log(
      `当前SPELL进度: ${itemDoneCount} / ${
        itemToSearch.length + itemDoneCount
      }  ${JSON.stringify(item)}`
    );
    handleJump({ currentTab: _sender.tab }, getItemUrl(item.id));
  }
}
//#endregion
