const G_API = {
  translateByBaidu,
  queryDungeonByName,
};
async function translateByBaidu(text) {
  try {
    const res = await fetch('https://ginkolearn.cyou/api/common/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/JSON',
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.log(error);
    return text;
  }
}

async function queryDungeonByName(nameEN) {
  try {
    const res = await fetch('http://localhost:3000/api/wow/dungeon/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/JSON',
      },
      body: JSON.stringify({ nameEN }),
    });
    if (res) {
      const data = await res.json();
      return data.name_zh;
    } else if (nameEN === 'Operation: Floodgate') {
      return '水闸行动';
    } else {
      return `${nameEN}(团本)`;
    }
  } catch (error) {
    console.log(error);
    if (nameEN === 'Operation: Floodgate') {
      return '水闸行动';
    } else if (nameEN === 'Operation: Mechagon Workshop') {
      return '麦卡贡车间';
    } else {
      return `${nameEN}(团本)`;
    }
  }
}
