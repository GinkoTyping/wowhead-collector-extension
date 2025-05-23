let config = {};

const collectDataBtn = document.querySelector('#collect');
collectDataBtn.onclick = function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isValidURL = checkValidURL(currentTab.url);
    if (isValidURL) {
      chrome.runtime.sendMessage(
        { action: 'updateWindowId', windowId: currentTab.windowId },
        (res) => {
          console.log(res);
        }
      );

      if (hasCollectedCurrentSpec) {
        chrome.runtime.sendMessage({ action: 'jump', currentTab }, (res) => {
          console.log(res);
        });
      } else {
        chrome.tabs.sendMessage(
          currentTab.id,
          { action: 'BIS' },
          (response) => {
            updatePopupView();
          }
        );
      }
    } else {
      if (confirm('Not in the BIS page, comfirm to redirect to BIS page.')) {
        const [classKey, specKey] = getSpecInfo(currentTab.url);
        chrome.tabs.create({
          url: `https://www.wowhead.com/guide/classes/${classKey}/${specKey}/bis-gear`,
        });
      }
    }
  });
};
function checkValidURL(url) {
  const regex = /^https:\/\/www\.wowhead\.com\/cn\/guide\/classes.*\/bis-gear$/;
  return regex.test(url);
}

const exportDataBtn = document.querySelector('#export');
exportDataBtn.onclick = function () {
  chrome.runtime.sendMessage({ action: 'export' }, (data) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    // TODO: Maybe using local server to write files.
    saveAs(blob, 'spec-data.json');

    function getItemImageURLs(data) {
      return Object.values(data).reduce(
        (pre, cur) => {
          cur.forEach((spec) => {
            ['overall', 'bisItemRaid', 'bisItemMythic'].forEach((bisType) => {
              pre.items.push(
                ...spec[bisType]
                  .filter((item) => item?.fullImageURL)
                  .map((item) => item.fullImageURL)
              );
            });
            pre.trinkets.push(
              ...spec.trinkets.reduce((output, tier) => {
                output.push(
                  ...tier.trinkets
                    .filter((item) => item?.fullImageURL)
                    .map((item) => item.fullImageURL)
                );
                return output;
              }, [])
            );
          });

          return pre;
        },
        { items: [], trinkets: [] }
      );
    }
    const { items, trinkets } = getItemImageURLs(data);

    // popup.html 中引入
    downloadAsZip(items, 'items');
    downloadAsZip(trinkets, 'trinkets');
  });
};

const autoJumpCheckbox = document.querySelector('#auto-jump');
autoJumpCheckbox.onclick = function () {
  config.autoJump = autoJumpCheckbox.checked;
  chrome.runtime.sendMessage(
    { action: 'updateConfig', value: { autoJump: autoJumpCheckbox.checked } },
    (res) => {
      console.log(res);
    }
  );
};

const overrideChechbox = document.querySelector('#is-override');
overrideChechbox.onclick = function () {
  config.isOverride = overrideChechbox.checked;
  chrome.runtime.sendMessage(
    { action: 'updateConfig', value: { isOverride: overrideChechbox.checked } },
    (res) => {
      console.log(res);
    }
  );
};

const displayCheckbox = document.querySelector('#display-mode');
displayCheckbox.addEventListener('click', (e) => {
  config.displayDetail = displayCheckbox.checked;
  chrome.runtime.sendMessage(
    {
      action: 'updateConfig',
      value: { displayDetail: displayCheckbox.checked },
    },
    (res) => {
      // the size of the popup window changes, need to reload page.
      window.location.reload();
    }
  );
});
function updateUIBydisplayDetail() {
  displayCheckbox.checked = config.displayDetail;
  if (config.displayDetail) {
    specsContainer?.classList.remove('hide');
    specsSimpleContainer?.classList.add('hide');
  } else {
    specsSimpleContainer?.classList.remove('hide');
    specsContainer?.classList.add('hide');
  }
}

//#region Show realtime collected specs status;
let specsContainer;
let specsSimpleContainer;
let collectionInfo;
let hasCollectedCurrentSpec;
const COLLECTED_TEXT = 'Collected. Next';
const NOT_COLLECTED_TEXT = 'Collecte BIS Data';
function insertBisDom(total, collected) {
  specsContainer = specsContainer ?? document.querySelector('.specs');
  specsSimpleContainer =
    specsSimpleContainer ?? document.querySelector('.specs-simple');
  specsContainer.innerHTML = '';
  specsSimpleContainer.innerHTML = '';
  const classNames = Object.keys(total);
  classNames.forEach((classKey) => {
    insertSpecSimple(classKey, total[classKey], collected);
    insertSpec(classKey, total[classKey], collected);
  });
}

function insertSpec(classKey, specs, collected) {
  const container = document.createElement('div');
  container.classList.add(classKey);
  container.classList.add('class-specs');

  const classTitle = document.createElement('p');
  classTitle.innerText = classKey;

  const specContainer = document.createElement('div');
  specs.forEach((specKey) => {
    const span = document.createElement('span');
    span.innerText = specKey;
    if (collected.includes(`${classKey}_${specKey}`)) {
      span.classList.add('collected');
    }
    specContainer.appendChild(span);
  });

  container.appendChild(classTitle);
  container.appendChild(specContainer);
  specsContainer.appendChild(container);
}

