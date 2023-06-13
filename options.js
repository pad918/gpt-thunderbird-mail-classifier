
async function setApiKey(){
    let apiKey = document.getElementById('apiKeyText').value;
    console.log("API KEY UPDATED TO: " + apiKey);
    await storage.local.set({ "OPENAI_API_KEY": apiKey });
}
