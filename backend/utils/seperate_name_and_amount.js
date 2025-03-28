import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME; // Recipe_raw_data
const SOURCE_COLLECTION = process.env.COLLECTION_NAME; // recipe_raw_data 또는 recipe_raw_data_2
const TARGET_COLLECTION = 'refined_recipes_name_and_number_seperated_2'; // ✅ 새 컬렉션 이름

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* 
@brief: ChatGPT API의 응답이 순수한 json 형태가 아닌 Markdown 코드블록(json ... )을 포함한 응답을 주는 경우를 대비한 필터링 함수
@param: ChatGPT에서 받아온 응답
@return: json 문자열
*/
function extractJSONFromText(text) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/i); // Markdown 코드블록 처리
    if (match) return JSON.parse(match[1]);
    return JSON.parse(text); // 그냥 JSON 문자열인 경우
}

async function refine_seperate_name_and_number(ingredientRaw) {
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                /*
                {
                    role: "system",
                    content: "재료명 문자열에서 재료명과 수량(또는 용량, 분량 등등)을 분리해서 JSON 형식으로만 알려줘. 예: '오뚜기 맛있는계란 10개' → {\"name\": \"오뚜기 맛있는계란\", \"amount\": \"10개\"}"
                }, // recipe_raw_data 컬렉션용 프롬프트
                */
                {
                    role: "system",
                    content: "재료명 문자열에서 재료명과 수량(또는 용량, 분량 등)을 분리해서 JSON 형식으로만 알려줘. 재료명과 수량은 중간에 오는 + 로 구분해. 예: '오뚜기 맛있는계란 + 10개' → {\"name\": \"오뚜기 맛있는계란\", \"amount\": \"10개\"}"
                }, // recipe_raw_data_2 컬렉션용 프롬프트
                {
                    role: "user",
                    content: `재료: "${ingredientRaw}"`
                }
            ],
        });

        const result = completion.choices?.[0]?.message?.content?.trim();
        return extractJSONFromText(result); // 응답 문자열을 JSON 객체로 파싱
    } catch (error) {
        console.error(`OpenAI error with "${ingredientRaw}":`, error);
        return { name: ingredientRaw, amount: "" }; // fallback
    }
}

app.get('/seperate_name_and_amount', async (req, res) => {
    const mongoClient = new MongoClient(MONGO_URI);
    try {
        await mongoClient.connect();
        const db = mongoClient.db(DB_NAME);
        const source = db.collection(SOURCE_COLLECTION);
        const target = db.collection(TARGET_COLLECTION);

        const recipes = await source.find({}).toArray();
        const refinedRecipes = [];

        for (const recipe of recipes) {
            const originalList = recipe.ingredientList || [];
            const refinedList = [];

            let hasInvalidIngredient = false;

            for (const item of originalList) {
                const refined = await refine_seperate_name_and_number(item.ingredient);

                // 🚨 name 또는 amount 중 하나라도 비어 있으면 유효하지 않은 데이터
                if (!refined.name?.trim() || !refined.amount?.trim()) {
                    hasInvalidIngredient = true;
                    console.warn(`⚠️ 무시된 레시피 (${recipe.name}): 정제 실패한 재료 발견 →`, refined);
                    break; // 하나라도 이상하면 전체 레시피 스킵
                }

                refinedList.push(refined);
            }

            if (hasInvalidIngredient) {
                continue; // 이 레시피는 MongoDB에 저장하지 않음
            }

            // 기존 문서에서 ingredientList 제거하고 refinedIngredientList 추가한 새로운 문서 생성
            const { ingredientList, ...rest } = recipe;

            const newDoc = {
                ...rest,
                refinedIngredientList: refinedList, // 새 필드로 추가
            };

            // 새 컬렉션에 삽입
            await target.insertOne(newDoc);
            refinedRecipes.push(newDoc);

            console.log(`✅ 저장 완료: ${recipe.name}`);
        }

        res.json({
            message: `총 ${refinedRecipes.length}개의 레시피를 ${TARGET_COLLECTION}에 저장 완료`,
            collection: TARGET_COLLECTION,
        });

    } catch (err) {
        console.error("전체 작업 실패:", err);
        res.status(500).json({ error: "정제 및 저장 실패" });
    } finally {
        await mongoClient.close();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
