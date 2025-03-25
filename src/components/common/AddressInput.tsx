import React, { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface AddressInputProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressInput({ value, onChange, placeholder = "주소를 입력하거나 선택해주세요", className = "" }: AddressInputProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Google Maps 스크립트 로드
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API 키가 설정되지 않았습니다.');
      console.error('REACT_APP_GOOGLE_MAPS_API_KEY is not defined');
      return;
    }

    // 스크립트가 이미 로드되었는지 확인
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // 이미 DOM에 스크립트가 있는지 확인
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setIsLoaded(true);
      });
      return;
    }

    // 새 스크립트 생성 및 로드
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&language=en`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps API 로드 완료');
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      const errorMsg = 'Google Maps 스크립트 로드 실패';
      console.error(errorMsg);
      setError(errorMsg);
    };
    
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && !window.google) {
        const scriptToRemove = document.getElementById('google-maps-script');
        if (scriptToRemove && scriptToRemove.parentNode) {
          scriptToRemove.parentNode.removeChild(scriptToRemove);
        }
      }
    };
  }, []);

  // Google Maps가 로드된 후 Autocomplete 설정
  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      console.log('Autocomplete 초기화 시작');
      
      // Autocomplete 인스턴스 생성
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['formatted_address'],
        language: 'en'  // 결과를 영어로 표시
      });

      // 장소 선택 이벤트 리스너
      const placeChangedListener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        console.log('선택된 장소:', place);
        
        if (place.formatted_address) {
          onChange(place.formatted_address);
        }
      });

      // 클린업 함수
      return () => {
        if (placeChangedListener) {
          window.google.maps.event.removeListener(placeChangedListener);
        }
      };
    } catch (error) {
      console.error('Google Places Autocomplete 설정 오류:', error);
      setError('주소 검색 기능 초기화 중 오류가 발생했습니다.');
    }
  }, [isLoaded, onChange]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${className}`}
        disabled={!isLoaded}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 rounded-md">
          <span className="text-sm text-gray-500">주소 검색 기능 로드 중...</span>
        </div>
      )}
      {error && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
} 