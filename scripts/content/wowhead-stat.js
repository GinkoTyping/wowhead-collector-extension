console.log('STAT CONTENT 注入');
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'stat.get') {
    const overview = getStatsOverview();
    const best = getBestStats();
    console.log({ overview, best });
  }
});

function getStatsOverview() {
  function getEle() {
    const reference = document.querySelector('#stats-overview');
    let output = reference.nextSibling;
    while (output.tagName !== 'UL') {
      output = output.nextSibling;
    }
    return output;
  }
  const statsUlELe = getEle();
  return Array.from(statsUlELe.querySelectorAll('li div')).map((tipEle) => {
    let text = tipEle.innerText;
    const spells = Array.from(
      tipEle.querySelectorAll('a[data-entity="spell"]')
    ).map((spellEle) => {
      const id = spellEle.href.split('spell=').pop().split('/').shift();
      const name = spellEle.innerText;
      text = text.replaceAll(name, `[${name}]`);
      return { id, name };
    });
    return {
      text,
      spells,
    };
  });
}

function getBestStats() {
  function getEle() {
    const reference = document.querySelector('#best-stats');
    let output = reference.nextSibling;
    while (
      output.tagName !== 'DIV' ||
      !output.className?.includes('markup-grid')
    ) {
      output = output.nextSibling;
    }
    return output;
  }
  const bestStatsEle = getEle();

  function mapLocaleStat(input) {
    let output = input.toLowerCase();
    const dictionary = {
      strength: '力量',
      haste: '急速',
      master: '精通',
      crit: '暴击',
      critical: '暴击',
      versatility: '全能',
      intellect: '智力',
      agility: '敏捷',
    };

    Object.entries(dictionary).forEach(([key, value]) => {
      output = output.replaceAll(key, value);
    });
    return output;
  }

  function mapLocaleHeroTalent(key) {
    const lowerCaseKey = key;
    const map = {
      "San'layn": '萨莱因',
      Deathbringer: '死亡使者',
      'Rider of the Apocalypse': '天启骑士',

      Colossus: '巨神兵',
      Slayer: '屠戮者',
      'Mountain Thane': '山丘领主',

      Lightsmith: '铸光者',
      'Herald of the Sun': '烈日先驱',
      Templar: '圣殿骑士',

      'Pack Leader': '猎群领袖',
      'Dark Ranger': '黑暗游侠',
      Sentinel: '哨兵',

      Deathstalker: '死亡猎手',
      Fatebound: '命缚者',
      Trickster: '欺诈者',

      Voidweaver: '虚空编织者',
      Oracle: '神谕者',
      Archon: '执政官',

      Stormbringer: '风暴使者',
      Farseer: '先知',
      Totemic: '图腾祭司',

      Spellslinger: '疾咒师',
      Sunfury: '日怒',
      'Frostfire Mastery': '霜火',

      Hellcaller: '地狱召唤者',
      'Soul Harvester': '灵魂收割者',
      Diabolist: '恶魔使徒',

      'Shado-Pan': '影踪派',
      'Master of Harmony': '祥和宗师',
      'Conduit of the Celestials': '天神御师',

      "Elune's Chosen": '艾露恩钦选者',
      'Keeper of the Grove': '丛林守护者',
      Wildstalker: '荒野追猎者',
      'Druid of the Claw': '利爪德鲁伊',

      'Aldrachi Reaver': '奥达奇收割者',
      'Fel-Scarred': '邪痕枭雄',
    };

    return map[lowerCaseKey];
  }

  return Array.from(bestStatsEle.children).map((parentEl) => {
    const name = parentEl.children[0].querySelector('b span').innerText;
    const priorityList = Array.from(parentEl.querySelectorAll('ol li')).map(
      (item) => mapLocaleStat(item.innerText)
    );

    return {
      name: mapLocaleHeroTalent(name),
      priorityList,
    };
  });
}
