// Remove ads
const adList = [
  '.main .blocks',
  '.pbs__player',
  '#page-content .sidebar-wrapper',
  '#video-pos-body',
];
adList.forEach((ad) => {
  const dom = document.querySelector(ad);
  if (dom) {
    dom.style.display = 'none';
  }
});

document.querySelector('#page-content').style.paddingRight = 0;

// Collect data
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action == 'BIS') {
    const data = getData();
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
      }
    );
  }
});

updateSpec();
checkAutoCollect();

//#region collecting data
function getData() {
  console.log(getStatPriority());
  return {
    collectedAt: new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    statsPriority: getStatPriority()?.trim(),
    overall: getBisItem('#overall-bis'),
    bisItemRaid: getBisItem('#tab-bis-items-raid'),
    bisItemMythic: getBisItem('#tab-bis-items-mythic'),
    trinkets: getTrinketsRank(),
  };
}

function getSlotLabel(key) {
  const lowerCaseKey = key.toLowerCase();
  const locales = {
    head: '头部',
    neck: '颈部',
    shoulders: '肩部',
    cloak: '披风',
    chest: '胸甲',
    wrist: '手腕',
    gloves: '手套',
    belt: '腰带',
    legs: '腿部',
    boots: '脚部',
    ['alt (aoe)']: '饰品',
    ['alt (single)']: '饰品',
    weapon: '武器',
    ['main hand']: '主手',
    ['off hand']: '副手',
    offhand: '副手',
  };

  if (locales[lowerCaseKey]?.length) {
    return locales[lowerCaseKey];
  }

  if (lowerCaseKey.includes('trinket')) {
    return '饰品';
  }

  if (lowerCaseKey.includes('ring')) {
    return '戒指';
  }

  return key;
}
function getSourceLabel(source) {
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

  const output = source.replace(/[\|\/\(\)]/g, '');
  return { source: output.replace(',,', ''), isLoot: true };
}
function getItemIdByURL(url) {
  const id = url
    .split('/')
    .find((item) => item.includes('item='))
    ?.split('item=')[1];
  return isNaN(Number(id)) ? null : Number(id);
}
function getBisItem(containerId) {
  let itemDoms;
  if (containerId === '#overall-bis') {
    const overallBIS = document.querySelector('#guide-body tbody');
    itemDoms = overallBIS.querySelectorAll('tr');
  } else {
    itemDoms = document.querySelectorAll(`${containerId} tbody tr`);
  }

  // 去除第一个列头的行
  const domArray = Array.from(itemDoms);
  domArray.shift();

  return domArray.map((dom) => {
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

    const itemIcon = dom.querySelector('img')?.src?.split('/').pop() ?? '';
    return {
      slot: getSlotLabel(columns[0]),
      item: columns[1].trim(),
      source: getSourceLabel(columns[2]),
      id: itemId,
      itemIcon,
    };
  });
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
        })),
      };
    });
  }
  return [];
}
//#endregion

//#region auto jump
function checkAutoCollect() {
  chrome.runtime.sendMessage({ action: 'queryConfig' }, (config) => {
    if (config.autoJump) {
      const currentTab = { url: window.location.href };
      chrome.runtime.sendMessage(
        { action: 'save', currentTab, data: getData() },
        (res) => {
          jumpCountDown(config.jumpInterval);
        }
      );
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
