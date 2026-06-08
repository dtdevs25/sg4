require('dotenv').config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = "Diga ok";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error("ERRO:", data.error.message);
  } else {
    console.log("SUCESSO:", data.candidates[0].content.parts[0].text);
  }
}
test();
