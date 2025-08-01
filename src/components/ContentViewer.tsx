'use client';

import { useState, useEffect } from 'react';
import { X, Edit3, Download, Save, Type, Image as ImageIcon, Link, File, User, Clock, Folder, Move } from 'lucide-react';
import { ContentItemWithLikes, Category } from '@/types';
import { getRelativeTime, isValidUrl } from '@/lib/utils';
import { getUserIdentifier } from '@/lib/utils';
import LikeButton from './LikeButton';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface ContentViewerProps {
  isOpen: boolean;
  content: ContentItemWithLikes | null;
  category: Category | null;
  categories: Category[];
  isOwner: boolean;
  isAdmin: boolean;
  onClose: () => Promise<void>;
  onCloseCallback?: () => void;
  onUpdate: (updatedContent: Partial<ContentItemWithLikes>) => void;
  onDelete: () => void;
  onMoveToCategory?: (contentId: string, newCategoryId: string) => Promise<void>;
}

export default function ContentViewer({ 
  isOpen, 
  content, 
  category,
  categories,
  isOwner, 
  isAdmin,
  onClose, 
  onUpdate, 
  onDelete,
  onMoveToCategory
}: ContentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAuthorName, setEditAuthorName] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [userIdentifier] = useState(() => getUserIdentifier());
  
  // 카테고리 이동 상태
  const [isMovingCategory, setIsMovingCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // 이미지 로딩 상태 초기화
  useEffect(() => {
    if (content?.type === 'image' && content?.image_url) {
      console.log('ContentViewer - Image data:', {
        type: content.type,
        image_url: content.image_url,
        title: content.title
      });
      setImageLoading(true);
      setImageError(false);
      
      // 이미지가 이미 로드되어 있는지 확인
      const img = new window.Image();
      img.onload = () => {
        console.log('Image preloaded successfully');
        setImageLoading(false);
      };
      img.onerror = () => {
        console.error('Image preload failed');
        setImageError(true);
        setImageLoading(false);
      };
      img.src = content.image_url;
    }
  }, [content]);

  if (!isOpen || !content) return null;

  const startEditing = () => {
    if (!content) return;
    
    setEditTitle(content.title || '');
    setEditContent(content.content || '');
    setEditAuthorName(content.author_name || '');
    setEditLinkUrl(content.link_url || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
    setEditAuthorName('');
    setEditLinkUrl('');
  };

  const startMovingCategory = () => {
    if (!content) return;
    
    setSelectedCategoryId(content.category_id || '');
    setIsMovingCategory(true);
  };

  const cancelMovingCategory = () => {
    setIsMovingCategory(false);
    setSelectedCategoryId('');
  };

  const moveToCategory = async () => {
    if (!content || !onMoveToCategory) return;
    
    if (!selectedCategoryId) {
      toast.error('카테고리를 선택해주세요.');
      return;
    }
    
    try {
      await onMoveToCategory(content.id, selectedCategoryId);
      setIsMovingCategory(false);
      toast.success('카테고리가 변경되었습니다.');
    } catch (error) {
      console.error('Error moving content to category:', error);
      toast.error('카테고리 변경에 실패했습니다.');
    }
  };

  const saveChanges = async () => {
    try {
      const updates: Partial<ContentItemWithLikes> = {
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
        author_name: editAuthorName.trim() || undefined,
      };

      if (content.type === 'link') {
        if (!editLinkUrl.trim()) {
          toast.error('링크 URL을 입력해주세요.');
          return;
        }
        if (!isValidUrl(editLinkUrl)) {
          toast.error('올바른 URL을 입력해주세요.');
          return;
        }
        updates.link_url = editLinkUrl.trim();
      }

      onUpdate(updates);
      setIsEditing(false);
      toast.success('콘텐츠가 수정되었습니다.');
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('콘텐츠 수정에 실패했습니다.');
    }
  };

  const handleImageDownload = async () => {
    if (!content.image_url) return;

    try {
      toast.loading('이미지를 다운로드 중입니다...');
      
      const response = await fetch(content.image_url);
      if (!response.ok) {
        throw new Error('이미지를 가져오는 데 실패했습니다.');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = content.title || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.dismiss();
      toast.success('이미지 다운로드가 시작되었습니다.');

    } catch (error) {
      console.error('Download error:', error);
      toast.dismiss();
      toast.error('이미지 다운로드에 실패했습니다.');
    }
  };

  const handleFileDownload = () => {
    if (content.file_url && content.file_name) {
      const link = document.createElement('a');
      link.href = content.file_url;
      link.download = content.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLinkOpen = () => {
    if (content.link_url) {
      window.open(content.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getTypeIcon = () => {
    switch (content.type) {
      case 'text':
        return <Type className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'link':
        return <Link className="w-5 h-5" />;
      case 'file':
        return <File className="w-5 h-5" />;
      default:
        return <Type className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    switch (content.type) {
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

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getTypeColor()}`}>
              {getTypeIcon()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {content.title || '제목 없음'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{getRelativeTime(content.created_at)}</span>
                {content.author_name && (
                  <>
                    <span className="text-gray-300">•</span>
                    <User className="w-4 h-4" />
                    <span className="text-gray-600 font-medium">{content.author_name}</span>
                  </>
                )}
                {category && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-gray-600 font-medium">{category.name}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <LikeButton
              contentItemId={content.id}
              userIdentifier={userIdentifier}
              initialLikeCount={content.like_count}
              onLikeChange={(newLikeCount) => {
                // 부모 컴포넌트에 업데이트된 content 전달
                onUpdate({ like_count: newLikeCount });
              }}
            />
            {isOwner && !isEditing && (
              <button
                onClick={startEditing}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="수정"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            {(isAdmin || isOwner) && category && (
              <button
                onClick={startMovingCategory}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="카테고리 변경"
              >
                <Move className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={async () => {
                setIsEditing(false);
                setIsMovingCategory(false);
                await onClose();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-4">
              {/* 편집 폼 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작성자 이름
                </label>
                <input
                  type="text"
                  value={editAuthorName}
                  onChange={(e) => setEditAuthorName(e.target.value)}
                  placeholder="작성자 이름을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {content.type === 'link' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    링크 URL
                  </label>
                  <input
                    type="url"
                    value={editLinkUrl}
                    onChange={(e) => setEditLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {content.type === 'text' ? '내용' : '설명'}
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={content.type === 'text' ? '내용을 입력하세요' : '설명을 입력하세요'}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          ) : isMovingCategory ? (
            <div className="space-y-4">
              {/* 카테고리 이동 폼 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  카테고리 변경
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      새로운 카테고리 선택
                    </label>
                                         <select
                       value={selectedCategoryId}
                       onChange={(e) => setSelectedCategoryId(e.target.value)}
                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     >
                       <option value="">카테고리를 선택하세요</option>
                       {categories
                         .filter(cat => cat.id !== category?.id) // 현재 카테고리 제외
                         .map((cat) => (
                           <option key={cat.id} value={cat.id}>
                             {cat.name}
                           </option>
                         ))}
                     </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 컨텐츠 표시 */}
              {content.type === 'text' && (
                <div className="prose max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {content.content}
                  </div>
                </div>
              )}

              {content.type === 'image' && (
                <div className="space-y-4">
                  {content.image_url && !imageError ? (
                    <div className="relative w-full h-[60vh] rounded-lg flex items-center justify-center">
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-gray-600">이미지를 불러오는 중...</p>
                          </div>
                        </div>
                      )}
                      <Image
                        src={content.image_url}
                        alt={content.title || '이미지'}
                        fill
                        style={{ objectFit: 'contain' }}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageError(true)}
                        className={`transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                      />
                      {!imageLoading && (
                        <div className="absolute top-4 right-4">
                          <button
                            onClick={handleImageDownload}
                            className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-colors"
                            title="이미지 다운로드"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>이미지를 불러올 수 없습니다</p>
                      </div>
                    </div>
                  )}
                  {content.content && (
                    <div className="prose max-w-none">
                      <p className="text-gray-700">{content.content}</p>
                    </div>
                  )}
                </div>
              )}

              {content.type === 'link' && (
                <div className="space-y-4">
                  {content.link_url && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-purple-900 mb-1">
                            {content.title || '링크'}
                          </h3>
                          <p className="text-purple-700 text-sm break-all">
                            {content.link_url}
                          </p>
                        </div>
                        <button
                          onClick={handleLinkOpen}
                          className="ml-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Link className="w-4 h-4" />
                          열기
                        </button>
                      </div>
                    </div>
                  )}
                  {content.content && (
                    <div className="prose max-w-none">
                      <p className="text-gray-700">{content.content}</p>
                    </div>
                  )}
                </div>
              )}

              {content.type === 'file' && (
                <div className="space-y-4">
                  {content.file_url && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <File className="w-12 h-12 text-orange-600" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-orange-900 mb-1">
                              {content.file_name || content.title || '파일'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-orange-700">
                              {content.file_size && (
                                <span>{(content.file_size / 1024 / 1024).toFixed(2)} MB</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleFileDownload}
                          className="ml-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          다운로드
                        </button>
                      </div>
                    </div>
                  )}
                  {content.content && (
                    <div className="prose max-w-none">
                      <p className="text-gray-700">{content.content}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        {isEditing ? (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              취소
            </button>
            <button
              onClick={saveChanges}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        ) : isMovingCategory ? (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={cancelMovingCategory}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              취소
            </button>
            <button
              onClick={moveToCategory}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              카테고리 변경
            </button>
          </div>
        ) : (
          isOwner && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={onDelete}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                삭제
              </button>
                              <div className="flex items-center gap-2">
                  {(isAdmin || isOwner) && category && (
                    <button
                      onClick={startMovingCategory}
                      className="px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Move className="w-4 h-4" />
                      카테고리 변경
                    </button>
                  )}
                <button
                  onClick={startEditing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  수정
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
} 