const express = require('express');
const router = express.Router();
const { purchaseIngredient } = require('../controllers/ingredientsPurchaseController');

router.get('/', purchaseIngredient);

module.exports = router;