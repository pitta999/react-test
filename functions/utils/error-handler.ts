interface ErrorResponse {
  statusCode: number;
  message: string;
}

export const handleError = (error: unknown): ErrorResponse => {
  if (error instanceof Error) {
    switch (error.message) {
      case "DHL API key is not configured":
        return {
          statusCode: 500,
          message: "서버 설정 오류: DHL API 키가 설정되지 않았습니다.",
        };
      case "Failed to calculate shipping rate":
        return {
          statusCode: 400,
          message: "배송비 계산에 실패했습니다. 입력값을 확인해주세요.",
        };
      default:
        return {
          statusCode: 500,
          message: "서버 오류가 발생했습니다.",
        };
    }
  }

  return {
    statusCode: 500,
    message: "알 수 없는 오류가 발생했습니다.",
  };
}; 