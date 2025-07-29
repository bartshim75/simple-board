'use client';

import { useState, useEffect, useMemo } from 'react';
import { likeContentItem, unlikeContentItem, checkIfLiked, testSupabaseConnection, checkTablesExist, cleanupInvalidLikes, refreshContentView } from '@/lib/supabase';

interface LikeButtonProps {
  contentItemId: string;
  userIdentifier: string;
  initialLikeCount: number;
  onLikeCountChange?: (count: number) => void;
}

export default function LikeButton({ 
  contentItemId, 
  userIdentifier, 
  initialLikeCount,
  onLikeCountChange 
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // initialLikeCount와 likeCount 동기화
  const syncedLikeCount = useMemo(() => {
    if (likeCount !== initialLikeCount) {
      return initialLikeCount;
    }
    return likeCount;
  }, [likeCount, initialLikeCount, contentItemId]);

  useEffect(() => {
    const initializeLikeStatus = async () => {
      try {
        // 먼저 연결 테스트
        console.log('=== Initializing Like Button ===');
        console.log('Content ID:', contentItemId);
        console.log('User ID:', userIdentifier);
        console.log('Initial Count:', initialLikeCount);
        
        const connectionOk = await testSupabaseConnection();
        if (!connectionOk) {
          console.log('Supabase connection failed - Like button will not work');
          return;
        }
        
        // 테이블 존재 여부 확인
        await checkTablesExist();
        
        const liked = await checkIfLiked(contentItemId, userIdentifier);
        setIsLiked(liked);
        if (process.env.NODE_ENV === 'development') {
          console.log('Initial like status:', liked);
        }
        
        // 상태 미스매치 감지 및 수정
        if (liked && initialLikeCount === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ 상태 미스매치 감지: DB에서는 좋아요됨, UI에서는 0개');
            console.log('🔢 setLikeCount(1) 호출');
          }
          setLikeCount(1);
          onLikeCountChange?.(1);
          
          // 뷰 새로고침으로 데이터 동기화
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 뷰 새로고침으로 데이터 동기화...');
          }
          await refreshContentView();
        } else if (!liked && initialLikeCount > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ 상태 미스매치 감지: DB에서는 좋아요안됨, UI에서는 0개 초과');
            console.log('🔢 setLikeCount(0) 호출');
          }
          setLikeCount(0);
          onLikeCountChange?.(0);
          
          // 잘못된 좋아요 데이터 정리
          if (process.env.NODE_ENV === 'development') {
            console.log('🧹 잘못된 좋아요 데이터 정리 시작...');
          }
          await cleanupInvalidLikes(contentItemId, userIdentifier);
          
          // 뷰 새로고침으로 데이터 동기화
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 뷰 새로고침으로 데이터 동기화...');
          }
          await refreshContentView();
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Failed to check initial like status:', String(error));
        }
      }
    };

    if (contentItemId && userIdentifier) {
      initializeLikeStatus();
    }
  }, [contentItemId, userIdentifier, initialLikeCount]);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (!isLiked) {
        // 좋아요 추가
        const result = await likeContentItem(contentItemId, userIdentifier);
        if (result !== null) { // 성공적으로 추가된 경우에만 UI 업데이트
          setIsLiked(true);
          const newCount = likeCount + 1;
          setLikeCount(newCount);
          onLikeCountChange?.(newCount);
          if (process.env.NODE_ENV === 'development') {
            console.log('Like added successfully');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('Like already exists, no UI update needed');
          }
        }
      } else {
        // 좋아요 제거
        await unlikeContentItem(contentItemId, userIdentifier);
        setIsLiked(false);
        const newCount = Math.max(0, likeCount - 1);
        setLikeCount(newCount);
        onLikeCountChange?.(newCount);
        if (process.env.NODE_ENV === 'development') {
          console.log('Like removed successfully');
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = 'Error toggling like: ' + String(error);
        console.log(errorMessage);
        console.log('=== Like Operation Failed ===');
      }
      // 오류 발생 시 UI만 임시로 토글 (실제 DB 연동 실패 시)
      if (!isLiked) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      } else {
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 항상 버튼을 표시 (디버깅을 위해)
  return (
    <button
      onClick={handleLikeClick}
      disabled={isLoading}
      className={`
        flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200
        ${isLiked 
          ? 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100' 
          : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isLiked ? '좋아요 취소' : '좋아요'}
    >
      <svg
        className={`w-4 h-4 transition-all duration-200 ${isLiked ? 'fill-current' : 'fill-none'}`}
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span className={`text-sm font-medium ${syncedLikeCount === 0 ? 'text-gray-400' : ''}`}>
        {syncedLikeCount}
      </span>
    </button>
  );
} 