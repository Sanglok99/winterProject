import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const SOURCE_COLLECTION = 'refined_recipes_name_and_number_seperated_2'; // seperate_name_and_amount.js에서 만들어진 컬렉션
const TARGET_COLLECTION = 'refined_recipes_name_2'; // ✅ 새 컬렉션 이름

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function refineIngredientNameOnly(ingredientRaw) {
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                /*
                {
                    role: "system",
                    content: "너는 재료명 클렌징 도우미야. 상표명, 불필요한 형용사 등을 제거하고 핵심 재료명만 남겨. 예) '오뚜기 맛있는계란' → '계란' '오뚜기 볶음참깨' → '참깨' 추가 설명 절대 하지 마. JSON, 마크다운, 인용부호 없이 결과만 출력해."
                },
                */
                {
                    role: "system",
                    content: "너는 재료명 클렌징 도우미야. 상표명, 불필요한 형용사, 수량(또는 용량, 분량 등) 등을 제거하고 핵심 재료명만 남겨. '또는', '약간' 등의 불필요한 말들도 제외해. 예) '물 또는 다시육수 대략 200ml' -> '물' '굴소스 취향껏' → '굴소스' 추가 설명 절대 하지 마. JSON, 마크다운, 인용부호 없이 결과만 출력해."
                },
                {
                    role: "user",
                    content: `재료: "${ingredientRaw}"`
                }
            ],
        });

        const result = completion.choices?.[0]?.message?.content?.trim();
        return result;
    } catch (error) {
        console.error(`OpenAI error with "${ingredientRaw}":`, error);
        return 
    }
}

app.get('/refine_recipe_name', async (req, res) => {
    const mongoClient = new MongoClient(MONGO_URI);
    try {
        await mongoClient.connect();
        const db = mongoClient.db(DB_NAME);
        const source = db.collection(SOURCE_COLLECTION);
        const target = db.collection(TARGET_COLLECTION);

        const recipes = await source.find({}).toArray();
        const refinedRecipes = [];

        for (const recipe of recipes) {
            const originalList = recipe.refinedIngredientList || [];
            const cleanedList = [];

            let hasInvalid = false;

            for (const item of originalList) {
                //🚨 앞서 seperate_name_and_amount.js에서 정제한 데이터에서 name 또는 amount 중 하나라도 비어 있으면 건너뜀(앞에서 다 거르긴 했는데 혹시 몰라서 만든 코드)
                if (!item.name?.trim() || !item.amount?.trim()) {
                    hasInvalid = true;
                    break;
                }

                const cleanedName = await refineIngredientNameOnly(item.name);

                //🚨 정제 잘못돼서 빈 값 나오면 건너뜀
                if (!cleanedName) {
                    hasInvalid = true;
                    break;
                }
                
                cleanedList.push({
                    name: cleanedName,
                    amount: item.amount
                });
            }

            if (hasInvalid) {
                console.warn(`⚠️ 무시된 레시피: ${recipe.name}`);
                continue;
            }

            // 기존 문서에서 ingredientList 제거하고 refinedIngredientList 추가한 새로운 문서 생성
            const { ingredientList, ...rest } = recipe;

            const newDoc = {
                ...recipe,
                final_refinedIngredientList: cleanedList // 새 필드로 추가
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
