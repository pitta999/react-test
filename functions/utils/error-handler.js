// functions/utils/error-handler.js

/**
 * API 에러 처리를 위한 공통 함수
 * 
 * @param {Object} response - Express 응답 객체
 * @param {Error} error - 발생한 에러 객체
 * @param {String} message - 로그 및 응답에 포함할 에러 메시지
 * @return {Object} 포맷된 에러 응답
 */
exports.handleApiError = (response, error, message = 'API Error') => {
    // 에러 로깅
    console.error(message, error);
    
    // 응답 객체 초기화
    const errorResponse = {
      error: 'Error processing request',
      message: error.message || 'Unknown error occurred'
    };
    
    // axios 응답 에러인 경우 추가 정보 포함
    if (error.response) {
      errorResponse.status = error.response.status;
      errorResponse.details = error.response.data;
    }
    
    // HTTP 상태 결정
    const statusCode = error.response?.status || 500;
    
    // 응답 반환
    return response.status(statusCode).json(errorResponse);
  };
  
  /**
   * 데이터 유효성 검사 에러 처리 함수
   * 
   * @param {Object} response - Express 응답 객체
   * @param {Array|String} validationErrors - 유효성 검사 오류 목록 또는 메시지
   * @return {Object} 포맷된 유효성 검사 에러 응답
   */
  exports.handleValidationError = (response, validationErrors) => {
    // 에러 객체 구성
    const errorResponse = {
      error: 'Validation Error',
      details: Array.isArray(validationErrors) 
        ? validationErrors 
        : [validationErrors]
    };
    
    // 400 Bad Request 응답 반환
    return response.status(400).json(errorResponse);
  };