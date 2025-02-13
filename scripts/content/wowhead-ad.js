const adList = [
  '.main .blocks',
  '.pbs__player',
  '#page-content .sidebar-wrapper',
  '#video-pos-body',
];
adList.forEach((ad) => {
  const dom = document.querySelector(ad);
  if (dom) {
    dom.style.display = 'none';
  }
});
if (document.querySelector('#page-content')) {
  document.querySelector('#page-content').style.paddingRight = 0;
}
