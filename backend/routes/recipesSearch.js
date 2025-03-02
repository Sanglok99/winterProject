const express = require('express');
const router = express.Router();
const searchRecipes = require('../controllers/recipesSearchController');

router.get('/', searchRecipes);

module.exports = router;