'use client';

import { useState } from 'react';
import { Edit3, Trash2, Plus } from 'lucide-react';
import { Category, ContentItem } from '@/types';
import ContentCard from './ContentCard';

interface CategoryColumnProps {
  category: Category;
  contentItems: ContentItem[];
  userIdentifier: string;
  onAddContent: (categoryId: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteContent: (itemId: string, userIdentifier: string) => void;
  onUpdateContent: (itemId: string, updates: Partial<ContentItem>) => void;
  onContentClick: (item: ContentItem) => void;
}

export default function CategoryColumn({
  category,
  contentItems,
  userIdentifier,
  onAddContent,
  onEditCategory,
  onDeleteCategory,
  onDeleteContent,
  onUpdateContent,
  onContentClick,
}: CategoryColumnProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 카테고리에 속한 콘텐츠들을 최신순으로 정렬
  const sortedItems = contentItems
    .filter(item => item.category_id === category.id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleDeleteCategory = () => {
    if (sortedItems.length > 0) {
      if (confirm(`"${category.name}" 카테고리에 ${sortedItems.length}개의 콘텐츠가 있습니다.\n카테고리를 삭제하면 모든 콘텐츠도 함께 삭제됩니다.\n정말 삭제하시겠습니까?`)) {
        onDeleteCategory(category.id);
      }
    } else {
      if (confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) {
        onDeleteCategory(category.id);
      }
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 w-80 flex-shrink-0 flex flex-col" style={{ minHeight: '150px' }}>
      {/* 카테고리 헤더 */}
      <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-sm">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {category.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {sortedItems.length}
            </span>
            <button
              onClick={() => onEditCategory(category)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="카테고리 편집"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={handleDeleteCategory}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="카테고리 삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 추가 버튼 */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => onAddContent(category.id)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span className="text-xs font-medium">콘텐츠 추가</span>
        </button>
      </div>

      {/* 콘텐츠 목록 */}
      <div className="p-3 space-y-3 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {sortedItems.length === 0 ? (
          <div className="text-center py-2 text-gray-400">
            <div className="text-lg mb-1">📝</div>
            <p className="text-xs">아직 콘텐츠가 없습니다</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="w-full">
              <ContentCard
                item={item}
                isOwner={item.user_identifier === userIdentifier}
                onDelete={() => onDeleteContent(item.id, item.user_identifier)}
                onClick={() => onContentClick(item)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
} 