import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order, User } from 'types/schema';

interface InvoiceProps {
  order: Order;
  user: User;
}

export default function Invoice({ order, user }: InvoiceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateInvoice = async (download: boolean = false) => {
    if (!invoiceRef.current || isGenerating) return;
    
    try {
      setIsGenerating(true);
      
      // 1. DOM 요소를 Canvas로 변환
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 1.5, // 해상도 조정 (너무 높으면 문제가 생길 수 있음)
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff' // 배경색 명시적 지정
      });
      
      // 2. PDF 생성
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 3. PDF 크기 계산
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 4. 이미지 압축 및 품질 설정
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG 형식 & 95% 품질로 변경
      
      // 5. 첫 페이지에 이미지 추가
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // 6. 여러 페이지 처리 (문서가 A4 사이즈보다 긴 경우)
      let heightLeft = imgHeight;
      let position = 0;
      
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // 7. PDF 출력
      if (download) {
        pdf.save(`invoice-${order.orderId}.pdf`);
      } else {
        const pdfUrl = pdf.output('datauristring');
        setPdfUrl(pdfUrl);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("PDF 생성 오류:", error);
      alert("PDF 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 셀 공통 스타일
  const cellStyle = {
    padding: "3px 5px", // 상하 3px, 좌우 5px로 축소
    border: "1px solid #ddd",
    fontSize: "12px", // 글자 크기 축소
    lineHeight: "1.2" // 줄 간격 축소
  };

  // div 스타일 - 간격 최소화
  const divStyle = {
    margin: "0",
    padding: "0"
  };

  // 헤더 셀 스타일
  const headerCellStyle = {
    ...cellStyle,
    backgroundColor: "#2980b9",
    color: "white",
    fontWeight: "bold",
    padding: "3px 5px" // 헤더도 패딩 축소
  };

  // 빈 셀 스타일
  const emptyCellStyle = {
    ...cellStyle,
    padding: "0" // 빈 셀은 패딩 제거
  };

  // 볼드 텍스트 스타일
  const boldTextStyle = {
    ...cellStyle,
    fontWeight: "bold"
  };


  return (
    <>
      <div className="flex space-x-2">
        <button
          onClick={() => generateInvoice(false)}
          disabled={isGenerating}
          className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isGenerating ? '생성 중...' : '미리보기'}
        </button>
        <button
          onClick={() => generateInvoice(true)}
          disabled={isGenerating}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isGenerating ? '생성 중...' : '다운로드'}
        </button>
      </div>

      {/* 인보이스 HTML 템플릿 (hidden이 아닌 화면 밖으로 위치시킴) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={invoiceRef} className="bg-white p-8" style={{ width: "800px", fontFamily: "Arial, sans-serif" }}>
          {/* 인보이스 헤더 */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div><img src="/images/blackvue-logo-re.png" alt="logo" style={{ width: "200px" }} /></div>
          </div>

          {/* 회사 및 고객 정보 */}
          <table style={{width: "100%",borderCollapse: "collapse"}}>
            <tbody>
              <tr>
                <td style={cellStyle}>
                  <div style={divStyle}>PROFORMA INVOICE</div>
                </td>
                <td style={cellStyle}>
                  <div style={boldTextStyle}>Invoice No : 111111</div>
                  <div style={boldTextStyle}>Date : {new Date().toLocaleDateString()}</div>
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  <div style={divStyle}><b>Shipper/Exporter</b></div>
                  <div style={divStyle}>Pittasoft Co. Ltd.</div>
                  <div style={divStyle}>Address : (13488) ABN Tower 4f, 331, Pangyo-ro, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea</div>
                  <div style={divStyle}>Tel : +82-31-8039-7789</div>
                  <div style={divStyle}>Fax : +82-31-8039-5253</div>
                  <div style={divStyle}>Email : info@pittasoft.com</div>
                </td>
                <td style={cellStyle}>
                  <div style={divStyle}><b>Sold to / Bill to</b></div>
                  <div style={divStyle}>{user.fullCompanyName}</div>
                  <div style={divStyle}>{user.companyAddress}</div>
                  <div style={divStyle}>{user.personInCharge.name}</div>
                  <div style={divStyle}>{user.telNo}</div>
                  <div style={divStyle}>{user.email}</div>
                </td>
              </tr>
              <tr>
                <td style={cellStyle}>
                  <div style={divStyle}><b>Ship to</b></div>
                  <div style={divStyle}>{user.fullCompanyName}</div>
                  <div style={divStyle}>{order.shippingAddress}</div>
                  <div style={divStyle}>{user.personInCharge.name}</div>
                  <div style={divStyle}>{user.telNo}</div>
                  <div style={divStyle}>{user.email}</div>
                </td>
                <td style={cellStyle}>
                  <div style={divStyle}><b>Terms and conditions</b></div>
                  <div style={divStyle}>Payment Terms : ????????????????</div>
                  <div style={divStyle}>Terms of Price : {order.shippingTerms === 'FOB' ? 'FOB' : 'CFR'}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 주문 항목 테이블 */}
          <table style={{width: "100%",borderCollapse: "collapse", marginBottom: "20px"}}>
            <thead>
              <tr>
                <th style={{...headerCellStyle, width: "35%"}}>Item</th>
                <th style={{...headerCellStyle, width: "20%"}}>Category</th>
                <th style={{...headerCellStyle, width: "15%"}}>Price</th>
                <th style={{...headerCellStyle, width: "15%"}}>Quantity</th>
                <th style={{...headerCellStyle, width: "15%"}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td style={cellStyle}>{item.name}</td>
                  <td style={cellStyle}>{item.categoryName}</td>
                  <td style={cellStyle}>${item.discountPrice || item.price}</td>
                  <td style={cellStyle}>{item.quantity}</td>
                  <td style={cellStyle}>${((item.discountPrice || item.price) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{...cellStyle, padding: "0"}}></td>
                <td style={{...cellStyle, fontWeight: "bold"}}>Subtotal:</td>
                <td style={cellStyle}>${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{...cellStyle, padding: "0"}}></td>
                <td style={{...cellStyle, fontWeight: "bold"}}>Shipping:</td>
                <td style={cellStyle}>${order.shippingCost?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{...cellStyle, padding: "0"}}></td>
                <td style={{...cellStyle, fontWeight: "bold"}}>Total:</td>
                <td style={{...cellStyle, fontWeight: "bold"}}>${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* 주문 메모 */}
          {order.notes && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "5px" }}>Notes:</h3>
              <p style={{ fontSize: "14px" }}>{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* PDF 미리보기 모달 */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Invoice Preview
                      </h3>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="w-full h-[600px]">
                      {pdfUrl && (
                        <iframe
                          src={pdfUrl}
                          className="w-full h-full"
                          title="Invoice Preview"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}