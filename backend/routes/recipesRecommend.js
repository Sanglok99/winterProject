const express = require('express');
const router = express.Router();
const recommendRecipes = require('../controllers/recipesRecommendController');

router.get('/', recommendRecipes);

module.exports = router;