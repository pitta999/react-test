import React, { useState } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order, User } from 'types/schema';

interface InvoiceProps {
  order: Order;
  user: User;
}

export default function Invoice({ order, user }: InvoiceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generateInvoice = (download: boolean = false) => {
    const doc = new jsPDF();
    
    // 회사 정보
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Your Company Name', 20, 40);
    doc.text('123 Business Street', 20, 45);
    doc.text('City, State 12345', 20, 50);
    doc.text('Phone: (123) 456-7890', 20, 55);
    doc.text('Email: info@company.com', 20, 60);

    // 청구서 정보
    doc.setFontSize(14);
    doc.text('Bill To:', 20, 80);
    doc.setFontSize(12);
    doc.text(user.fullCompanyName, 20, 85);
    doc.text(user.companyAddress, 20, 90);
    doc.text(`Contact: ${user.personInCharge.name}`, 20, 95);
    doc.text(`Phone: ${user.telNo}`, 20, 100);
    doc.text(`Email: ${user.email}`, 20, 105);

    // 주문 정보
    doc.setFontSize(14);
    doc.text('Order Details:', 20, 120);
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.orderId}`, 20, 125);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 130);
    doc.text(`Status: ${order.status}`, 20, 135);

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