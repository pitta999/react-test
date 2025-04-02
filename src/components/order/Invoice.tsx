import React, { useState, useEffect } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order, User, MyInfo, Product } from 'types/schema';
import { notoSansKrRegular } from 'jspdf-font';
import { db } from 'firebaseApp';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from 'types/schema';

interface InvoiceProps {
  order: Order;
  user: User;
  myInfo: MyInfo;
}

function removeLineBreaks(text: string) {
  if (!text) return '';
  // 모든 개행 문자(\n, \r\n 등)를 공백으로 대체
  return text.replace(/(\r\n|\n|\r)/gm, " ");
}

export default function Invoice({ order, user, myInfo }: InvoiceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<{ [key: string]: Product }>({});

  useEffect(() => {
    const fetchProducts = async () => {
      const productPromises = order.items.map(async (item) => {
        const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, item.productId));
        if (productDoc.exists()) {
          return { [item.productId]: { ...productDoc.data(), id: productDoc.id } as Product };
        }
        return null;
      });

      const productResults = await Promise.all(productPromises);
      const productMap = productResults.reduce<{ [key: string]: Product }>((acc, curr) => {
        if (curr) {
          return { ...acc, ...curr };
        }
        return acc;
      }, {});

      setProducts(productMap);
    };

    fetchProducts();
  }, [order.items]);

  const generateInvoice = (download: boolean = false) => {
    const doc = new jsPDF();
    var img = new Image();
    img.src = '/images/blackvue-logo-re.png';
    doc.addImage(img, 'PNG',10,10,48,8);


    autoTable(doc, {
      body: [
        [{ content: 'PROFORMA INVOICE', styles: { fontStyle: 'bold' , fontSize: 18} }, 
         { content: `Invoice No : ${order.orderId}\nDate : ${new Date().toLocaleDateString()}` }],
        [{ content: 'Shipper/Exporter', styles: { fontStyle: 'bold' } }, 
         { content: 'Sold to / Bill to', styles: { fontStyle: 'bold' } }],
        [{ content: `${myInfo.companyName}\nAddress : ${myInfo.address}\nTel : ${myInfo.telNo}\nFax : ${myInfo.faxNo}`}, 
         { content: `${user.fullCompanyName}\nVAT No : ${user.vatNumber}\n${user.companyAddress}\nATTN : ${user.personInCharge.name}\nTel : ${user.telNo}\nEmail : ${user.email}` }],
        [{ content: 'Ship to', styles: { fontStyle: 'bold' } }, 
         { content: 'Terms and conditions', styles: { fontStyle: 'bold' } }],
        [{ content: `${order.shipTo.companyName}\n${order.shipTo.address}\nATTN : ${order.shipTo.contactName}\nTel : ${order.shipTo.telNo}\nEmail : ${order.shipTo.email}` }, 
         { content: `Payment Terms : ????????????????\nTerms of Price : ${order.shippingTerms === 'FOB' ? 'FOB' : 'CFR'}` }],
        
    
      ],
      startY: 20,
      theme: 'grid',
      
      styles: { fontSize: 8, font: 'helvetica', fontStyle: 'normal', overflow: 'hidden', cellPadding: 1  },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 },        
      },
      
    });

    autoTable(doc, {
      body: [
        [{ content: `PORT OF LOADING`,styles: { fontStyle: 'bold' }},
          { content: `FINAL DESTINATION`,styles: { fontStyle: 'bold' }},
          { content: `Carrier`,styles: { fontStyle: 'bold' }},
          { content: `Sailing on/or about`,styles: { fontStyle: 'bold' }},
         ],
        [{ content: `incheon Airpot, Incheon, Republic of Korea`},
         { content: `${order.shipTo.address.split(',').pop()?.trim()}`},
         { content: `????????`},
         { content: `???????`},
        ],
      ],
      startY: (doc as any).lastAutoTable.finalY,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica', fontStyle: 'normal', overflow: 'hidden', cellPadding: 1  },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
      },
      footStyles: { fillColor: [220, 220, 220] },
    });


    
    
    // 카테고리별로 아이템 그룹화
    const groupedItems = order.items.reduce((acc, item) => {
      const category = item.categoryName;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as { [key: string]: typeof order.items });

    // 테이블 행 생성
    const tableRows: any[] = [];
    let totalAmount = 0;

    tableRows.push([{content: 'Item', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center' }}, 
                   {content: 'Description of Goods', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center'}}, 
                   {content: 'Hs code', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center'}}, 
                   {content: 'ORG', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center'}}, 
                   {content: 'QYT\nPCS', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center'}}, 
                   {content: 'UNIT\nUSD', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center'}}, 
                   {content: 'AMOUNT\nUSD', styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230], halign: 'center'}}]);

    // 카테고리 순서 정의
    const categoryOrder = ['dashcam', 'accessory', 'companion'];

    // 각 카테고리별로 행 추가
    categoryOrder.forEach(category => {
      if (groupedItems[category]) {
        // 카테고리 헤더 추가
        tableRows.push([{
          content: category,
          styles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
          colSpan: 7
        }]);

        // 카테고리 아이템 추가
        groupedItems[category].forEach(item => {
          const itemAmount = (item.discountPrice || item.price) * item.quantity;
          totalAmount += itemAmount;
          
          tableRows.push([
            item.name,
            removeLineBreaks(products[item.productId]?.description || ''),
            products[item.productId]?.hsCode || '',
            products[item.productId]?.origin || '',
            item.quantity.toString(),
            `$${item.discountPrice || item.price}`,
            `$${itemAmount.toFixed(2)}`
          ]);
        });

        // 카테고리 소계 추가
        const categorySubtotal = groupedItems[category].reduce((sum, item) => 
          sum + ((item.discountPrice || item.price) * item.quantity), 0);
        
        tableRows.push([
          { content: `${category} Subtotal:`, colSpan: 6, styles: { fontStyle: 'bold' } },
          { content: `$${categorySubtotal.toFixed(2)}`, styles: { fontStyle: 'bold' } }
        ]);
      }
    });

    // 최종 소계, 배송비, 총액 행 추가
    tableRows.push(
      [{ content: 'Total Subtotal:', colSpan: 6, styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230] } },
       { content: `$${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230] } }],
      [{ content: 'Shipping:', colSpan: 6, styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230] } },
       { content: `$${order.shippingCost?.toFixed(2) || '0.00'}`, styles: { fontStyle: 'bold' ,fillColor: [230, 230, 230] } }],
      [{ content: 'Total Amount:', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
       { content: `$${order.totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [230, 230, 230]} }]
    );

    // 테이블 생성
    autoTable(doc, {
      body: tableRows,
      startY: (doc as any).lastAutoTable.finalY,
      theme: 'grid',
      styles: { fontSize: 8 , overflow: 'hidden', cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 50},
        1: { cellWidth: 40 },
        2: { cellWidth: 20},
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 15, halign: 'right'},
        5: { cellWidth: 15, halign: 'right'},
        6: { cellWidth: 25, halign: 'right'}
      },
      footStyles: { fillColor: [200, 200, 200] }
    });
    

    autoTable(doc, {
      body: [
        [{ content: 'Origin :', styles: { fontStyle: 'bold' } }, 
         { content: `${myInfo.shippingInfo.origin}` }],
        [{ content: `Shipment :`, styles: { fontStyle: 'bold' } }, 
          { content: `${myInfo.shippingInfo.shipment}` }],
        [{ content: `Packing :` , styles: { fontStyle: 'bold' } }, 
          { content: `${myInfo.shippingInfo.packing}` }],
        [{ content: `Validity :` , styles: { fontStyle: 'bold' } },
          { content: `${myInfo.shippingInfo.validity}` }],
        [{ content: `Bank Reference :` , styles: { fontStyle: 'bold' } },
          { content: `${myInfo.bankInfo.bankName}` }],
        [{ content: `SWIFT Code :` , styles: { fontStyle: 'bold' } },
          { content: `${myInfo.bankInfo.swiftCode}` }],
        [{ content: `Account Name :` , styles: { fontStyle: 'bold' } },
          { content: `${myInfo.bankInfo.accountHolder}` }],
        [{ content: `Account Number :` , styles: { fontStyle: 'bold' } },
          { content: `${myInfo.bankInfo.accountNumber}` }],
      ],
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'plain',
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 , overflow: 'hidden' , cellPadding: 0},
        1: { cellWidth: 155 , overflow: 'hidden' , cellPadding: 0},
        
      },
    });

    // 주문 정보
    // doc.setFontSize(12);
    // doc.text('Origin : ', 20, 120);
    // doc.setFontSize(12);
    // doc.text(`Order ID: ${order.orderId}`, 20, 125);
    // doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 130);
    // doc.text(`Status: ${order.status}`, 20, 135);

    // 메모
    // if (order.notes) {
    //   doc.setFontSize(12);
    //   doc.text('Notes:', 20, (doc as any).lastAutoTable.finalY + 20);
    //   doc.setFontSize(10);
    //   doc.text(order.notes, 20, (doc as any).lastAutoTable.finalY + 25);
    // }

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
          Preview
        </button>
        <button
          onClick={() => generateInvoice(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Download
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