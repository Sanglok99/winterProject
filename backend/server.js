const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

const axios = require('axios');

app.use(express.json());

const mongoose = require('mongoose');
const MONGO_URI = "mongodb+srv://contactlogi:TgoLTR7yfuJ1tVNU@cluster0.5oejt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// MongoDB 연결
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "Recipe_raw_data" // DB 선택
  })
  .then(() => console.log("✅ MongoDB 연결 성공!"))
  .catch(err => console.error("❌ MongoDB 연결 오류:", err));

// Schema 정의
const recipeSchema = new mongoose.Schema({
    siteIndex: String,
    name: String,
    ingredientList: [{ ingredient: String }],
    cookingOrderList: [{ cookingOrder: String }],
    cookingTime: Number
});

// 모델 생성 (MongoDB의 "recipe_raw_data" 컬렉션과 연결)
const Recipe = mongoose.model("Recipe", recipeSchema, "recipe_raw_data") // collection 선택

// 0. 기본 페이지
app.get('/api', (req, res) => {
    res.send('안녕하세요, 여기는 홈입니다!');
});

// 1. 재료 구매 페이지
app.get('/api/ingredientsPurchase', async (req, res) => {
    // 쿼리 파라미터로 재료 이름 받기 (예: /ingredient?ingredient=tomato)
    const ingredient = req.query.keyword;
  
    if (!ingredient) {
        return res.status(400).json({ error: '재료 이름을 제공해 주세요.' });
    }

    /*
    // 재료 이름을 인코딩하여 검색 URL 생성 (예시: Google 검색)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(ingredient)}`;
    */

    // 환경변수에서 네이버 API 자격 증명을 가져옴
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: '네이버 API 자격 증명이 설정되지 않았습니다.' });
    }

    // 네이버 쇼핑 API 호출 URL (JSON 응답)
    const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(ingredient)}&display=10&start=1&sort=sim`;

    try {
        const response = await axios.get(apiUrl, {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
          }
        });
        
    // 네이버 API에서 받은 데이터를 클라이언트에 반환
    res.json(response.data);
    } catch (error) {
      console.error('네이버 API 호출 중 오류 발생:', error.message);
      res.status(500).json({ error: '네이버 API 호출 중 오류가 발생했습니다.' });
    }

    // TODO: 위의 gpt 코드 검증하고 수정하기
});

// 2. 일반 레시피 검색 페이지
app.get('/api/search', async(req, res) => {
    try {
        const keyword = req.query.keyword; // 검색어 가져오기
        const decodedKeyword = decodeURIComponent(keyword);  // URL 디코딩
        if (!decodedKeyword) {
            return res.status(400).json({ message: "검색어를 입력하세요!" });
        }

        // MongoDB에서 검색
        const recipes = await Recipe.find({
            $or: [
                { name: { $regex: decodedKeyword, $options: "i" } }, // name 필드에서 검색 (대소문자 구분 X)
                { "ingredientList.ingredient": { $regex: decodedKeyword, $options: "i" } } // ingredientList 배열에서 검색
            ]
        });

        res.json(recipes); // 결과 반환
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. 내 냉장고 현황 페이지
let userIngredients = [];
app.get('/api/myRefig', (req, res) => {
    res.json({ ingredients: userIngredients });
});

app.post('/api/myRefig', (req, res) => {
    const { ingredient, expirationDate } = req.body;
    userIngredients.push({ ingredient, expirationDate });
    res.json({ message: '재료가 추가되었습니다.', ingredients: userIngredients });
});

// 4. 냉장고 파먹기 기능 (내 냉장고 재료 기반 레시피 추천)
app.get('/api/recipeRecommend', (req, res) => {
    // TODO: 냉장고 재료 기반으로 레시피 추천 로직 구현
    res.json({
        message: '내 냉장고 기반 맞춤 레시피 추천',
        recommendedRecipes: []
    });
});

// 5. 레시피 검색 페이지 (사용자 재료 기반 추천 점수 포함)
app.get('/api/recipeSearch', (req, res) => {
    const searchQuery = req.query.q;
    // TODO: 데이터베이스에서 검색 및 재료 적합도 계산
    res.json({
        message: `검색어 '${searchQuery}'에 대한 추천 레시피 결과`,
        recommendedRecipes: []
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});