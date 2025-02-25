function getImageFileName(url) {
  return url.split('/').pop();
}

async function downloadAsZip(imageUrls, zipName = 'images') {
  // popup.html中引入
  const zip = new JSZip();

  const imgFolder = zip.folder(zipName);

  // 并行获取所有图片（注意跨域限制）
  const fetchPromises = imageUrls.map(async (url, index) => {
    const response = await fetch(url);
    const blob = await response.blob();
    imgFolder.file(getImageFileName(url), blob);
  });

  await Promise.allSettled(fetchPromises);

  const content = await zip.generateAsync({ type: 'blob' });

  // popup.html中引入
  saveAs(content, `${zipName}.zip`);
}
