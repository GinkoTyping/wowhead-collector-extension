let archonHash = ''
window.addEventListener('__archon_hash__', (e) => {
  archonHash = e.detail;
  console.log('✅ 捕获到 pathHash：', archonHash);
});

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action === 'get-archon') {
    // 更新专精排行
    await updateTierList()

    return true
    // 更新专精BIS
    await updateSpecList()

    return true;
  }
});

// limit.js —— 零依赖并发控制
function pLimit(concurrency) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const { fn, resolve, reject } = queue.shift();
      run(fn, resolve, reject);
    }
  };

  const run = (fn, resolve, reject) => {
    activeCount++;
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(next);
  };

  return function (fn, ...args) {
    return new Promise((resolve, reject) => {
      if (activeCount < concurrency) {
        run(fn, resolve, reject);
      } else {
        queue.push({ fn: () => fn(...args), resolve, reject });
      }
    });
  };
}
const limit = pLimit(1);

async function queryEachSpec(classSpec, roleClass) {
  const [statsData,
    raidStatsData,
    gearData,
    talentsData] = (await Promise.allSettled([
    queryArchon('overview', classSpec, roleClass),
    queryArchon('overview', classSpec, roleClass, 'raid'),
    queryArchon('gear-and-tier-set', classSpec, roleClass),
    queryArchon('talents', classSpec, roleClass)
  ])).map(item => item.status === 'fulfilled' ? item.value : {})

  return {
    classSpec,
    roleClass,

    data: {
      statsData,
      raidStatsData,
      gearData,
      talentsData,
    }
  };
}

async function queryArchon(category, classSpec, roleClass, zoneType = 'mythic-plus') {
  const url = zoneType === 'mythic-plus'
    ? `https://www.archon.gg/_next/data/${archonHash}/wow/builds/${classSpec}/${roleClass}/mythic-plus/${category}/10/all-dungeons/this-week.json?gameSlug=wow&specSlug=${classSpec}&classSlug=${roleClass}&zoneTypeSlug=mythic-plus&categorySlug=${category}&difficultySlug=10&encounterSlug=all-dungeons&affixesSlug=this-week`
    : `https://www.archon.gg/_next/data/${archonHash}/wow/builds/${classSpec}/${roleClass}/raid/${category}/mythic/all-bosses.json?gameSlug=wow&specSlug=${classSpec}&classSlug=${roleClass}&zoneTypeSlug=raid&categorySlug=${category}&difficultySlug=mythic&encounterSlug=all-bosses`;

  const res = await fetch(url, {
    "body": null,
    "method": "GET"
  })
  const data = await res.json()
  return data?.pageProps?.page
}

async function queryArchonTierList() {
  const types = ['dps', 'tank', 'healer'];

  const results = [];
  for (const type of types) {
    const url = `https://www.archon.gg/_next/data/${archonHash}/wow/tier-list/${type}-rankings/mythic-plus/10/all-dungeons/this-week.json?gameSlug=wow&rankingsSlug=dps-rankings&zoneTypeSlug=mythic-plus&difficultySlug=10&encounterSlug=all-dungeons&affixesSlug=this-week`;
    const res = await fetch(url, {
      "body": null,
      "method": "GET"
    })
    const data = await res.json()

    const tierData = data?.pageProps?.page?.specTierListSection?.tierLists?.[0]?.tiers?.map(tierItem => ({
      tier: tierItem.tier,
      children: tierItem?.entries?.[0]?.map(item => {
        let roleClass = item.name.split(' ').pop()?.toLowerCase();
        let classSpec = item.name.split(' ').shift()?.toLowerCase();

        if (classSpec === 'beastmastery') {
          classSpec = 'beast-mastery';
          roleClass = 'hunter';
        } else if (roleClass === 'deathknight') {
          roleClass = 'death-knight';
        } else if (roleClass === 'demonhunter') {
          roleClass = 'demon-hunter';
        }

        return {
          roleClass,
          classSpec,
          fullNameEN: `${classSpec} ${roleClass}`,
          fullNameZH: `${classLocale[roleClass][classSpec]} ${classLocale.class[roleClass]}`,
          value: item.value,
        };
      }),
    }));
    const lastUpdated = data?.pageProps?.page.lastUpdated;
    results.push({
      versionId: '12.0',
      activityType: 'MYTHIC',
      createdAt: lastUpdated ? formatDate(new Date(lastUpdated).getTime()) : formatDate(Date.now() - 24 * 60 * 60 * 1000),
      role: type.toUpperCase(),
      tierData,
    });
  }

  return results;
}

async function updateTierList() {
  const tierListData = await queryArchonTierList()
  const result = await G_API.queryUpdateArchonTierList(tierListData)
  window.alert(result?.message || result.error)
}

async function updateSpecList(){
  const flatSpecs = await G_API.queryFlatSpecList()
  const data = (await Promise.allSettled(flatSpecs.map(item => limit(() => queryEachSpec(item.classSpec,item.roleClass))))).map(item => item.value)
  const result = await G_API.queryUpdateArchon(data)
  window.alert(result?.message || result.error)
}

function formatDate(secondTime) {
  const date = secondTime ? new Date(secondTime) : new Date();
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const classLocale = {
  "class": {
    "death-knight": "死亡骑士",
    "demon-hunter": "恶魔猎手",
    "druid": "德鲁伊",
    "mage": "法师",
    "monk": "武僧",
    "paladin": "圣骑士",
    "rogue": "盗贼",
    "shaman": "萨满",
    "warlock": "术士",
    "warrior": "战士",
    "evoker": "唤魔师",
    "hunter": "猎人",
    "priest": "牧师"
  },
  "death-knight": {
    "blood": "鲜血",
    "frost": "冰霜",
    "unholy": "邪恶"
  },
  "demon-hunter": {
    "havoc": "浩劫",
    "vengeance": "复仇"
  },
  "druid": {
    "balance": "平衡",
    "feral": "野性",
    "guardian": "守护",
    "restoration": "恢复"
  },
  "mage": {
    "arcane": "奥术",
    "fire": "火焰",
    "frost": "冰霜"
  },
  "monk": {
    "brewmaster": "酒仙",
    "mistweaver": "织雾",
    "windwalker": "踏风"
  },
  "paladin": {
    "holy": "神圣",
    "protection": "防护",
    "retribution": "惩戒"
  },
  "rogue": {
    "assassination": "刺杀",
    "outlaw": "狂徒",
    "subtlety": "敏锐"
  },
  "shaman": {
    "elemental": "元素",
    "enhancement": "增强",
    "restoration": "恢复"
  },
  "warlock": {
    "affliction": "痛苦",
    "demonology": "恶魔",
    "destruction": "毁灭"
  },
  "warrior": {
    "arms": "武器",
    "fury": "狂怒",
    "protection": "防护"
  },
  "evoker": {
    "devastation": "湮灭",
    "preservation": "恩护",
    "augmentation": "增辉"
  },
  "hunter": {
    "beast-mastery": "野兽掌控",
    "marksmanship": "射击",
    "survival": "生存"
  },
  "priest": {
    "discipline": "戒律",
    "holy": "神圣",
    "shadow": "暗影"
  }
}
