const Recipe = require('../models/Recipe');

// 뭐해먹지 기능
// TODO: mysql 서버에서 사용자 정보(내 냉장고 현황 정보) 가져오기 ❌
// TODO: mysql 서버의 모든 레시피와 '내 냉장고 현황 정보'의 Jaccard Distance(자커드 거리) 계산하는 코드 ❌
exports.recommendRecipes = async (req, res) => {
    try{
        //spring 서버에서 사용자의 냉장고 재료 정보 가져오기
        const userIngredients = req.body; // 요청 body에서 사용자 재료 정보 받기
        if(!userIngredients || Object.keys(userIngredients).length === 0){
            return res.status(400).json({ error: '사용자 재료 정보가 필요합니다.' });
        }

        const recommendedResults = findRecipesBasedOnIngredients(userIngredients);

        res.json({
            message: '내 냉장고 기반 맞춤 레시피 추천',
            recommendedResults
        });
    } catch(error){
        console.error('❌ 레시피 추천 오류: ', error.message);
        res.status(500).json({ error: '레시피 추천 중 오류가 발생했습니다.' });
    }
};