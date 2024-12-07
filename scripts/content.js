// Remove ads
const adList = [
  ".main .blocks",
  ".pbs__player",
  "#page-content .sidebar-wrapper",
  "#video-pos-body",
];
adList.forEach((ad) => {
  const dom = document.querySelector(ad);
  if (dom) {
    dom.style.display = "none";
  }
});

document.querySelector("#page-content").style.paddingRight = 0;

// Collect data
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action == "BIS") {
    const data = getData();
    chrome.runtime.sendMessage(
      {
        action: "save",
        currentTab: { url: window.location.href },
        data,
      },
      (res) => {
        console.log(res);
        sendResponse(data);

        chrome.runtime.sendMessage({ action: "queryConfig" }, (config) => {
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
    collectedAt: new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    statsPriority: getStatPriority(),
    overall: getBisItem("#overall-bis"),
    bisItemRaid: getBisItem("#tab-bis-items-raid"),
    bisItemMythic: getBisItem("#tab-bis-items-mythic"),
    trinkets: getTrinketsRank(),
  };
}

function getBisItem(containerId) {
  let itemDoms;
  if (containerId === "#overall-bis") {
    const overallBIS = document.querySelector("#guide-body tbody");
    itemDoms = overallBIS.querySelectorAll("tr");
  } else {
    itemDoms = document.querySelectorAll(`${containerId} tbody tr`);
  }

  return Array.from(itemDoms).map((dom) => {
    const tds = dom.querySelectorAll('td');
    const columns = Array.from(tds).reduce((pre, cur) => {
      pre.push(cur.innerText);
      return pre;
    }, []);

    const itemIcon = dom.querySelector("img")?.src;
    return {
      slot: columns[0],
      item: columns[1],
      source: columns[2],
      itemIcon,
    };
  });
}

function getStatPriority() {
  const possibleStats = document.querySelectorAll("#guide-body b");
  if (possibleStats?.length) {
    // return Array.from(possibleStats).find((item) =>
    //   item.innerText.toLowerCase().includes("mastery")
    // )?.innerText;

    return Array.from(possibleStats).reduce((pre, cur) => {
      const text = cur.innerText.toLowerCase();
      if (pre.includes("haste")
      && pre.includes("crit")
      && pre.includes("versatility")
      && pre.includes("mastery")
      && pre.length
      ) {
        return pre;
      }

      if (text.includes("haste")
        || text.includes("crit")
        || text.includes("versatility")
        || text.includes("mastery")
      ) {
        pre += ` ${text}`;
        return pre;
      }
      return pre;
    }, "");
  }
  return "/";
}

function getTrinketsRank() {
  const lists = document.querySelectorAll(".tier-list-rows .tier-list-tier");
  if (lists?.length) {
    return Array.from(lists).map((list) => {
      const tierLabel = list.querySelector(".tier-label")?.innerText;
      const trinkets = list.querySelectorAll(".tier-content ins");
      return {
        label: tierLabel,
        trinkets: Array.from(trinkets).map(
          (item) => item.style.backgroundImage
        ),
      };
    });
  }
  return [];
}
//#endregion

//#region auto jump
function checkAutoCollect() {
  chrome.runtime.sendMessage({ action: "queryConfig" }, (config) => {
    if (config.autoJump) {
      const currentTab = { url: window.location.href };
      chrome.runtime.sendMessage(
        { action: "save", currentTab, data: getData() },
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
      countDownBox.classList.add("hide");
    }

    chrome.runtime.sendMessage(
      {
        action: "jump",
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

  if (!countDownBox) {
    countDownBox = document.createElement("div");
    countDownBox.classList.add("count-down-container");

    const progressBar = document.createElement("div");
    progressBar.classList.add("progress-container");
    currentProgressElement = document.createElement("div");
    progressBar.appendChild(currentProgressElement);
    totalTextElement = document.createElement("span");
    progressBar.appendChild(totalTextElement);

    const title = document.createElement("h4");
    title.innerText = "Auto Collecting...";
    countDownBox.appendChild(title);
    countDownBox.appendChild(progressBar);
    msgElement = document.createElement("p");
    countDownBox.appendChild(msgElement);

    document.body.append(countDownBox);
  }
  countDownBox.classList.remove("hide");
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
  chrome.runtime.sendMessage({ action: "querySpecs" }, (specs) => {
    collectionInfo = specs;
    const { total, collected } = specs;
    totalSpecCount = Object.values(total).reduce((pre, cur) => {
      pre += cur.length;
      return pre;
    }, 0);
    collectedSpecCount = collected.length;
    console.log("Received from background:", { total, collected });
  });
}
//#endregion
