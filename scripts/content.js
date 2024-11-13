// Remove ads
const adList = [
  ".main .blocks",
  ".pbs__player",
  "#page-content .sidebar-wrapper",
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
    sendResponse({
      statsPriority: getStatPriority(),
      overall: getBisItem("#overall-bis"),
      bisItemRaid: getBisItem("#tab-bis-items-raid"),
      bisItemMythic: getBisItem("#tab-bis-items-mythic"),
      trinkets: getTrinketsRank(),
    });
  }
  sendResponse({});
});

function getBisItem(containerId) {
  let itemDoms;
  if (containerId === "#overall-bis") {
    itemDoms = document
      .querySelector("#overall-bis")
      .nextElementSibling.querySelectorAll("tbody tr");
  } else {
    itemDoms = document.querySelectorAll(`${containerId} tbody tr`);
  }

  return Array.from(itemDoms).map((dom) => {
    const columns = dom.innerText?.replace(/\s+/g, ",").split(",");
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
    return Array.from(possibleStats).find((item) =>
      item.innerText.toLowerCase().includes("mastery")
    ).innerText;
  }
  return "/";
}

function getTrinketsRank() {
  const lists = document.querySelectorAll(".tier-list-rows .tier-list-tier");
  if (lists?.length) {
    return Array.from(lists).map((list) => {
      const tierLabel = list.querySelector(".tier-label").innerText;
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
