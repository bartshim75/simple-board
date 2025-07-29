'use client';

import { useState } from 'react';
import { ContentItemWithLikes } from '@/types';
import { Trash2, ExternalLink, Clock, Type, Image as ImageIcon, Link, File, Download, User } from 'lucide-react';
import { getRelativeTime } from '@/lib/utils';
import LikeButton from './LikeButton';

interface ContentCardProps {
  item: ContentItemWithLikes;
  isOwner: boolean;
  userIdentifier: string;
  onDelete: () => void;
  onClick: () => void;
  onLikeCountChange?: (newCount: number) => void;
}

export default function ContentCard({ 
  item, 
  isOwner, 
  userIdentifier,
  onDelete, 
  onClick,
  onLikeCountChange 
}: ContentCardProps) {
  const [imageError, setImageError] = useState(false);

  // 개발 모드에서만 로그 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('ContentCard rendering:', { 
      itemId: item.id, 
      userIdentifier, 
      likeCount: item.like_count,
      isOwner 
    });
  }

  const getTypeIcon = () => {
    switch (item.type) {
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'link':
        return <Link className="w-4 h-4" />;
      case 'file':
        return <File className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'text':
        return 'text-blue-600 bg-blue-100';
      case 'image':
        return 'text-green-600 bg-green-100';
      case 'link':
        return 'text-purple-600 bg-purple-100';
      case 'file':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleLinkClick = () => {
    if (item.type === 'link' && item.link_url) {
      window.open(item.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFileDownload = () => {
    if (item.type === 'file' && item.file_url && item.file_name) {
      const link = document.createElement('a');
      link.href = item.file_url;
      link.download = item.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md group cursor-pointer"
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between min-h-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`p-1 rounded-md flex-shrink-0 ${getTypeColor()}`}>
              {getTypeIcon()}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0 flex-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getRelativeTime(item.created_at)}</span>
              {item.author_name && (
                <>
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="text-gray-600 font-medium truncate max-w-24">{item.author_name}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <LikeButton
              contentItemId={item.id}
              userIdentifier={userIdentifier}
              initialLikeCount={item.like_count}
              onLikeCountChange={onLikeCountChange}
            />
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                title="삭제"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-3">
        {/* 제목 */}
        {item.title && (
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
            {item.title}
          </h3>
        )}

        {/* 타입별 컨텐츠 렌더링 */}
        {item.type === 'text' && (
          <div className="text-gray-700 whitespace-pre-wrap text-xs leading-relaxed line-clamp-3">
            {item.content}
          </div>
        )}

        {item.type === 'image' && (
          <div className="space-y-2">
            {item.image_url && !imageError ? (
              <div className="relative">
                <img
                  src={item.image_url}
                  alt={item.title || '이미지'}
                  onError={() => setImageError(true)}
                  className="w-full h-auto rounded-md object-cover max-h-32"
                />
              </div>
            ) : (
              <div className="w-full h-24 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-xs">이미지를 불러올 수 없습니다</p>
                </div>
              </div>
            )}
            {item.content && (
              <p className="text-gray-700 text-xs line-clamp-2">{item.content}</p>
            )}
          </div>
        )}

        {item.type === 'link' && (
          <div className="space-y-2">
            {item.link_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkClick();
                }}
                className="w-full p-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors text-left group/link"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">
                      {item.title || '링크'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.link_url}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover/link:text-blue-600 transition-colors flex-shrink-0 ml-1" />
                </div>
              </button>
            )}
            {item.content && (
              <p className="text-gray-700 text-xs line-clamp-2">{item.content}</p>
            )}
          </div>
        )}

        {item.type === 'file' && (
          <div className="space-y-2">
                         {item.file_url && (
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   handleFileDownload();
                 }}
                 className="w-full p-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors text-left group/file"
               >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="w-6 h-6 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 group-hover/file:text-orange-600 transition-colors truncate">
                        {item.file_name || item.title || '파일'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {item.file_size && (
                          <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Download className="w-3 h-3 text-gray-400 group-hover/file:text-orange-600 transition-colors flex-shrink-0 ml-1" />
                </div>
              </button>
            )}
            {item.content && (
              <p className="text-gray-700 text-xs line-clamp-2">{item.content}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 