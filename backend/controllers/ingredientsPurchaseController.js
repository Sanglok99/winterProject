// 재료 구매 페이지
// TODO: 다시 개발 필요(네이버 api 안 쓰고 클라이언트에 쇼핑몰별 검색 결과 url? 전송해서 프론트에서 처리할 수 있도록 다시 개발하기)
const axios = require('axios');

exports.purchaseIngredient = async (req, res) => {
    const ingredient = req.query.keyword;
    if (!ingredient) {
        return res.status(400).json({ error: '재료 이름을 제공해 주세요.' });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: '네이버 API 자격 증명이 설정되지 않았습니다.' });
    }

    const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(ingredient)}&display=10&start=1&sort=sim`;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('네이버 API 호출 중 오류 발생:', error.message);
        res.status(500).json({ error: '네이버 API 호출 중 오류가 발생했습니다.' });
    }
};
