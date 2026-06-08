require('dotenv').config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const listRes = await fetch(listUrl);
  const listData = await listRes.json();
  
  if (!listRes.ok) {
    console.error("ERRO:", listData?.error?.message);
    return;
  }
  console.log("Modelos:", listData.models.map(m => m.name));
}
test();
