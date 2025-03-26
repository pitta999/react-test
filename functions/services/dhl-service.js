// functions/services/dhl-service.js
const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const axios = require('axios');
const { handleApiError } = require('../utils/error-handler');

// 환경 변수로 API 키와 시크릿 저장 (Firebase Console에서 설정)
const DHL_API_KEY = functions.config().dhl?.api_key;
const DHL_API_SECRET = functions.config().dhl?.api_secret;
const DHL_API_BASE_URL = 'https://express.api.dhl.com/mydhlapi';

// DHL API 기본 헤더 생성 함수
const getDhlHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': DHL_API_KEY
  };
  
  // API 시크릿이 있는 경우 Basic Auth 추가
  if (DHL_API_SECRET) {
    const base64Credentials = Buffer.from(`${DHL_API_KEY}:${DHL_API_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${base64Credentials}`;
  }
  
  return headers;
};

// DHL 요금 계산 API 호출 함수
exports.getDhlRates = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // POST 메소드만 허용
      if (request.method !== 'POST') {
        return response.status(405).json({ 
          error: 'Method not allowed. Please use POST.' 
        });
      }

      // 요청 유효성 검사
      if (!request.body || !request.body.requestedShipment) {
        return response.status(400).json({ 
          error: 'Invalid request. requestedShipment is required.' 
        });
      }

      // DHL API 호출
      const dhlResponse = await axios({
        method: 'post',
        url: `${DHL_API_BASE_URL}/test/rates`,
        headers: getDhlHeaders(),
        data: request.body,
        validateStatus: () => true // 모든 상태 코드를 처리하기 위해
      });

      // DHL API 응답 그대로 반환
      return response
        .status(dhlResponse.status)
        .json(dhlResponse.data);
        
    } catch (error) {
      // 에러 처리 유틸리티 함수 사용
      return handleApiError(response, error, 'Error calling DHL Rates API');
    }
  });
});

// 추가 DHL 관련 API 함수들
exports.trackShipment = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // HTTP 메소드 검증
      if (request.method !== 'GET') {
        return response.status(405).json({ 
          error: 'Method not allowed. Please use GET.' 
        });
      }

      // 트래킹 번호 검증
      const trackingNumber = request.query.trackingNumber;
      if (!trackingNumber) {
        return response.status(400).json({ 
          error: 'Missing trackingNumber parameter' 
        });
      }

      // DHL API 호출
      const dhlResponse = await axios({
        method: 'get',
        url: `${DHL_API_BASE_URL}/test/shipments/${trackingNumber}/tracking`,
        headers: getDhlHeaders(),
        validateStatus: () => true
      });

      // DHL API 응답 반환
      return response
        .status(dhlResponse.status)
        .json(dhlResponse.data);
        
    } catch (error) {
      return handleApiError(response, error, 'Error tracking DHL shipment');
    }
  });
});

// 필요한 경우 더 많은 DHL 관련 API 함수들을 여기에 추가할 수 있습니다