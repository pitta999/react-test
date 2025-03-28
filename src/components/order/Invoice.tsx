import React, { useState } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order, User, MyInfo } from 'types/schema';
import { notoSansKrRegular } from 'jspdf-font';

interface InvoiceProps {
  order: Order;
  user: User;
  myInfo: MyInfo;
}

export default function Invoice({ order, user, myInfo }: InvoiceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generateInvoice = (download: boolean = false) => {
    const doc = new jsPDF();

    // NotoSansKR 폰트 등록
    // doc.addFileToVFS('NotoSansKR-Regular.ttf', notoSansKrRegular);
    // doc.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
    // doc.setFont('NotoSansKR');
    
    // 회사 정보
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });


    const htmlTable = document.createElement('table');
    htmlTable.innerHTML = `
      <tr>
        <td>PROFORMA INVOICE</td>
        <td>Invoice No : 111111<br>Date : ${new Date().toLocaleDateString()}</td>
      </tr>
      <tr>
        <td>
          <b>Shipper/Exporter</b><br>
          Pittasoft Co. Ltd.<br>
          Address : (13488) ABN Tower 4f, 331, Pangyo-ro, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea<br>
          Tel : +82-31-8039-7789<br>
          Fax : +82-31-8039-5253<br>
          Email : info@pittasoft.com
        </td>
        <td>
        <b>Sold to / Bill to</b><br>
        ${user.fullCompanyName}<br>
        ${user.companyAddress}<br>
        ${user.personInCharge.name}<br>
        ${user.telNo}<br>
        ${user.email}
        </td>
      </tr>
      <tr>
        <td>
          <b>Ship to</b><br>
          ${user.fullCompanyName}<br>
          
          ${user.personInCharge.name}<br>
          ${user.telNo}<br>
          ${user.email}
        </td>
        <td>
          <b>Terms and conditions</b><br>
          Payment Terms : ????????????????<br>
          Terms of Price : ${order.shippingTerms === 'FOB' ? 'FOB' : 'CFR'}
        </td>
      </tr>
    `;

    autoTable(doc, {
      body: [
        [{ content: 'PROFORMA INVOICE', styles: { fontStyle: 'bold' } }, 
         { content: `Invoice No : 111111\nDate : ${new Date().toLocaleDateString()}` }],
        [{ content: 'Shipper/Exporter', styles: { fontStyle: 'bold' } }, 
         { content: 'Sold to / Bill to', styles: { fontStyle: 'bold' } }],
        [{ content: `Pittasoft Co. Ltd.\nAddress : (13488)...` }, 
         { content: `${user.fullCompanyName}\n${user.companyAddress}...` }]
      ],
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10, font: 'helvetica', fontStyle: 'normal', },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 },
        
        
      },
      footStyles: { fillColor: [41, 128, 185] },
    });




    // 테이블 헤더
    const tableColumn = ['Item', 'Category', 'Price', 'Quantity', 'Total'];
    const tableRows = order.items.map(item => [
      item.name,
      item.categoryName,
      `$${item.discountPrice || item.price}`,
      item.quantity.toString(),
      `$${((item.discountPrice || item.price) * item.quantity).toFixed(2)}`
    ]);

    // 소계, 배송비, 총액 행 추가
    tableRows.push(
      ['', '', '', 'Subtotal:', `$${order.subtotal.toFixed(2)}`],
      ['', '', '', 'Shipping:', `$${order.shippingCost?.toFixed(2) || '0.00'}`],
      ['', '', '', 'Total:', `$${order.totalAmount.toFixed(2)}`]
    );

    // 테이블 생성
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 140,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 }
      },
      footStyles: { fillColor: [41, 128, 185] }
    });
    
    // 주문 정보
    // doc.setFontSize(14);
    // doc.text('Order Details:', 20, 120);
    // doc.setFontSize(12);
    // doc.text(`Order ID: ${order.orderId}`, 20, 125);
    // doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 130);
    // doc.text(`Status: ${order.status}`, 20, 135);

    // 메모
    if (order.notes) {
      doc.setFontSize(12);
      doc.text('Notes:', 20, (doc as any).lastAutoTable.finalY + 20);
      doc.setFontSize(10);
      doc.text(order.notes, 20, (doc as any).lastAutoTable.finalY + 25);
    }

    if (download) {
      // PDF 다운로드
      doc.save(`invoice-${order.orderId}.pdf`);
    } else {
      // PDF 미리보기 URL 생성
      const pdfUrl = doc.output('datauristring');
      setPdfUrl(pdfUrl);
      setShowPreview(true);
    }
  };

  return (
    <>
      <div className="flex space-x-2">
        <button
          onClick={() => generateInvoice(false)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          미리보기
        </button>
        <button
          onClick={() => generateInvoice(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          다운로드
        </button>
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