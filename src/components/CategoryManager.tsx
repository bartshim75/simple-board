'use client';

import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Save, Folder, FolderPlus } from 'lucide-react';
import { Category } from '@/types';
import CategoryEditModal from './CategoryEditModal';
import toast from 'react-hot-toast';

interface CategoryManagerProps {
  categories: Category[];
  onCreateCategory: (name: string, description?: string, color?: string) => void;
  onUpdateCategory: (categoryId: string, updates: Partial<Category>) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#6b7280', // gray
];

export default function CategoryManager({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleCreateCategory = (data: { name: string; description?: string; color: string }) => {
    onCreateCategory(data.name, data.description, data.color);
    setIsCreating(false);
  };

  const handleEditCategory = (data: { name: string; description?: string; color: string }) => {
    if (editingCategory) {
      onUpdateCategory(editingCategory.id, data);
      setEditingCategory(null);
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('이 카테고리를 삭제하시겠습니까?\n카테고리 내의 모든 콘텐츠는 "분류 없음"으로 이동됩니다.')) {
      onDeleteCategory(categoryId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 flex items-center gap-4">
          <Folder className="w-8 h-8" />
          카테고리 관리
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-lg text-lg"
        >
          <Plus className="w-6 h-6" />
          새 카테고리 추가
        </button>
      </div>

      {/* 카테고리 목록 */}
      {categories.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Folder className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            아직 카테고리가 없습니다
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            첫 번째 카테고리를 만들어 콘텐츠를 체계적으로 관리해보세요.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-lg shadow-lg"
          >
            <Plus className="w-6 h-6" />
            첫 번째 카테고리 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2 text-gray-500 font-medium min-w-0">
                    <span className="text-lg">#{index + 1}</span>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-gray-600 leading-relaxed">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 ml-4">
                  <button
                    onClick={() => startEditing(category)}
                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="편집"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 카테고리 생성/편집 모달 */}
      <CategoryEditModal
        isOpen={isCreating || !!editingCategory}
        category={editingCategory || undefined}
        onClose={() => {
          setIsCreating(false);
          setEditingCategory(null);
        }}
        onSave={editingCategory ? handleEditCategory : handleCreateCategory}
      />
    </div>
  );
} 