function insertSpecSimple(classKey, specs, collected) {
  const container = document.createElement('div');
  container.classList.add(classKey);
  container.classList.add('class-specs');

  const classTitle = document.createElement('p');
  classTitle.innerText = classKey;

  const specContainer = document.createElement('div');
  specs.forEach((specKey) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = specKey;
    checkbox.title = specKey;

    if (collected.includes(`${classKey}_${specKey}`)) {
      checkbox.checked = true;
    }
    specContainer.appendChild(checkbox);
  });

  container.appendChild(classTitle);
  container.appendChild(specContainer);
  specsSimpleContainer.appendChild(container);
}

function getSpecInfo(url) {
  const output = url
    .replace('https://www.wowhead.com/guide/classes/', '')
    .replace(/([^/]+)$/, '')
    .split('/');
  if (output) {
    output.pop();
    return output;
  }
  return '';
}
function checkHasCollect() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const [classKey, specKey] = getSpecInfo(currentTab.url);
    hasCollectedCurrentSpec = collectionInfo.collected.includes(
      `${classKey}_${specKey}`
    );
    collectDataBtn.innerText = hasCollectedCurrentSpec
      ? COLLECTED_TEXT
      : NOT_COLLECTED_TEXT;
    collectDataBtn.classList[hasCollectedCurrentSpec ? 'add' : 'remove']('off');
  });
}
function updatePopupView() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs[0].url);
    if (tabs[0].url.includes('www.wowhead.com/cn/spell')) {
      insertSpellDom();
    } else if (
      tabs[0].url.includes('www.wowhead.com/cn/guide') &&
      tabs[0].url.includes('bis-gear')
    ) {
      chrome.runtime.sendMessage({ action: 'querySpecs' }, (specs) => {
        collectionInfo = specs;
        const { total, collected } = specs;
        console.log('Received from background:', { total, collected });
        insertBisDom(total, collected);
        updateConfig();
        checkHasCollect();
      });
    } else if (tabs[0].url.includes('www.icy-veins.com/wow')) {
      insertGetTierList();
    } else if (tabs[0].url.includes('www.wowhead.com/npcs')) {
      insertGetNPCButton();
    } else if (tabs[0].url.includes('www.wowhead.com/cn/npc')) {
      insertTranslateNpcButton();
    } else if (
      tabs[0].url.includes('www.wowhead.com/cn/guide') &&
      tabs[0].url.includes('stat-priority')
    ) {
      insertGetStatButton();
    } else if (tabs[0].url.includes('www.wowhead.com/cn/item')) {
      insertGetItemButton();
    }
  });
}
//#endregion

//#region Set gloable setting from service_worker
function updateConfig() {
  chrome.runtime.sendMessage({ action: 'queryConfig' }, updateUIByConfig);
}
function updateUIByConfig(response) {
  config = response;

  autoJumpCheckbox.checked = config.autoJump;
  overrideChechbox.checked = config.isOverride;
  updateUIBydisplayDetail();
}
//#endregion

//#region spell相关
let collectSpellBtn;
function insertSpellDom() {
  collectSpellBtn = document.createElement('button');
  collectSpellBtn.id = 'collect-spell';
  collectSpellBtn.innerText = 'Collect Spell';
  document.querySelector('.content').append(collectSpellBtn);
  collectSpellBtn.onclick = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: 'updateWindowId',
        windowId: tabs[0].windowId,
      });
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'querySpells' },
        (data) => {}
      );
    });
  };
}
//#endregion

//#region icy-iven 排名
let colletTierListBtn;
function insertGetTierList() {
  colletTierListBtn = document.createElement('button');
  colletTierListBtn.id = 'collect-tier-list';
  colletTierListBtn.innerText = 'Collect Tier List';
  document.querySelector('.content').append(colletTierListBtn);
  colletTierListBtn.onclick = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: 'updateWindowId',
        windowId: tabs[0].windowId,
      });
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'collectTierList' },
        (data) => {}
      );
    });
  };
}
//#endregion

//#region NPCs 名称 ID
let collectNPCButton;
function insertGetNPCButton() {
  collectNPCButton = document.createElement('button');
  collectNPCButton.id = 'collect-npc';
  collectNPCButton.innerText = '获取NPC';
  document.querySelector('.content').append(collectNPCButton);
  collectNPCButton.onclick = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: 'updateWindowId',
        windowId: tabs[0].windowId,
      });
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'npc.collect' },
        (data) => {}
      );
    });
  };
}
let translateNpcButton;
function insertTranslateNpcButton() {
  translateNpcButton = document.createElement('button');
  translateNpcButton.id = 'collect-npc';
  translateNpcButton.innerText = '翻译NPC';
  document.querySelector('.content').append(translateNpcButton);
  translateNpcButton.onclick = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: 'updateWindowId',
        windowId: tabs[0].windowId,
      });
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'npc.translate' },
        (data) => {}
      );
    });
  };
}
//#endregion

//#region 获取BIS属性
let getStatButton;
function insertGetStatButton() {
  getStatButton = document.createElement('button');
  getStatButton.id = 'collect-stat';
  getStatButton.innerText = '获取属性优先级';
  document.querySelector('.content').append(getStatButton);
  getStatButton.onclick = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: 'updateWindowId',
        windowId: tabs[0].windowId,
      });
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stat.get' }, (data) => {});
    });
  };
}
//#endregion

//#region 装备物品
let getItemButton;
function insertGetItemButton() {
  getItemButton = document.createElement('button');
  getItemButton.id = 'collect-stat';
  getItemButton.innerText = '获取装备信息';
  document.querySelector('.content').append(getItemButton);
  getItemButton.onclick = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({
        action: 'updateWindowId',
        windowId: tabs[0].windowId,
      });
      chrome.tabs.sendMessage(tabs[0].id, { action: 'item.get' }, (data) => {});
    });
  };
}
//#endregion
updatePopupView();
