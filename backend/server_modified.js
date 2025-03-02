// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 사용자 정의 모듈 가져오기
const ingredientsPurchaseRoutes = require('./routes/ingredientsPurchase');
const recipesRecommendRoutes = require('./routes/recipesRecommend');
const recipesSearchRoutes = require('./routes/recipesSearch');

dotenv.config(); // .env 파일 로드
app.use(express.json()); 

// MongoDB 연결
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "Recipe_raw_data"
})
.then(() => console.log("✅ MongoDB 연결 성공!"))
.catch(err => console.error("❌ MongoDB 연결 오류:", err));

// 기본 페이지
app.get('/api', (req, res) => {
    res.send('안녕하세요, 여기는 홈입니다!');
});

// 라우트 설정
app.use('/api/ingredientsPurchase', ingredientsPurchaseRoutes);
app.use('/api/recipesRecommend', recipesRecommendRoutes);
app.use('/api/recipesSearch', recipesSearchRoutes)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});