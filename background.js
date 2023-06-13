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

//Returns the first integer in the string in the range of [min, max]
function getFirstNumberInRange(string, min=0, max=100){
    stringNumbers = string.match(/^\d+|\d+\b|\d+(?=\w)/g);
    if(!stringNumbers){
        return null;
    }
    numbers = stringNumbers.map(s => parseInt(s));
    firstInRange = numbers.find(n => (n >= min && n <= max));
    return firstInRange;
}

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
        console.log("data:");
        console.log(data);
        // Handle the response data
        data = data.choices[0].message.content;
        
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

async function scoreMail(mailId){
    part = await messenger.messages.getFull(mailId)
        mail_body = part.parts[0].parts.find(p => p.contentType=="text/plain").body
        
        // use only the first 400 characters for openAI!
        limited_mail_body = mail_body.substring(0, 400)

        console.log("part body: " + limited_mail_body)
        //parts.forEach(b => console.log(b.body))
        console.log("CALLING GPT!");
        score = await getChatResponse(
            `You are requested to assess the degree of positivity or 
            negativity in the information portraied in an email 
            using a scale ranging from 0 to 100, 0 being the most negative
            and 100 being the most positive.
             The evaluation is based on 
             the content of the email and its impact on the recipients life,
              rather than the tone of the mail. Please provide a single 
              sentence explaining your assessment along with the 
              corresponding numerical score.
              
              Score examples:
                Mail about getting cancer: score = 0
                Mail about failing a uni course: score = 25
                Mail about having to work overtime: socre = 40
                Mail about recieving a bonus: score = 75
                Mail about achieving a promotion: score = 80
              
              Here is the email for you to evaluate: 
            \n${limited_mail_body}`)
        
        try{
            scoreText = "";
            console.log("GPT DATA FOR SCORING: " + score);
            intScore = getFirstNumberInRange(score, min = 0, max = 100);
            if(intScore == null){
                throw "NOPE!";
            }
            else if(intScore<20){
                scoreText = "verybad";
            }
            else if(intScore<40){
                scoreText = "bad";
            }
            else if(intScore<=60){
                scoreText = "ok";
            }
            else if(intScore<80){
                scoreText = "good";
            }
            else if(intScore>=80){
                scoreText = "verygood";
            }
            console.log("How good was the mail? GPT ANSWERED: " + scoreText + 
                ` (${intScore}/100)`);
            tags = {tags: [scoreText]};
            //Add the new positivity score tags to the mail!
            messenger.messages.update(mailId, tags);
            

        }
        catch(e){
            console.log("GPT failed...: " + e);
        }
}

//Add callback
browser.messages.onNewMailReceived.addListener(
    async (folder, messages) => {
        
        console.log(`Recived ${messages.messages.length} messages`)
        //console.log(messages)
        try{
        messages = messages.messages.map(m => 
            m
            );
        }
        catch(e) {
            console.log("FAILED!!!" + e);
        }
        console.log("IDs: ");
        console.log(messages);

        //Score the mail
        messages.forEach(async (m) => 
            {
                console.log("Autor:");
                console.log(m.author);
                if(!m.author.includes("no-reply"))
                    await scoreMail(m.id);
                else
                    console.log("Will not score: " + m.author);
            }
        );
        
    }
)