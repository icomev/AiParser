const OpenAI = require('openai')
const ReconnectingWebSocket = require('reconnecting-websocket');
const WebSocket = require('ws');
const axios = require('axios');

const openai = new OpenAI({
	apiKey: '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'
});


const options = {
	WebSocket: WebSocket, 
	connectionTimeout: 15000,
	maxRetries: 100,
};

const rws = new ReconnectingWebSocket('wss://news.treeofalpha.com/ws', [], options);

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

const keywords = [
    "payment", "new card", "hacked", "hacker", "hack", "invest", "invests", 
    "rollup", "brc-20", "brc20", "judge", "rules", "ruling", "MICROSTRATEGY",
    "launchpad", "3ac", "appeals", "burn", "card", "settlement",
    "onboard", "partnership", "ubisoft", "foundation", 
    "bitcoin spot etf is approved", "etf is approved", "etf approved", "rates", 
    "alliance", "integration", "integrations", "exploit", "exploited", "leak", 
    "suit", "pay", "partners", "plea", "power", "powered", "investment", 
    "suspend", "suspended", "hyperchain", "collab", "collaboration", 
    "credit card", "raises", "valuation", "launches", "important", "stolen", 
    "stole", "unlock", "liquidity", "death", "upgrade", "doj", "significant", 
    "action", "criminal", "investigation", "investigations, license"
];

const specialKeywords = [
    "Binance Will Support", "Binance Futures Will Launch", "Binance Will List", "Binance Launchpad", 
    "Binance Launchpool", "[거래]", "[마켓 추가]", "[투자유의]", "işlemleri başladı", 
    "roadmap today", "Coinbase will add support for", "Coinbase exchange listing" 
];


const pattern = new RegExp(keywords.map(escapeRegex).join('|'), 'i');
const specialPattern = new RegExp(specialKeywords.map(escapeRegex).join('\\b|\\b'), 'i');


rws.addEventListener('open', () => {
	console.log('Connected to Phoenix News WebSocket');
});


rws.addEventListener('message', async (event) => {
    const newsData = JSON.parse(event.data);
    const content = (newsData.body || newsData.title).replace(/\r\n|\r|\n/g, " ");
    console.log("msg: ", content);

    if (specialPattern.test(content)) {
        console.log("Special Keyword found, forwarding immediately:", content);
        await forwardImmediately(content); 
    } else if (pattern.test(content)) {
        // Content contains regular keyword, pass it to the main function
        await main(content); 
    } else {
        // Content does not contain any special or regular keywords, disregard it
        console.log("Content does not contain relevant keywords, disregarding.");
    }
});

rws.addEventListener('close', () => {
	console.log('Disconnected from Phoenix News WebSocket');
});

rws.addEventListener('error', (error) => {
	console.error('WebSocket error:', error);
});


async function forwardImmediately(content) {
    const webhookUrl = 'https://discordapp.com/api/webhooks/1193993745083941015/tSc3vJYgYcCMWnXNgxUhNiLtlMVtjpt-H9zDLyMtPBd5dLW1TtcgMhA8H-TYNhoVxUsg';
    const unixTimestamp = Math.floor(Date.now());
    const messageWithTimestamp = `Timestamp: ${unixTimestamp}\nContent: ${content}`;

    try {
        console.log('Content inside the forward function', messageWithTimestamp);
        await axios.post(webhookUrl, { content: messageWithTimestamp });
        console.log('Message sent to Discord');
    } catch (error) {
        console.error('Error sending message to Discord:', error);
    }
}

async function main(content) {
	const completion = await openai.chat.completions.create({
		messages: [{
				"role": "system",
				"content": "You are a helpful assistant. Evaluate the impact of each news headline on an individual company's cryptocurrency price and respond with a numerical score from 7 to 10. Ignore headlines with negligible to moderate impact (scores 1 to 6). Use this scale for scoring: - 7: High impact, such as major product launches or significant financial milestones. - 8: Very high impact, including large-scale mergers or major corporate restructuring. - 9: Extremely high impact, indicating potential for major market shifts. - 10: Transformative impact, like groundbreaking industry developments or major geopolitical events. Respond only with the numerical score based on this scale."
			},
			{
				"role": "user",
				"content": content
			},
            {
				"role": "assistant",
				"content": ""
			}

		],
		model: "gpt-4-1106-preview",
		max_tokens: 1,
	});

    const score = Number(completion.choices[0].message.content.trim());


    if (!isNaN(score)) {
        console.log("Score:", score);
    
        const unixTimestamp = Math.floor(Date.now());
        let webhookUrl = '';
        let messageContent = `Timestamp: ${unixTimestamp}\nScore: ${score} - Msg: ${content}`;
    
        if (score >= 7) {
            console.log("Score is 7 or above:", score);
            webhookUrl = 'https://discordapp.com/api/webhooks/1193993745083941015/tSc3vJYgYcCMWnXNgxUhNiLtlMVtjpt-H9zDLyMtPBd5dLW1TtcgMhA8H-TYNhoVxUsg';
        }
    
        if (webhookUrl) {
            try {
                await axios.post(webhookUrl, { content: messageContent });
                console.log('Message sent to Discord');
            } catch (error) {
                console.error('Error sending message to Discord:', error);
            }
        }
    } else {
        console.log("Invalid score received:", completion.choices[0].message.content);
    }
    
}
