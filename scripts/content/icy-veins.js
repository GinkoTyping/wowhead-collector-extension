const adList = ['.pw-sticky', '#pw-oop-bottom_rail'];
adList.forEach((ad) => {
  const doms = document.querySelectorAll(ad);
  const arrayDoms = Array.from(doms);
  arrayDoms.forEach((dom) => {
    if (dom) {
      dom.style.display = 'none';
    }
  });
});

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action == 'collectTierList') {
    // TODO 迁移到puppeteer

    const data = collectTierList();
    console.log({ data });
    return true;
  }
});
