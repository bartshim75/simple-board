'use client';

import { useState } from 'react';
import { ContentItem } from '@/types';
import { Trash2, ExternalLink, Clock, Type, Image as ImageIcon, Link, File, Download, User } from 'lucide-react';
import { getRelativeTime } from '@/lib/utils';

interface ContentCardProps {
  item: ContentItem;
  isOwner: boolean;
  onDelete: () => void;
  onClick: () => void;
}

export default function ContentCard({ item, isOwner, onDelete, onClick }: ContentCardProps) {
  const [imageError, setImageError] = useState(false);

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
      className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg group cursor-pointer"
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${getTypeColor()}`}>
              {getTypeIcon()}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-3 h-3" />
              {getRelativeTime(item.created_at)}
              {item.author_name && (
                <>
                  <span className="text-gray-300">•</span>
                  <User className="w-3 h-3" />
                  <span className="text-gray-600 font-medium">{item.author_name}</span>
                </>
              )}
            </div>
          </div>
          
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4">
        {/* 제목 */}
        {item.title && (
          <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">
            {item.title}
          </h3>
        )}

        {/* 타입별 컨텐츠 렌더링 */}
        {item.type === 'text' && (
          <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {item.content}
          </div>
        )}

        {item.type === 'image' && (
          <div className="space-y-3">
            {item.image_url && !imageError ? (
              <div className="relative">
                <img
                  src={item.image_url}
                  alt={item.title || '이미지'}
                  onError={() => setImageError(true)}
                  className="w-full h-auto rounded-lg object-cover max-h-64"
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">이미지를 불러올 수 없습니다</p>
                </div>
              </div>
            )}
            {item.content && (
              <p className="text-gray-700 text-sm">{item.content}</p>
            )}
          </div>
        )}

        {item.type === 'link' && (
          <div className="space-y-3">
            {item.link_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkClick();
                }}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left group/link"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">
                      {item.title || '링크'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {item.link_url}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover/link:text-blue-600 transition-colors flex-shrink-0 ml-2" />
                </div>
              </button>
            )}
            {item.content && (
              <p className="text-gray-700 text-sm">{item.content}</p>
            )}
          </div>
        )}

        {item.type === 'file' && (
          <div className="space-y-3">
                         {item.file_url && (
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   handleFileDownload();
                 }}
                 className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left group/file"
               >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-8 h-8 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover/file:text-orange-600 transition-colors truncate">
                        {item.file_name || item.title || '파일'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        {item.file_type && <span>{item.file_type}</span>}
                        {item.file_size && (
                          <>
                            {item.file_type && <span>•</span>}
                            <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover/file:text-orange-600 transition-colors flex-shrink-0 ml-2" />
                </div>
              </button>
            )}
            {item.content && (
              <p className="text-gray-700 text-sm">{item.content}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 