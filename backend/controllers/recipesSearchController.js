const Recipe = require('../models/Recipe');

// 레시피 검색 기능
exports.searchRecipes = async (req, res) => {
    try {
        const keyword = req.query.keyword;
        if (!keyword) {
            return res.status(400).json({ message: "검색어를 입력하세요!" });
        }

        const recipes = await Recipe.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { "ingredientList.ingredient": { $regex: keyword, $options: "i" } }
            ]
        });

        res.json(recipes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};