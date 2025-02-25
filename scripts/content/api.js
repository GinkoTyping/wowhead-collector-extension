const G_API = {
  translateByBaidu,
};
async function translateByBaidu(text) {
  const res = await fetch('https://ginkolearn.cyou/api/common/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/JSON',
    },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  return data;
}
