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

  return Array.from(bestStatsEle.children).map((parentEl) => {
    const name = parentEl.children[0].querySelector('b span').innerText;
    const priorityList = Array.from(parentEl.querySelectorAll('ol li')).map(
      (item) => mapLocaleStat(item.innerText)
    );

    return {
      name,
      priorityList,
    };
  });
}
