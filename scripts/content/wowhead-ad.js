const adList = [
  '.main .blocks',
  '.pbs__player',
  '#page-content .sidebar-wrapper',
  '#video-pos-body',
  'pb-stream'
];

// 直接移除页面动态加载逻辑依赖的dom，会导致页面卡死
setTimeout(() => {
  adList.forEach((ad) => {
    const dom = document.querySelector(ad);
    if (dom) {
      dom.style.display = 'none';
    }
  });
}, 2000)


if (document.querySelector('#page-content')) {
  document.querySelector('#page-content').style.paddingRight = 0;
}
