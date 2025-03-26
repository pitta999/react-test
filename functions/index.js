// functions/index.js
const functions = require('firebase-functions');
const dhlService = require('./services/dhl-service');

// 모든 API 함수들을 내보냅니다
exports.getDhlRates = dhlService.getDhlRates;

// 다른 서비스들도 필요하면 여기에 추가
// exports.otherFunction = otherService.otherFunction;