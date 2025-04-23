console.log('BIS CONTENT 注入');

// Collect data
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'BIS') {
    const data = await getData();
    chrome.runtime.sendMessage(
      {
        action: 'save',
        currentTab: { url: window.location.href },
        data,
      },
      (res) => {
        console.log(res);
        sendResponse(data);
        chrome.runtime.sendMessage({ action: 'queryConfig' }, (config) => {
          if (config.autoJump) {
            jumpCountDown(config.jumpInterval);
          }
        });

        return true;
      }
    );
  }
});

updateSpec();
checkAutoCollect();

//#region collecting data
async function getData() {
  const overall = await getBisItem('#overall-bis');

  // TODO: #bis-from-content-from-raid 奶僧 踏风 神圣 及其他发现的异常数据清洗
  const bisItemRaid = await getBisItem('#tab-bis-items-raid');

  const bisItemMythic = await getBisItem('#tab-bis-items-mythic');
  const data = {
    collectedAt: new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    updatedAt: document.querySelector('.date-tip')?.innerText,
    overall,
    bisItemRaid,
    bisItemMythic,
    trinkets: getTrinketsRank(),
    advice: getChipAdivce(),
  };
  return data;
}

function getChipAdivce() {
  const container = document.querySelector('#puzzling-cartel-chips');
  let olEle = container.nextSibling;
  while (olEle.tagName !== 'OL') {
    olEle = olEle.nextSibling;
  }
  return Array.from(olEle.childNodes)
    .map((liEle) => {
      const href = liEle.querySelector('a[data-type=item]')?.href ?? '';
      return Number(
        href
          .split('/')
          .find((item) => item.includes('item='))
          ?.split('=')
          .pop()
      );
    })
    .filter((item) => item);
}

function getSlotLabel(key) {
  const lowerCaseKey = key.toLowerCase();
  const locales = {
    head: '头部',
    helm: '头部',
    neck: '颈部',
    shoulders: '肩部',
    shoulder: '肩部',
    cloak: '披风',
    back: '披风',
    chest: '胸甲',
    wrist: '手腕',
    gloves: '手套',
    hands: '手套',
    waist: '腰带',
    belt: '腰带',
    legs: '腿部',
    boots: '脚部',
    feets: '脚部',
    feet: '脚部',
    ['alt (aoe)']: '饰品',
    ['alt (single)']: '饰品',
    weapon: '武器',
    shield: '盾牌',
    ['main hand']: '主手',
    ['main-hand']: '主手',
    ['off hand']: '副手',
    ['off-hand']: '副手',
    offhand: '副手',
  };

  if (locales[lowerCaseKey]?.length) {
    return locales[lowerCaseKey];
  }

  if (lowerCaseKey.includes('trinket')) {
    return '饰品';
  }

  if (lowerCaseKey.includes('ring') || lowerCaseKey.includes('finger')) {
    return '戒指';
  }

  return key;
}
const dungeonNameCache = {};
async function getSourceLabel(input) {
  let source = input
    .replace(/[\|\/\(\)]/g, '')
    .replace(',,', '')
    .trim();
  if (!source) {
    return { source: '/', isLoot: false };
  }
  if (
    ['crafting', 'leatherworking', 'blacksmithing', 'crafted'].includes(
      source.toLowerCase()
    )
  ) {
    return { source: '制造装备', isLoot: false };
  }

  if (source.toLowerCase().includes('catalyst')) {
    return { source: '职业套装', isLoot: false };
  }

  if (source.toLowerCase().includes('trash')) {
    return { source: '团本小怪', isLoot: false };
  }

  if (source.toLowerCase().includes('siren')) {
    return { source: '海妖岛', isLoot: false };
  }
  if (source.toLowerCase().includes('delves')) {
    return { source: '地下堡', isLoot: false };
  }

  if (!isIncludeChineseText(source) || source.includes('解放安德麦')) {
    if (dungeonNameCache[source]) {
      source = dungeonNameCache[source];
    } else {
      const nameZH = await G_API.queryDungeonByName(source);
      dungeonNameCache[source] = nameZH;
      source = nameZH;
    }
  }

  return { source, isLoot: true };
}
function getItemIdByURL(url) {
  const id = url
    .split('/')
    .find((item) => item.includes('item='))
    ?.split('item=')[1]
    .split('?')
    .shift();
  return isNaN(Number(id)) ? null : Number(id);
}

function isIncludeChineseText(text) {
  return /[\u4e00-\u9fa5]/.test(text);
}

const translateLimiter = new Bottleneck({
  // 百度翻译的API 只支持 10QPS
  // minTime: 200,

  maxConcurrent: 100,
});
async function getBisItem(containerId) {
  let itemDoms;
  if (containerId === '#overall-bis') {
    const overallBIS = document.querySelector('#guide-body tbody');
    itemDoms = overallBIS.querySelectorAll('tr');
  } else {
    itemDoms = document.querySelectorAll(`${containerId} tbody tr`);
    if (!itemDoms.length) {
      let replaceSelector;
      if (containerId.includes('raid')) {
        replaceSelector = '#tab-bis-from-content-from-raid';
      } else if (containerId.includes('mythic')) {
        replaceSelector = '#tab-bis-from-content-from-mythic';
      } else {
        console.error(`Invalid selector: ${containerId}`);
      }
      itemDoms = document.querySelectorAll(`${replaceSelector} tbody tr`);
    }
  }

  // 去除第一个列头的行
  const domArray = Array.from(itemDoms);
  domArray.shift();

  async function mapItemInfo(dom) {
    const tds = dom.querySelectorAll('td');
    let itemId;
    const columns = Array.from(tds).reduce((pre, cur, index) => {
      if (index === 1 && cur.querySelector('a')) {
        itemId = getItemIdByURL(cur.querySelector('a').href);
        pre.push(cur.querySelector('a').innerText);
      } else {
        pre.push(cur.innerText);
      }
      return pre;
    }, []);

    const fullImageURL = dom.querySelector('img')?.src;
    const itemIcon = dom.querySelector('img')?.src?.split('/').pop() ?? '';

    // PTR初期只有英文装备名称，需要翻译
    let itemName = columns[1].trim();
    // if (!isIncludeChineseText(itemName)) {
    //   try {
    //     itemName = await G_API.translateByBaidu(itemName);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }

    // PTR初期只有英文副本名称，需要翻译
    const source = await getSourceLabel(columns[2]);

    return {
      slot: getSlotLabel(columns[0]),
      item: itemName,
      source,
      id: itemId,
      itemIcon,
      fullImageURL,
    };
  }
  const promises = domArray.map((dom) => mapItemInfo(dom));

  const results = await Promise.allSettled(promises);
  return results.map((result) => result.value);
}

