console.log('content');

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.action == 'querySpells') {
    const data = await fetch('http://localhost:3000/api/wow/spell/blank');
    console.log(data);
  }
});
