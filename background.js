async function ensureTagsExists(){
    tags = [
        { key: "bad", tag: "bad", color: "#972020", ordinal: "" },
        { key: "good", tag: "good", color: "#207104", ordinal: "" },
        { key: "ok", tag: "ok", color: "#ffffff", ordinal: "" },
        { key: "verybad", tag: "Very bad", color: "#e31c1c", ordinal: "" },
        { key: "verygood", tag: "Very good", color: "#41ff31", ordinal: "" },
    ]
    allTags = await messenger.messages.listTags();
    for (const tag of tags){
        console.log(tag);
        found = allTags.find(t => t.key==tag.key)
        if(!found){
            //Create the tag!
            messenger.messages.createTag(tag.key, tag.tag, tag.color) 
        }
    }
}
ensureTagsExists()
// The api key is stored as a tag in the following form:
// Tag name: open_ai_api_key_<key>
async function getApiKey(){
    allTags = await messenger.messages.listTags();
    console.log(allTags);
    api_key_tag_name = allTags.find(t => t.tag.startsWith("open_ai_api_key_")).tag;
    if(api_key_tag_name)
        return api_key_tag_name.replace("open_ai_api_key_", "");
    else
        return null; 
}

async function testtest(){
    apiKey = await getApiKey();
    console.log("APIKEY: " + apiKey)
}

testtest();

async function getChatResponse(prompt, n = 3){
    
    if(n<0){
        return "GPT FAILED, tried after trying multiple times!"
    }
    const apiKey = await getApiKey();
    const apiUrl = 'https://api.openai.com/v1/chat/completions'; 
    score = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{"role": "system", "content": prompt}],
        //max_tokens: maxTokens
      })
    })
      .then(response => response.json())
      .then(data => {
        // Handle the response data
        data = data.choices[0].message.content;
        console.log("DATA: " + data);
        score = data;
        return data
      })
      .catch(error => {
        // Handle any errors
        console.log(error);
      });
    if(score==""){
        //retry
        score = getChatResponse(prompt, n-1);
    }
    console.log("SCORE = " + score)
    return score
}

//Add callback
browser.messages.onNewMailReceived.addListener(
    async (folder, messages) => {
        
        console.log("Recived message:")
        messages = messages.messages
        //console.log(messages)
        m_id = messages[0].id
        console.log("ID: " + m_id)
        part = await messenger.messages.getFull(m_id)
        mail_body = part.parts[0].parts.find(p => p.contentType=="text/plain").body

        console.log("part body: " + mail_body)
        messages.forEach(m => console.log(m))
        messages.forEach(m => console.log(m.author))
        //parts.forEach(b => console.log(b.body))
        console.log("CALLING GPT!");
        score = await getChatResponse(
            `You are asked to evaluate the level of positivity or 
            negativity in emails using a scale from 0 to 100. A score
             of 0 represents the most negative possible response, 
             while a score of 100 represents the most positive possible
              response. Please respond only with the numerical score. 
              Here is the email for you to rate: 
            \n${mail_body}`)
        
        try{
            scoreText = "";
            intScore = parseInt(score)
            if(intScore<10){
                scoreText = "verybad";
            }
            else if(intScore<40){
                scoreText = "bad";
            }
            else if(intScore<=60){
                scoreText = "ok";
            }
            else if(intScore<90){
                scoreText = "good";
            }
            else if(intScore>=90){
                scoreText = "verygood";
            }
            else{
                throw "NOPE!"
            }
            console.log("How good was the mail? GPT ANSWERED: " + scoreText + 
                ` (${score}/100)`);
            tags = {tags: [scoreText]};
            //Add the new positivity score tags to the mail!
            messenger.messages.update(m_id, tags);
            

        }
        catch(e){
            console.log("GPT failed...: " + e);
        }
        
    }
)