function getStatPriority() {
  const possibleStats = document.querySelectorAll('#guide-body b');
  if (possibleStats?.length) {
    // return Array.from(possibleStats).find((item) =>
    //   item.innerText.toLowerCase().includes("mastery")
    // )?.innerText;

    return Array.from(possibleStats).reduce((pre, cur) => {
      const text = cur.innerText.toLowerCase();
      if (
        pre.includes('haste') &&
        pre.includes('crit') &&
        pre.includes('versatility') &&
        pre.includes('mastery') &&
        pre.length
      ) {
        return pre;
      }

      if (
        text.includes('haste') ||
        text.includes('crit') ||
        text.includes('versatility') ||
        text.includes('mastery')
      ) {
        pre += ` ${text}`;
        return pre;
      }
      return pre;
    }, '');
  }
  return '/';
}

function getImageFileName(url) {
  const regex = /url\("([^"]*)"\)/;
  const path = url.match(regex)?.[1];
  if (path?.length) {
    return path.split('/').pop() ?? '';
  }
  return '';
}
function getTrinketsRank() {
  const lists = document.querySelectorAll('.tier-list-rows .tier-list-tier');
  if (lists?.length) {
    return Array.from(lists).map((list) => {
      const tierLabel = list.querySelector('.tier-label')?.innerText;
      const url = Array.from(list.querySelectorAll('.tier-content a'));
      const trinkets = list.querySelectorAll('.tier-content ins');
      return {
        label: tierLabel,
        trinkets: Array.from(trinkets).map((item, index) => ({
          id: getItemIdByURL(url[index].href),
          image: getImageFileName(item.style.backgroundImage),
          fullImageURL:
            item.style.backgroundImage.match(/url\("([^"]*)"\)/)?.[1],
        })),
      };
    });
  }
  return [];
}
//#endregion

//#region auto jump
function checkAutoCollect() {
  chrome.runtime.sendMessage({ action: 'queryConfig' }, async (config) => {
    if (config.autoJump) {
      const currentTab = { url: window.location.href };
      const data = await getData();
      chrome.runtime.sendMessage(
        { action: 'save', currentTab, data },
        (res) => {
          jumpCountDown(config.jumpInterval);
        }
      );
      return true;
    }
  });
}

let restTime;
let intervalTimer;
const UPDATE_PER_TIME = 100;
function jumpCountDown(time) {
  restTime = time;
  setTimeout(() => {
    intervalTimer = null;
    if (countDownBox) {
      countDownBox.classList.add('hide');
    }

    chrome.runtime.sendMessage(
      {
        action: 'jump',
        currentTab: { url: window.location.href },
      },
      (res) => {
        console.log(res);
      }
    );
  }, time);
  intervalTimer = setInterval(() => {
    updateCountDownBox({
      leftTime: (restTime -= UPDATE_PER_TIME),
      total: totalSpecCount,
      current: collectedSpecCount,
    });
    if (restTime <= 0) {
      intervalTimer = null;
    }
  }, UPDATE_PER_TIME);
}

let countDownBox;
let msgElement;
let totalTextElement;
let currentProgressElement;

let totalSpecCount;
let collectedSpecCount;
function updateCountDownBox(params) {
  const { leftTime, total, current } = params;
  if (countDownBox && leftTime <= 0) {
    countDownBox.style.display = 'none';
  }
  if (!countDownBox) {
    countDownBox = document.createElement('div');
    countDownBox.classList.add('count-down-container');

    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-container');
    currentProgressElement = document.createElement('div');
    progressBar.appendChild(currentProgressElement);
    totalTextElement = document.createElement('span');
    progressBar.appendChild(totalTextElement);

    const title = document.createElement('h4');
    title.innerText = 'Auto Collecting...';
    countDownBox.appendChild(title);
    countDownBox.appendChild(progressBar);
    msgElement = document.createElement('p');
    countDownBox.appendChild(msgElement);

    document.body.append(countDownBox);
  }
  countDownBox.classList.remove('hide');
  msgElement.innerText = `Collecting succeeded. Going to the next spec in ${(
    leftTime / 1000
  ).toFixed(1)} seconds.`;
  totalTextElement.innerText = total;
  currentProgressElement.innerText = current;
  currentProgressElement.style.width = `${((current / total) * 100).toFixed(
    2
  )}%`;
}

function updateSpec() {
  chrome.runtime.sendMessage({ action: 'querySpecs' }, (specs) => {
    collectionInfo = specs;
    const { total, collected } = specs;
    totalSpecCount = Object.values(total).reduce((pre, cur) => {
      pre += cur.length;
      return pre;
    }, 0);
    collectedSpecCount = collected.length;
    console.log('Received from background:', { total, collected });
  });
}
//#endregion
