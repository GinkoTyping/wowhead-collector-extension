const G_API = {
  translateByBaidu,
  queryDungeonByName,
  queryUpdateSpell,
  queryBlankSpell,
  queryNpcById,
  queryAddOrUpdateNpc,
};
async function translateByBaidu(text) {
  try {
    const res = await fetch('https://ginkolearn.cyou/api/common/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/JSON',
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.log(error);
    return text;
  }
}

const raidBossMap = {
  'vexie': '维克茜和磨轮',
  'cauldron': '血腥大熔炉',
  'reverb': '里克·混响',
  'stix': '斯提克斯·堆渣',
  'sprocketmonger': '链齿狂人洛肯斯多',
  'bandit': '独臂盗匪',
  'mug': '穆格·兹伊，安保头子',
  'chrome': '铬武大王加里维克斯',
}
function mapRaidBossName(name) {
  let lowerCaseName = name.toLowerCase();
  let bossName = `${name}(团本)`
  Object.keys(raidBossMap).some(key => {
    if (lowerCaseName.includes(key)) {
      bossName = raidBossMap[key];
    }
  })
  return bossName;
}

async function queryDungeonByName(nameEN) {
  try {
    const res = await fetch('http://localhost:3000/api/wow/dungeon/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/JSON',
      },
      body: JSON.stringify({ nameEN }),
    });
    if (res) {
      const data = await res.json();
      return data.name_zh;
    } else if (nameEN === 'Operation: Floodgate') {
      return '水闸行动';
    } else {
      return mapRaidBossName(nameEN);
    }
  } catch (error) {
    console.log(error);
    if (nameEN === 'Operation: Floodgate') {
      return '水闸行动';
    } else if (nameEN === 'Operation: Mechagon Workshop') {
      return '麦卡贡车间';
    } else {
      return mapRaidBossName(nameEN);
    }
  }
}

async function queryUpdateSpell(spellData) {
  return fetch('http://localhost:3000/api/wow/spell/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GINKO_AUTH_TOKEN}`,
    },
    body: JSON.stringify(spellData),
  });
}

async function queryBlankSpell() {
  const response = await fetch('http://localhost:3000/api/wow/spell/blank');
  const data = await response.json();
  return data;
}

async function queryNpcById(id) {
  return fetch(`http://localhost:3000/api/wow/npc/${id}`);
}

async function queryAddOrUpdateNpc(npc, isUpdate) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/JSON',
      Authorization: `Bearer ${GINKO_AUTH_TOKEN}`,
    },
    body: JSON.stringify({ ...npc, name_en: npc.name }),
  };
  return fetch(
    `http://localhost:3000/api/wow/npc/${isUpdate ? 'update' : 'add'}`,
    options
  );
}
