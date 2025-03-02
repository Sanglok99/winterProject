const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    siteIndex: String,
    name: String,
    ingredientList: [{ ingredient: String }],
    cookingOrderList: [{ cookingOrder: String }],
    cookingTime: Number
});

module.exports = mongoose.model("Recipe", recipeSchema, "recipe_raw_data");