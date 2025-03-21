require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = "gpt-3.5-turbo";

async function fetchDataFromMongoDB() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        return await collection.find({}).toArray();
    } catch (error) {
        console.error("MongoDB fetch error:", error);
        return [];
    } finally {
        await client.close();
    }
}

async function refineDataWithLLM(data) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: OPENAI_MODEL,
                messages: [
                    { role: "system", content: "데이터베이스의 raw data에서 불필요한 말들을 제거해서 깨끗한 데이터로 바꿔줘." },
                    { role: "user", content: `여기 raw data가 있어: ${JSON.stringify(data)}. 상표명(예: 오뚜기, 이금기 팬더)와 형용사(예: 깨끗한, 맛있는), 개수(예: 1개, 1포기) 등을 제외하고 재료명만 남겨줘.` }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API error:", error);
        return "Error refining data.";
    }
}

/*
import OpenAI from "openai";
const client = new OpenAI();

const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
        {
            role: "user",
            content: "Write a one-sentence bedtime story about a unicorn.",
        },
    ],
});

console.log(completion.choices[0].message.content);
*/

app.get('/refine-data', async (req, res) => {
    const rawData = await fetchDataFromMongoDB();
    if (!rawData.length) {
        return res.status(500).json({ error: "No data found" });
    }
    /* 
    else{
        for (let i = 0; i < rawData.length; i++) {
            console.log("rawData: rawData[i]);
        }
    } // 🚀 Debug 로그 추가 
    */
    const refinedData = await refineDataWithLLM(rawData);
    res.json({ refinedData });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
