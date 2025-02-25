function getImageFileName(url) {
  return url.split('/').pop();
}

async function downloadAsZip(imageUrls, zipName = 'images') {
  let current = 0;
  let total = imageUrls.length;

  // popup.html中引入
  const zip = new JSZip();

  const imgFolder = zip.folder(zipName);

  async function downloadPromise(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    current++;
    console.log(`${zipName}.zip downloading: ${current}/${total}`);
    imgFolder.file(getImageFileName(url), blob);
  }
  // popup.html中引入
  const limiter = new Bottleneck({ maxConcurrent: 100 });
  const wrappedFetch = limiter.wrap(downloadPromise);

  const fetchPromises = imageUrls.map(async (url, index) => wrappedFetch(url));

  await Promise.allSettled(fetchPromises);

  const content = await zip.generateAsync({ type: 'blob' });

  // popup.html中引入
  saveAs(content, `${zipName}.zip`);
}
