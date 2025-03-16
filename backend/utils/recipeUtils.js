const Recipe = require('../models/Recipe'); // MongoDB 모델 가져오기

const findRecipesBasedOnIngredients = async (userIngredients) => {
    try {
        // 1. MongoDB에서 사용자가 가진 재료 중 하나라도 포함하는 레시피만 가져오기
        const recipes = await Recipe.find({ "ingredientList.ingredient": { $in: userIngredients } });

        // console.log("✅ recipes: ", recipes); // 🚀 Debug 로그 추가

        // 2. Jaccard Distance를 계산하여 유사도 점수 매기기
        const scoredRecipes = recipes.map(recipe => {
            const recipeIngredients = recipe.ingredientList.map(ing => ing.ingredient); // MongoDB 레시피 재료 추출
            // console.log("✅ recipeIngredients: ", recipeIngredients); // 🚀 Debug 로그 추가
            const userSet = new Set(userIngredients);
            const recipeSet = new Set(recipeIngredients);

            // 교집합과 합집합 계산
            const intersection = new Set([...userSet].filter(x => recipeSet.has(x)));
            const union = new Set([...userSet, ...recipeSet]);

            // Jaccard Distance 계산 (1 - Jaccard Similarity)
            const jaccardDistance = 1 - (intersection.size / union.size);
            return {
                recipe,
                similarity: 1 - jaccardDistance // 유사도 점수 (높을수록 유사함)
            };
        });

        // 3. 유사도 점수를 기준으로 정렬 (내림차순)
        scoredRecipes.sort((a, b) => b.similarity - a.similarity);
        // console.log("✅ scoredRecipes: ", scoredRecipes); // 🚀 Debug 로그 추가

        // 4. 상위 5개 레시피 반환 (유사도가 0.5 이상인 레시피만 추천)
        const recommendedRecipes = scoredRecipes.filter(item => item.similarity >= 0.5).map(item => item.recipe);
        // console.log("✅ recommendedRecipes: ", recommendedRecipes); // 🚀 Debug 로그 추가
        // console.log("✅ recommendedRecipes.length: ", recommendedRecipes.length); // 🚀 Debug 로그 추가
        return recommendedRecipes.length > 0 ? recommendedRecipes : scoredRecipes.slice(0, 5).map(item => item.recipe);
    } catch (error) {
        console.error("❌ 레시피 추천 중 오류 발생:", error);
        return [];
    }
};

module.exports = { findRecipesBasedOnIngredients };
