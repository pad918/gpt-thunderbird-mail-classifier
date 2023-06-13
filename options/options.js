async function setApiKey(){
    let apiKey = document.getElementById('apiKeyText').value;
    console.log("API KEY UPDATED TO: " + apiKey);
    await browser.storage.local.set({ "OPENAI_API_KEY": apiKey });
    document.getElementById('apiKeyText').value = "API KEY UPDATED!"
}

const input = document.getElementById("apiKeyText");
console.log("input");
console.log(input);
input.addEventListener("input", setApiKey);