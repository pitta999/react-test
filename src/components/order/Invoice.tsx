import React from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order, User } from 'types/schema';

interface InvoiceProps {
  order: Order;
  user: User;
}

export default function Invoice({ order, user }: InvoiceProps) {
  const generateInvoice = () => {
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

    // PDF 다운로드
    doc.save(`invoice-${order.orderId}.pdf`);
  };

  return (
    <button
      onClick={generateInvoice}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
    >
      Download Invoice
    </button>
  );
} 