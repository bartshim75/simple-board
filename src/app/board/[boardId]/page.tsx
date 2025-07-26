'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContentItem, Board, Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { getUserIdentifier } from '@/lib/utils';
import BoardHeader from '@/components/BoardHeader';
import BoardDeleteModal from '@/components/BoardDeleteModal';
import CategoryManager from '@/components/CategoryManager';
import CategoryEditModal from '@/components/CategoryEditModal';
import CategoryColumn from '@/components/CategoryColumn';
import ContentViewer from '@/components/ContentViewer';
import AddContentModal from '@/components/AddContentModal';
import toast from 'react-hot-toast';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<string>('');
  const [userIdentifier] = useState(() => getUserIdentifier());

  // 보드 정보 로드
  const loadBoard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('boards')
            .insert([{
              id: boardId,
              title: `보드 ${boardId}`,
              created_by_identifier: userIdentifier,
            }]);

          if (insertError) throw insertError;

          const { data: newData, error: reloadError } = await supabase
            .from('boards')
            .select('*')
            .eq('id', boardId)
            .single();

          if (reloadError) throw reloadError;
          setBoard(newData);
        } else {
          throw error;
        }
      } else {
        setBoard(data);
      }
    } catch (error) {
      console.error('Error loading board:', error);
      toast.error('보드 정보를 불러오는데 실패했습니다.');
    }
  }, [boardId, userIdentifier]);

  // 카테고리 로드
  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('카테고리를 불러오는데 실패했습니다.');
    }
  }, [boardId]);

  // 컨텐츠 아이템 로드
  const loadContentItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('board_id', boardId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setContentItems(data || []);
    } catch (error) {
      console.error('Error loading content items:', error);
      toast.error('콘텐츠를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);



  // 컨텐츠 삭제
  const handleDeleteContent = async (itemId: string, itemUserIdentifier: string) => {
    if (itemUserIdentifier !== userIdentifier) {
      toast.error('본인이 작성한 콘텐츠만 삭제할 수 있습니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', itemId)
        .eq('user_identifier', userIdentifier);

      if (error) throw error;

      // 즉시 로컬 상태에서 제거
      setContentItems(prev => prev.filter(item => item.id !== itemId));
      
      toast.success('콘텐츠가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('콘텐츠 삭제에 실패했습니다.');
    }
  };

  // 컨텐츠 수정
  const handleUpdateContent = async (itemId: string, updates: Partial<ContentItem>) => {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .update(updates)
        .eq('id', itemId)
        .eq('user_identifier', userIdentifier)
        .select()
        .single();

      if (error) throw error;

      // 즉시 로컬 상태 업데이트
      if (data) {
        setContentItems(prev => 
          prev.map(item => 
            item.id === itemId ? data : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('콘텐츠 수정에 실패했습니다.');
      throw error;
    }
  };

  // 카테고리 생성
  const handleCreateCategory = async (name: string, description?: string, color?: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          board_id: boardId,
          name,
          description,
          color: color || '#3b82f6',
          position: categories.length,
          created_by_identifier: userIdentifier,
        }]);

      if (error) throw error;
      toast.success('카테고리가 생성되었습니다.');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('카테고리 생성에 실패했습니다.');
    }
  };

  // 카테고리 수정
  const handleUpdateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', categoryId);

      if (error) throw error;
      toast.success('카테고리가 수정되었습니다.');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('카테고리 수정에 실패했습니다.');
    }
  };

  // 카테고리 편집 모달 열기
  const openCategoryEditModal = (category: Category) => {
    setEditingCategory(category);
  };

  // 카테고리 편집 저장
  const handleSaveCategoryEdit = async (data: { name: string; description?: string; color: string }) => {
    if (editingCategory) {
      await handleUpdateCategory(editingCategory.id, data);
      setEditingCategory(null);
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // 카테고리에 속한 콘텐츠도 함께 삭제
      const { error: contentError } = await supabase
        .from('content_items')
        .delete()
        .eq('category_id', categoryId);

      if (contentError) throw contentError;

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast.success('카테고리가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('카테고리 삭제에 실패했습니다.');
    }
  };

  // 보드 완전 삭제
  const handleDeleteBoard = async (boardIdToDelete: string) => {
    try {
      // 1. 모든 콘텐츠 삭제
      const { error: contentError } = await supabase
        .from('content_items')
        .delete()
        .eq('board_id', boardIdToDelete);

      if (contentError) throw contentError;

      // 2. 모든 카테고리 삭제
      const { error: categoryError } = await supabase
        .from('categories')
        .delete()
        .eq('board_id', boardIdToDelete);

      if (categoryError) throw categoryError;

      // 3. 보드 삭제
      const { error: boardError } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardIdToDelete);

      if (boardError) throw boardError;

      // 4. 홈페이지로 리다이렉트
      router.push('/');
      toast.success('보드가 완전히 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('보드 삭제에 실패했습니다.');
      throw error;
    }
  };

  // 콘텐츠 추가
  const handleAddContent = async (item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newItem = {
        ...item,
        board_id: boardId,
        user_identifier: userIdentifier,
      };

      // 데이터베이스에 삽입하고 새로 생성된 데이터를 반환받기
      const { data, error } = await supabase
        .from('content_items')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      if (data) {
        setContentItems(prev => [data, ...prev]);
      }

      toast.success('콘텐츠가 추가되었습니다.');
      setIsAddModalOpen(false);
      setSelectedCategoryForModal('');
    } catch (error) {
      console.error('Error adding content:', error);
      toast.error('콘텐츠 추가에 실패했습니다.');
    }
  };

  // 카테고리별 콘텐츠 추가 모달 열기
  const handleAddContentToCategory = (categoryId: string) => {
    setSelectedCategoryForModal(categoryId);
    setIsAddModalOpen(true);
  };

  // 콘텐츠 클릭 (상세 보기)
  const handleContentClick = (item: ContentItem) => {
    setSelectedContent(item);
    setIsViewerOpen(true);
  };

  // 뷰어 닫기
  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedContent(null);
  };

  // 뷰어에서 콘텐츠 업데이트
  const handleUpdateContentFromViewer = async (updates: Partial<ContentItem>) => {
    if (selectedContent) {
      await handleUpdateContent(selectedContent.id, updates);
      setSelectedContent(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // 뷰어에서 콘텐츠 삭제
  const handleDeleteContentFromViewer = async () => {
    if (selectedContent) {
      await handleDeleteContent(selectedContent.id, selectedContent.user_identifier);
      handleCloseViewer();
    }
  };



  // 실시간 구독 설정
  useEffect(() => {
    loadBoard();
    loadCategories();
    loadContentItems();

    const channel = supabase
      .channel(`board_${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_items',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 중복 방지: 이미 로컬에 존재하는지 확인
            setContentItems(prev => {
              const exists = prev.some(item => item.id === payload.new.id);
              if (exists) return prev; // 이미 존재하면 추가하지 않음
              return [payload.new as ContentItem, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setContentItems(prev => prev.filter(item => item.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setContentItems(prev => 
              prev.map(item => 
                item.id === payload.new.id ? payload.new as ContentItem : item
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCategories(prev => [...prev, payload.new as Category].sort((a, b) => a.position - b.position));
          } else if (payload.eventType === 'DELETE') {
            setCategories(prev => prev.filter(category => category.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setCategories(prev => 
              prev.map(category => 
                category.id === payload.new.id ? payload.new as Category : category
              ).sort((a, b) => a.position - b.position)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, loadBoard, loadCategories, loadContentItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BoardHeader 
        boardId={boardId}
        board={board}
        onAddCategory={() => setIsCategoryManagerOpen(true)}
        onDeleteBoard={() => setIsDeleteModalOpen(true)}
      />
      
      <main className="container mx-auto px-4 py-6">
        {/* 카테고리가 없을 때 안내 메시지 */}
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📂</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                카테고리를 먼저 생성해주세요
              </h3>
              <p className="text-gray-600 mb-6">
                콘텐츠를 추가하기 전에 카테고리를 만들어 체계적으로 관리하세요.
              </p>
              <button
                onClick={() => setIsCategoryManagerOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                첫 번째 카테고리 만들기
              </button>
            </div>
          </div>
        ) : (
          /* 카테고리 컬럼 레이아웃 */
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
              {categories.map((category) => (
                <CategoryColumn
                  key={category.id}
                  category={category}
                  contentItems={contentItems}
                  userIdentifier={userIdentifier}
                  onAddContent={handleAddContentToCategory}
                  onEditCategory={openCategoryEditModal}
                  onDeleteCategory={handleDeleteCategory}
                  onDeleteContent={handleDeleteContent}
                  onUpdateContent={handleUpdateContent}
                  onContentClick={handleContentClick}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 카테고리 관리 모달 */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CategoryManager
              categories={categories}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCategory(null);
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 카테고리 편집 모달 */}
      <CategoryEditModal
        isOpen={!!editingCategory}
        category={editingCategory || undefined}
        onClose={() => setEditingCategory(null)}
        onSave={handleSaveCategoryEdit}
      />

      {/* 콘텐츠 상세 뷰어 */}
      <ContentViewer
        isOpen={isViewerOpen}
        content={selectedContent}
        isOwner={selectedContent?.user_identifier === userIdentifier}
        onClose={handleCloseViewer}
        onUpdate={handleUpdateContentFromViewer}
        onDelete={handleDeleteContentFromViewer}
      />

      {/* 보드 삭제 모달 */}
      <BoardDeleteModal
        isOpen={isDeleteModalOpen}
        board={board}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteBoard}
      />

      {/* 콘텐츠 추가 모달 */}
      <AddContentModal
        isOpen={isAddModalOpen}
        selectedCategoryId={selectedCategoryForModal}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedCategoryForModal('');
        }}
        onAdd={handleAddContent}
      />
    </div>
  );
} 