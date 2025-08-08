chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'get-wotlk-talent') {
    collect()
    return true;
  }
});

function collectTalentData() {
  const container = document.querySelector('.ctc-tree-container');

  const trees = container.querySelectorAll('.ctc-tree');

  function calculateIndex(row, col) {
    let rowIndex = Number(row);
    let colIndex = Number(col);

    return rowIndex * 4 + colIndex;
  }
  const talents = Array.from(trees).map((tree) => {
    const nodes = tree.querySelectorAll('.ctc-tree-talent');
    return Array.from(nodes).filter((node) => {
      return Number(node.dataset?.enabled) === 1;
    }).map(node => {
      const { row, col, points, maxPoints, enabled } = node.dataset;
      return {
        index: calculateIndex(row, col),
        points: Number(points),
        maxPoints: Number(maxPoints),
      }
    }).sort((a, b) => a.index - b.index);
  })
  return talents;
}

function getIdByUrl(url) {
  let id;
  const array = url.split('/');
  array.find((item) => {
    if (item.includes('item')) {
      id = item.split('=')[1];
    }
  });
  return isNaN(id) ? null : Number(id);
}

function collectGlyphsData() {
  const container = document.querySelector('.ctc-glyphs')
  const glyphs = container.querySelectorAll('.ctc-glyphs-group');
  return Array.from(glyphs).map(ele => {
    const items = ele.querySelectorAll('.ctc-glyphs-group-slot')
    const list = Array.from(items).filter(item => {
      return item.href?.includes('https')
    }).map(item => {
      return getIdByUrl(item.href)
    })
    return {
      type: ele.dataset.type,
      glyphs: list
    }
  })
}

function collect() {
  const talent = collectTalentData();
  const glyphs = collectGlyphsData();
  chrome.runtime.sendMessage({
    action: 'toNextTalent',
    data: {
      data: {
        talent,
        glyphs,
      },
      type: location.href.includes('leveling') ? 'leveling' : 'build',
    }
  });
}

function checkAutoCollect() {
  chrome.runtime.sendMessage({ action: 'queryConfig' }, async (config) => {
    if (!config.autoJump) return;
    console.log('等待跳转中......')

    // 检查元素是否已存在
    if (isTargetElementReady()) {
      collect();
      return;
    }

    // 设置MutationObserver监听元素变化
    const observer = new MutationObserver((mutations, obs) => {
      if (isTargetElementReady()) {
        obs.disconnect();
        collect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 设置超时防止长期观察
    setTimeout(() => {
      observer.disconnect();
      if (isTargetElementReady()) {
        collect();
      }
      alert('等待超时')
    }, 10000); // 10秒超时
  });
}

// 检查目标元素是否已加载
function isTargetElementReady() {
  return document.querySelector('.ctc-tree-container') &&
    document.querySelector('.ctc-glyphs');
}

checkAutoCollect()
