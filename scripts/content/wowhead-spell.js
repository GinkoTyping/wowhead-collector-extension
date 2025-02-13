chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'querySpells') {
    const response = await fetch('http://localhost:3000/api/wow/spell/blank');
    const data = await response.json();
    chrome.runtime.sendMessage({
      action: 'passSpellData',
      data,
    });
    return true;
  }
});

async function tryCollectData() {
  chrome.runtime.sendMessage(
    { action: 'getSpellsToSearch' },
    async (spellsToSearch) => {
      if (spellsToSearch?.length) {
        let response;
        try {
          const spellData = getSpellData();
          response = await fetch('http://localhost:3000/api/wow/spell/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(spellData),
          });
        } catch (error) {
        } finally {
          chrome.runtime.sendMessage({
            action: 'toNextSpell',
            isSuccess: response?.status === 200,
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
    if (item.includes('spell')) {
      id = item.split('=')[1];
    }
  });
  return id;
}
function getSpellData() {
  const id = Number(getIdByUrl(location.href));
  const container = document.querySelector('.wowhead-tooltip');
  const nameZH = container.querySelector('b.whtt-name').innerText;
  const description = container.querySelector('.q').innerText.replaceAll(' sec', '秒');

  let cost;
  let range;
  let castTime;
  let cooldown;
  const detailContainer = document.querySelector('#spelldetails');
  const trs = detailContainer.querySelectorAll('tr');
  Array.from(trs).forEach((item) => {
    const title = item.querySelector('th')?.innerText;
    const value = item.querySelector('td')?.innerText;
    if (title) {
      switch (title) {
        case '成本':
          cost = value.replace(' 值', '');
          break;
        case '范围':
          range = value;
          break;
        case '施法时间':
          castTime = value;
          break;
        case '冷却':
          cooldown = value;
          break;

        default:
          break;
      }
    } else {
    }
  });

  return {
    id,
    nameZH,
    description,
    cost,
    range,
    castTime,
    cooldown,
  };
}
