'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Type, Image as ImageIcon, Link, Upload, File } from 'lucide-react';
import { ContentItem } from '@/types';
import { isValidUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AddContentModalProps {
  isOpen: boolean;
  selectedCategoryId?: string;
  onClose: () => void;
  onAdd: (item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => void;
}

type ContentType = 'text' | 'image' | 'link' | 'file';

export default function AddContentModal({ isOpen, selectedCategoryId, onClose, onAdd }: AddContentModalProps) {
  const [activeType, setActiveType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setLinkUrl('');
    setImageUrl('');
    setFileUrl('');
    setFileName('');
    setFileType('');
    setFileSize(0);
    setAuthorName('');
    setModalCategoryId(selectedCategoryId || '');
    setActiveType('text');
  };

  // 모달이 열릴 때 선택된 카테고리로 초기화
  useEffect(() => {
    if (isOpen) {
      setModalCategoryId(selectedCategoryId || '');
    }
  }, [isOpen, selectedCategoryId]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;



    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // FileReader를 사용해서 이미지를 Base64로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      setImageUrl(result);
      if (!title) {
        setTitle(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;



    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // FileReader를 사용해서 파일을 Base64로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      setFileUrl(result);
      setFileName(file.name);
      setFileType(file.type);
      setFileSize(file.size);
      if (!title) {
        setTitle(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 기본 검증
      if (activeType === 'text' && !content.trim()) {
        toast.error('텍스트 내용을 입력해주세요.');
        return;
      }

      if (activeType === 'link') {
        if (!linkUrl.trim()) {
          toast.error('링크 URL을 입력해주세요.');
          return;
        }
        if (!isValidUrl(linkUrl)) {
          toast.error('올바른 URL을 입력해주세요.');
          return;
        }
      }

      if (activeType === 'image' && !imageUrl) {
        toast.error('이미지를 선택하거나 URL을 입력해주세요.');
        return;
      }

      if (activeType === 'file' && !fileUrl) {
        toast.error('파일을 선택해주세요.');
        return;
      }

      // 컨텐츠 아이템 생성
      const newItem: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'> = {
        board_id: '', // 부모 컴포넌트에서 설정
        category_id: modalCategoryId || undefined,
        type: activeType,
        content: content.trim(),
        title: title.trim() || undefined,
        author_name: authorName.trim() || undefined,
        user_identifier: '', // 부모 컴포넌트에서 설정
      };

      if (activeType === 'link') {
        newItem.link_url = linkUrl.trim();
      }

      if (activeType === 'image') {
        newItem.image_url = imageUrl;
      }

      if (activeType === 'file') {
        newItem.file_url = fileUrl;
        newItem.file_name = fileName;
        newItem.file_type = fileType;
        newItem.file_size = fileSize;
      }


      await onAdd(newItem);
      handleClose();
    } catch (error) {
      console.error('Error adding content:', error);
      toast.error('콘텐츠 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { type: 'text' as ContentType, label: '텍스트', icon: Type },
    { type: 'image' as ContentType, label: '이미지', icon: ImageIcon },
    { type: 'link' as ContentType, label: '링크', icon: Link },
    { type: 'file' as ContentType, label: '파일', icon: File },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">콘텐츠 추가</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 탭 */}
          <div className="px-6 pt-6">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {tabs.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeType === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 컨텐츠 폼 */}
          <div className="p-6 space-y-4">
            {/* 제목 (공통) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 (선택사항)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* 작성자 이름 (공통) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작성자 이름 (선택사항)
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="작성자 이름을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>



            {/* 텍스트 타입 */}
            {activeType === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용 *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  required
                />
              </div>
            )}

            {/* 이미지 타입 */}
            {activeType === 'image' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이미지 업로드
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        파일 선택
                      </button>
                      <p className="text-sm text-gray-500 mt-1">
                        또는 이미지를 여기에 드롭하세요
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500">또는</div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이미지 URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {imageUrl && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      미리보기
                    </label>
                    <img
                      src={imageUrl}
                      alt="미리보기"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      onError={() => toast.error('이미지를 불러올 수 없습니다.')}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명 (선택사항)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="이미지에 대한 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 링크 타입 */}
            {activeType === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    링크 URL *
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명 (선택사항)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="링크에 대한 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 파일 타입 */}
            {activeType === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    파일 업로드 *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      ref={documentInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        파일 선택
                      </button>
                      <p className="text-sm text-gray-500 mt-1">
                        문서, 압축파일 등 (최대 10MB)
                      </p>
                    </div>
                  </div>
                </div>

                {fileName && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <File className="w-8 h-8 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{fileType}</span>
                          <span>•</span>
                          <span>{(fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명 (선택사항)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="파일에 대한 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 