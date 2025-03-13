chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'item.get') {
    const data = await G_API.queryBlankSourceItem();
    chrome.runtime.sendMessage({
      action: 'saveItemToSearch',
      data,
    });
    return true;
  }
});

async function tryCollectData() {
  chrome.runtime.sendMessage(
    { action: 'getItemsToSearch' },
    async (itemsToSearch) => {
      // 初始化前， itemsToSearch为null，避免初始化前就触发
      if (itemsToSearch) {
        let response;
        let data;
        let error = null;
        try {
          data = getItemData();
          response = await G_API.queryUpdateItem({
            id: getIdByUrl(location.href),
            source: data,
          });
        } catch (e) {
          error = e;
        } finally {
          chrome.runtime.sendMessage({
            action: 'toNextItem',
            isSuccess: response?.status === 200,
            data,
            error,
          });
        }
      }
    }
  );
}
tryCollectData();

function getIdByUrl(url) {
  let id;
  const array = url.split('/');
  array.find((item) => {
    if (item.includes('item')) {
      id = item.split('=')[1];
    }
  });
  return id;
}

function getItemData() {
  const sourceType = document.querySelector('.tabs-container .tabs li a')?.href;
  if (sourceType.includes('drop')) {
    const row = document.querySelector('#tab-dropped-by tbody tr');
    return {
      source: `${row.children[2]?.querySelector('a')?.innerText}(${
        row.children[0]?.innerText
      })`,
      isLoot: true,
    };
  }
  if (sourceType.includes('created')) {
    return {
      source: '制造装备',
      isLoot: false,
    };
  }

  if (sourceType.includes('contained')) {
    return {
      source: '地下堡',
      isLoot: false,
    };
  }

  return null;
}
