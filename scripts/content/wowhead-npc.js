function getDungeonId() {
  const arr = location.href.split(';');
  arr.pop();
  return arr.pop();
}
function getDunegonName(id) {
  const selectEle = document.querySelector('select[name="filter-select"]');
  const selectedOption = Array.from(selectEle.options).find(
    (item) => item.value === id
  );
  return selectedOption.label;
}
function getNpcType(key) {
  const output = {
    'Wild Pet': '野生宠物',
    'Non-combat Pet': '非战斗宠物',
    Totem: '图腾',
    Beast: '野兽',
    Dragonkin: '龙类',
    Demon: '恶魔',
    Elemental: '元素生物',
    Giant: '巨人',
    Undead: '亡灵',
    Humanoid: '人型生物',
    Critter: '小动物',
    Mechanical: '机械',
    'Not specified': '未指定',
    'Gas Cloud': '气体云雾',
    Aberration: '畸变怪',
  };
  return output[key];
}
function collectTable(dungeonName) {
  const rows = document.querySelectorAll('#lv-npcs tbody tr');
  return Array.from(rows).reduce((pre, cur) => {
    const location = cur.children[2].innerText;
    if (location === dungeonName) {
      const nameEle = cur.children[0].querySelector('a');
      const name = nameEle.innerText;
      const id = nameEle.href.split('npc=').pop().split('/').shift();
      const type = getNpcType(cur.children[4].innerText);
      pre.push({ name, id, location: dungeonName, type });
    }
    return pre;
  }, []);
}
async function updateNpcInDb(npc) {
  try {
    const res = await G_API.queryNpcById(npc.id);
    await G_API.queryAddOrUpdateNpc(npc, res.status === 200);
    return true;
  } catch (error) {
    return false;
  }
}
async function collect() {
  const dungeonId = getDungeonId();
  const dungeonName = getDunegonName(dungeonId);

  const npcs = collectTable(dungeonName);
  await Promise.allSettled(npcs.map((item) => updateNpcInDb(item)));
  console.log({ npcs });
}
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'npc.collect') {
    await collect();
    chrome.runtime.sendMessage({
      action: 'content_to-next-npc-dungeon',
    });
    return true;
  }
});

chrome.runtime.sendMessage(
  { action: 'content_allow-collect-npc' },
  async (isAllow) => {
    if (isAllow) {
      await collect();
      chrome.runtime.sendMessage({
        action: 'content_to-next-npc-dungeon',
      });
    }
  }
);

function getNpcId() {
  return location.href.split('npc=').pop().split('/').shift();
}
async function getNpcToTranslate() {
  const res = await fetch('http://localhost:3000/api/wow/npc/translate');
  const data = await res.json();
  return data;
}
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'npc.translate') {
    const data = await getNpcToTranslate();
    chrome.runtime.sendMessage({
      action: 'saveNpcToSearch',
      data,
    });
    return true;
  }
});

async function translate() {
  chrome.runtime.sendMessage(
    { action: 'content_allow-translate-npc' },
    async (isAllow) => {
      if (isAllow) {
        let isSuccess;
        try {
          const name = document.querySelector('.heading-size-1').innerText;
          const id = getNpcId();
          isSuccess = await updateNpcInDb({ id, name_zh: name });
        } catch (error) {
          console.log(error);
        } finally {
          chrome.runtime.sendMessage({
            action: 'content_to-next-npc',
            isSuccess,
          });
        }
      }
    }
  );
}
translate();
