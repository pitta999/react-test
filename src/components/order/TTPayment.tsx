import React, { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from 'firebaseApp';
import { COLLECTIONS, Order } from 'types/schema';
import { toast } from 'react-toastify';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface TTPaymentProps {
  order: Order;
  userId: string;
  userEmail: string;
  onOrderUpdate?: (updatedOrder: Order) => void;
}

export default function TTPayment({ order, userId, userEmail, onOrderUpdate }: TTPaymentProps) {
  const [isProcessingTT, setIsProcessingTT] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleTTPayment = async () => {
    try {
      setIsProcessingTT(true);
      
      // T/T 결제 정보 업데이트
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        paymentMethod: 'tt',
        paymentStatus: 'pending',
        ttPayment: {
          remittanceFiles: [],
          status: 'pending'
        },
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || userId
      });

      toast.success('T/T payment request submitted.');
      
      // 주문 정보 업데이트 콜백 실행
      if (onOrderUpdate) {
        const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
        if (updatedOrderDoc.exists()) {
          const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
          onOrderUpdate(updatedOrderData);
        }
      }
    } catch (error) {
      console.error('T/T payment request error:', error);
      toast.error('T/T payment request error.');
    } finally {
      setIsProcessingTT(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      const storage = getStorage();
      const fileId = uuidv4();
      const fileRef = ref(storage, `remittance/${order.id}/${fileId}_${selectedFile.name}`);
      
      // 파일 업로드
      await uploadBytes(fileRef, selectedFile);
      const downloadURL = await getDownloadURL(fileRef);

      // Firestore에 파일 정보 추가
      const newFile = {
        id: fileId,
        name: selectedFile.name,
        url: downloadURL,
        uploadedAt: new Date().toISOString()
      };

      const currentFiles = order.ttPayment?.remittanceFiles || [];
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        'ttPayment.remittanceFiles': [...currentFiles, newFile],
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || userId
      });

      toast.success('Remittance file uploaded successfully');
      setSelectedFile(null);

      // 주문 정보 업데이트 콜백 실행
      if (onOrderUpdate) {
        const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
        if (updatedOrderDoc.exists()) {
          const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
          onOrderUpdate(updatedOrderData);
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string, fileName: string) => {
    try {
      setIsUploading(true);
      const storage = getStorage();
      const fileRef = ref(storage, `remittance/${order.id}/${fileId}_${fileName}`);
      
      // Storage에서 파일 삭제
      await deleteObject(fileRef);

      // Firestore에서 파일 정보 삭제
      const currentFiles = order.ttPayment?.remittanceFiles || [];
      const updatedFiles = currentFiles.filter(file => file.id !== fileId);
      
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        'ttPayment.remittanceFiles': updatedFiles,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || userId
      });

      toast.success('File deleted successfully');

      // 주문 정보 업데이트 콜백 실행
      if (onOrderUpdate) {
        const updatedOrderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, order.id));
        if (updatedOrderDoc.exists()) {
          const updatedOrderData = { ...updatedOrderDoc.data(), id: updatedOrderDoc.id } as Order;
          onOrderUpdate(updatedOrderData);
        }
      }
    } catch (error) {
      console.error('File deletion error:', error);
      toast.error('Failed to delete file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleTTPayment}
        disabled={isProcessingTT || order.paymentMethod === 'tt'}
        className={`min-w-[120px] py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
          (isProcessingTT || order.paymentMethod === 'tt') ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isProcessingTT ? 'Processing...' : 'T/T Payment'}
      </button>

      {order.paymentMethod === 'tt' && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Remittance Files</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-4">
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                >
                  Choose File
                </label>
                {selectedFile && (
                  <span className="ml-2 text-sm text-gray-500">{selectedFile.name}</span>
                )}
              </div>
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || isUploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {order.ttPayment?.remittanceFiles && order.ttPayment.remittanceFiles.length > 0 && (
              <div className="mt-4">
                <ul className="divide-y divide-gray-200">
                  {order.ttPayment.remittanceFiles.map((file) => (
                    <li key={file.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          {file.name}
                        </a>
                        <span className="ml-2 text-xs text-gray-500">
                          {new Date(file.uploadedAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleFileDelete(file.id, file.name)}
                        disabled={isUploading}
                        className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 