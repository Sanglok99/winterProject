const express = require('express');
const router = express.Router();
const { recommendRecipes } = require('../controllers/recipesRecommendController'); // 변경됨

router.get('/', recommendRecipes);

module.exports = router;