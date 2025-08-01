'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContentItemWithLikes, Board, Category } from '@/types';
import { supabase, getContentItemsForBoard, getContentItemForViewer } from '@/lib/supabase';
import { getUserIdentifier } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import BoardHeader from '@/components/BoardHeader';
import BoardDeleteModal from '@/components/BoardDeleteModal';
import BoardEditModal from '@/components/BoardEditModal';
import CategoryManager from '@/components/CategoryManager';
import CategoryEditModal from '@/components/CategoryEditModal';
import CategoryColumn from '@/components/CategoryColumn';
import ContentViewer from '@/components/ContentViewer';
import AddContentModal from '@/components/AddContentModal';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const boardId = params.boardId as string;

  const [contentItems, setContentItems] = useState<ContentItemWithLikes[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItemWithLikes | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<string>('');
  const [userIdentifier] = useState(() => getUserIdentifier());
  const [isDragging, setIsDragging] = useState(false);
  const scrollPositionRef = useRef<{ scrollLeft: number, scrollTop: number }>({ scrollLeft: 0, scrollTop: 0 });

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

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
      
      // 기존 카테고리들에 is_hidden 필드가 없을 수 있으므로 기본값 설정
      const categoriesWithDefaults = (data || []).map(category => ({
        ...category,
        is_hidden: category.is_hidden ?? false
      }));
      
      setCategories(categoriesWithDefaults);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('카테고리를 불러오는데 실패했습니다.');
    }
  }, [boardId]);

  // 컨텐츠 아이템 로드 (경량 버전 - 이미지 제외)
  const loadContentItems = useCallback(async () => {
    try {
      const data = await getContentItemsForBoard(boardId);
      setContentItems(data);
    } catch (error) {
      console.error('Error loading content items:', error);
      toast.error('콘텐츠를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  // 컨텐츠 삭제
  const handleDeleteContent = async (itemId: string, itemUserIdentifier: string) => {
    if (!isLoggedIn && itemUserIdentifier !== userIdentifier) {
      toast.error('본인이 작성한 콘텐츠만 삭제할 수 있습니다.');
      return;
    }

    try {
      let query = supabase
        .from('content_items')
        .delete()
        .eq('id', itemId);

      // 관리자가 아닐 경우에만 작성자 확인
      if (!isLoggedIn) {
        query = query.eq('user_identifier', userIdentifier);
      }

      const { error } = await query;

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
  const handleUpdateContent = async (itemId: string, updates: Partial<ContentItemWithLikes>) => {
    try {
      let query = supabase
        .from('content_items')
        .update(updates)
        .eq('id', itemId);

      // 관리자가 아닐 경우에만 작성자 확인
      if (!isLoggedIn) {
        query = query.eq('user_identifier', userIdentifier);
      }
      
      const { data, error } = await query.select().single();

      if (error) throw error;

      // 즉시 로컬 상태 업데이트
      if (data) {
        setContentItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, ...data } : item
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
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          board_id: boardId,
          name,
          description,
          color: color || '#3b82f6',
          position: categories.length,
          created_by_identifier: userIdentifier,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      if (data) {
        setCategories(prev => [...prev, data]);
      }
      
      toast.success('카테고리가 생성되었습니다.');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('카테고리 생성에 실패했습니다.');
      // 오류 발생 시 카테고리 목록 다시 로드
      loadCategories();
    }
  };

  // 카테고리 수정
  const handleUpdateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      if (data) {
        setCategories(prev => 
          prev.map(category => 
            category.id === categoryId ? { ...category, ...data } : category
          )
        );
      }
      
      toast.success('카테고리가 수정되었습니다.');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('카테고리 수정에 실패했습니다.');
      // 오류 발생 시 카테고리 목록 다시 로드
      loadCategories();
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

  // 카테고리 숨김/보이기 토글
  const handleToggleCategoryVisibility = async (categoryId: string, isHidden: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_hidden: isHidden })
        .eq('id', categoryId);

      if (error) throw error;
      
      // 즉시 로컬 상태 업데이트
      setCategories(prev => 
        prev.map(category => 
          category.id === categoryId ? { ...category, is_hidden: isHidden } : category
        )
      );
      
      toast.success(isHidden ? '카테고리가 숨겨졌습니다.' : '카테고리가 표시됩니다.');
    } catch (error) {
      console.error('Error toggling category visibility:', error);
      toast.error('카테고리 숨김/보이기 설정에 실패했습니다.');
    }
  };



  // 보드 편집 저장
  const handleSaveBoardEdit = async (data: { title: string; description?: string }) => {
    try {
      const { error } = await supabase
        .from('boards')
        .update({
          title: data.title,
          description: data.description,
        })
        .eq('id', boardId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setBoard(prev => prev ? { ...prev, ...data } : null);
      
      toast.success('보드 정보가 수정되었습니다.');
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating board:', error);
      toast.error('보드 정보 수정에 실패했습니다.');
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
      
      // 즉시 로컬 상태 업데이트 (낙관적 업데이트)
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      setContentItems(prev => prev.filter(item => item.category_id !== categoryId));
      
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
  const handleAddContent = async (item: Omit<ContentItemWithLikes, 'id' | 'created_at' | 'updated_at' | 'like_count' | 'age_seconds'>) => {
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
        const newItemWithLikes: ContentItemWithLikes = {
          ...data,
          like_count: 0,
          age_seconds: 0,
        };
        setContentItems(prev => [newItemWithLikes, ...prev]);
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

  // 콘텐츠 클릭 (상세 보기) - 뷰어에서 전체 데이터 로드
  const handleContentClick = async (item: ContentItemWithLikes) => {
    scrollPositionRef.current = { 
      scrollLeft: document.documentElement.scrollLeft,
      scrollTop: document.documentElement.scrollTop
    };
    try {
      // 뷰어에서 전체 데이터 로드 (이미지 포함)
      const fullItem = await getContentItemForViewer(item.id);
      if (fullItem) {
        setSelectedContent(fullItem);
        setIsViewerOpen(true);
      } else {
        toast.error('콘텐츠를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error loading full content item:', error);
      toast.error('콘텐츠를 불러오는데 실패했습니다.');
    }
  };

  // 뷰어 닫기
  const handleCloseViewer = async () => {
    const itemToRefresh = selectedContent;

    setIsViewerOpen(false);
    setSelectedContent(null);

    if (itemToRefresh) {
      try {
        // 아이템이 삭제되지 않고 목록에 여전히 존재하는 경우에만 최신 정보로 업데이트합니다.
        const itemExistsInState = contentItems.some(i => i.id === itemToRefresh.id);

        if (itemExistsInState) {
            const updatedItem = await getContentItemForViewer(itemToRefresh.id);
            if (updatedItem) {
              // 전체 목록에서 해당 아이템만 교체하여 상태를 업데이트합니다.
              setContentItems(prevItems =>
                prevItems.map(item =>
                  item.id === updatedItem.id ? updatedItem : item
                )
              );
            }
        }
      } catch (error) {
        console.error('Error updating content item after viewer close:', error);
        toast.error('콘텐츠 정보를 업데이트하는데 실패했습니다.');
        // 실패 시 전체 목록을 다시 불러옵니다.
        await loadContentItems();
      }
    }
    
    // 저장했던 스크롤 위치로 복원합니다.
    requestAnimationFrame(() => {
      window.scrollTo(scrollPositionRef.current.scrollLeft, scrollPositionRef.current.scrollTop);
    });
  };

  // 드래그 시작 처리
  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    console.log('Drag start:', event.active.id);
  };

  // 카테고리 순서 변경 처리
  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex(cat => cat.id === active.id);
      const newIndex = categories.findIndex(cat => cat.id === over?.id);

      console.log('Drag end:', { active: active.id, over: over?.id, oldIndex, newIndex });

      if (oldIndex !== -1 && newIndex !== -1) {
        // 로컬 상태 업데이트
        const newCategories = arrayMove(categories, oldIndex, newIndex);
        
        // 데이터베이스 업데이트
        try {
          // 각 카테고리를 개별적으로 업데이트 (더 안전한 방법)
          for (let i = 0; i < newCategories.length; i++) {
            const category = newCategories[i];
            const { error: updateError } = await supabase
              .from('categories')
              .update({ 
                position: i
              })
              .eq('id', category.id)
              .eq('board_id', boardId); // board_id로 필터링하여 안전성 확보

            if (updateError) {
              console.error(`Error updating category ${category.id}:`, updateError);
              throw updateError;
            }
          }

          console.log('Successfully updated all categories');
          // 성공 시에만 로컬 상태 업데이트
          setCategories(newCategories);
          toast.success('카테고리 순서가 변경되었습니다.');
        } catch (error) {
          console.error('Error updating category positions:', error);
          toast.error('카테고리 순서 변경에 실패했습니다.');
          loadCategories();
        }
      }
    }
  };

  // 뷰어에서 콘텐츠 업데이트
  const handleUpdateContentFromViewer = async (updates: Partial<ContentItemWithLikes>) => {
    if (selectedContent) {
      // 좋아요 업데이트인 경우 데이터베이스 업데이트 없이 로컬 상태만 업데이트
      if ('like_count' in updates) {
        setSelectedContent(prev => {
          const updated = prev ? { ...prev, ...updates } : null;
          return updated;
        });
        
        // contentItems도 업데이트
        setContentItems(prev => 
          prev.map(item => 
            item.id === selectedContent.id ? { ...item, ...updates } : item
          )
        );
      } else {
        // 다른 업데이트는 데이터베이스 업데이트
        await handleUpdateContent(selectedContent.id, updates);
        setSelectedContent(prev => {
          const updated = prev ? { ...prev, ...updates } : null;
          return updated;
        });
      }
    }
  };

  // 뷰어에서 콘텐츠 삭제
  const handleDeleteContentFromViewer = async () => {
    if (selectedContent) {
      await handleDeleteContent(selectedContent.id, selectedContent.user_identifier);
      handleCloseViewer();
    }
  };

  const handleMoveContentToCategory = async (contentId: string, newCategoryId: string) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .update({ category_id: newCategoryId })
        .eq('id', contentId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setContentItems(prev =>
        prev.map(item =>
          item.id === contentId ? { ...item, category_id: newCategoryId } : item
        )
      );

      // selectedContent도 업데이트
      if (selectedContent && selectedContent.id === contentId) {
        setSelectedContent(prev => prev ? { ...prev, category_id: newCategoryId } : null);
      }

      toast.success('카테고리가 변경되었습니다.');
    } catch (error) {
      console.error('Error moving content to category:', error);
      toast.error('카테고리 변경에 실패했습니다.');
      throw error;
    }
  };

  // 실시간 구독 설정
  useEffect(() => {
    loadBoard();
    loadCategories();
    loadContentItems();

    const contentItemIds = contentItems.map(item => item.id).join(',');

    const channel = supabase
      .channel(`board_${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boards',
          filter: `id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            console.log('Board updated via realtime:', payload.new);
            setBoard(payload.new as Board);
          }
        }
      )
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
              const newItem: ContentItemWithLikes = {
                ...payload.new as ContentItemWithLikes,
                like_count: 0,
                age_seconds: 0,
              };
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            console.log('Content item deleted via realtime:', payload.old.id);
            setContentItems(prev => prev.filter(item => item.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setContentItems(prev => 
              prev.map(item => 
                item.id === payload.new.id ? { ...item, ...payload.new } : item
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
            console.log('Category inserted via realtime:', payload.new);
            setCategories(prev => {
              const exists = prev.some(cat => cat.id === payload.new.id);
              if (exists) return prev;
              const newCategory = { ...payload.new as Category, is_hidden: (payload.new as Category).is_hidden ?? false };
              return [...prev, newCategory].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('Category updated via realtime:', payload.new);
            const newCategory = { ...payload.new as Category, is_hidden: (payload.new as Category).is_hidden ?? false };
            setCategories(prev => 
              prev.map(category => 
                category.id === newCategory.id ? newCategory : category
              ).sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('Category deleted via realtime:', payload.old);
            setCategories(prev => prev.filter(cat => cat.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `content_item_id=in.(${contentItemIds})`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 좋아요 추가 시 해당 콘텐츠의 좋아요 개수 증가
            setContentItems(prev => 
              prev.map(item => 
                item.id === payload.new.content_item_id 
                  ? { ...item, like_count: item.like_count + 1 }
                  : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // 좋아요 삭제 시 해당 콘텐츠의 좋아요 개수 감소
            setContentItems(prev => 
              prev.map(item => 
                item.id === payload.old.content_item_id 
                  ? { ...item, like_count: Math.max(0, item.like_count - 1) }
                  : item
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, loadBoard, loadCategories, loadContentItems, contentItems]);

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
    <div className="bg-gray-50" style={{ minHeight: 'calc(100vh - 60px)' }}>
      <BoardHeader 
        boardId={boardId}
        board={board}
        isLoggedIn={isLoggedIn}
        onAddCategory={() => setIsCategoryManagerOpen(true)}
        onDeleteBoard={() => setIsDeleteModalOpen(true)}
        onEditBoard={() => setIsEditModalOpen(true)}
      />
      
      <main className="container mx-auto px-4 py-1">
        {/* 카테고리가 없을 때 안내 메시지 */}
        {categories.length === 0 ? (
          <div className="text-center py-2" style={{ marginTop: '30px' }}>
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📂</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                카테고리를 먼저 생성해주세요
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                콘텐츠를 추가하기 전에 카테고리를 만들어 체계적으로 관리하세요.
              </p>
              <button
                onClick={() => setIsCategoryManagerOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors text-base"
              >
                첫 번째 카테고리 만들기
              </button>
            </div>
          </div>
        ) : (
          /* 카테고리 컬럼 레이아웃 */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
              <SortableContext
                items={categories.filter(cat => !cat.is_hidden).map(cat => cat.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                  {categories
                    .filter(category => !category.is_hidden)
                    .map((category) => (
                    <CategoryColumn
                      key={category.id}
                      category={category}
                      contentItems={contentItems}
                      userIdentifier={userIdentifier}
                      onAddContent={handleAddContentToCategory}
                      onEditCategory={openCategoryEditModal}
                      onDeleteCategory={handleDeleteCategory}
                      onToggleCategoryVisibility={handleToggleCategoryVisibility}
                      onDeleteContent={handleDeleteContent}
                      onUpdateContent={handleUpdateContent}
                      onContentClick={handleContentClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
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
              onToggleCategoryVisibility={handleToggleCategoryVisibility}
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
        category={selectedContent ? categories.find(cat => cat.id === selectedContent.category_id) || null : null}
        categories={categories.filter(cat => !cat.is_hidden)}
        isOwner={isLoggedIn || selectedContent?.user_identifier === userIdentifier}
        isAdmin={isLoggedIn}
        onClose={handleCloseViewer}
        onUpdate={handleUpdateContentFromViewer}
        onDelete={handleDeleteContentFromViewer}
        onMoveToCategory={handleMoveContentToCategory}
      />

      {/* 보드 편집 모달 */}
      <BoardEditModal
        isOpen={isEditModalOpen}
        board={board}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveBoardEdit}
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