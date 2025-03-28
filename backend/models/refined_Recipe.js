const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    siteIndex: String,
    name: String,
    cookingOrderList: [{ cookingOrder: String }],
    cookingTime: Number,
    refinedIngredientList: [{ name: String, amount: String }],
    final_refinedIngredientList: [{ name: String, amount: String }]
});

module.exports = mongoose.model("Recipe", recipeSchema, "refined_recipes_name");