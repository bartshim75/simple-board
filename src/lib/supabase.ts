import { createClient } from '@supabase/supabase-js';
import { ContentItemWithLikes } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env.local file.');
  // Create a dummy client for development
  if (typeof window !== 'undefined') {
    console.warn('Supabase not configured. Database operations will fail.');
  }
}

// 싱글톤 패턴으로 Supabase 클라이언트 생성
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
})();

// 연결 테스트 함수 (개발용)
export const testSupabaseConnection = async () => {
  // 개발 환경에서만 실행
  if (process.env.NODE_ENV !== 'development') return true;
  
  try {
    const { error } = await supabase
      .from('content_items')
      .select('count')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
};

// 좋아요 관련 함수들 (직접 테이블 접근 방식으로 복원)
export const likeContentItem = async (contentItemId: string, userIdentifier: string) => {
  try {
    // 먼저 이미 좋아요를 눌렀는지 확인
    const alreadyLiked = await checkIfLiked(contentItemId, userIdentifier);
    if (alreadyLiked) {
      return null; // 이미 좋아요를 눌렀으면 아무것도 하지 않음
    }

    // RPC 함수를 사용하여 좋아요 추가
    const { data, error } = await supabase.rpc('add_like', { 
      p_content_item_id: contentItemId,
      p_user_identifier: userIdentifier
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const unlikeContentItem = async (contentItemId: string, userIdentifier: string) => {
  try {
    await supabase
      .from('user_likes')
      .delete()
      .eq('content_item_id', contentItemId)
      .eq('user_identifier', userIdentifier);

  } catch (error) {
    throw error;
  }
};

export const checkIfLiked = async (contentItemId: string, userIdentifier: string): Promise<boolean> => {
  try {
    // 모든 좋아요 데이터를 가져와서 클라이언트에서 필터링
    const { data, error } = await supabase 
      .from('user_likes')
      .select('id, content_item_id, user_identifier')
      .eq('content_item_id', contentItemId);

    if (error) {
      throw error;
    }

    // 클라이언트에서 user_identifier 필터링
    const userLike = data?.find(like => like.user_identifier === userIdentifier);
    
    return !!userLike;
  } catch {
    return false;
  }
};

// 좋아요 개수가 포함된 콘텐츠 아이템 가져오기
export const getContentItemsWithLikes = async (boardId: string): Promise<ContentItemWithLikes[]> => {
  try {
    // content_items_with_likes 뷰 사용
    const { data, error: queryError } = await supabase
      .from('content_items_with_likes')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (queryError) {
      // 뷰가 없으면 기본 content_items 사용하고 좋아요 개수를 별도로 계산
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('content_items')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        throw fallbackError;
      }

      // 각 콘텐츠 아이템의 좋아요 개수를 별도로 가져오기
      const itemsWithLikes: ContentItemWithLikes[] = [];
      
      for (const item of (fallbackData as unknown as ContentItemWithLikes[] | null) || []) {
        const { data: likeData, error: likeError } = await supabase
          .from('user_likes')
          .select('id')
          .eq('content_item_id', (item as ContentItemWithLikes).id);
        
        const likeCount = likeError ? 0 : ((likeData as {id: string}[] | null)?.length || 0);
        
        itemsWithLikes.push({
          ...item,
          like_count: likeCount,
          age_seconds: Math.floor((Date.now() - new Date((item as ContentItemWithLikes).created_at as string).getTime()) / 1000)
        });
      }

      return itemsWithLikes;
    }

    // 데이터 타입 안전성 보장
    if (data) {
      return (data as unknown as ContentItemWithLikes[]).map((item) => ({
        id: String(item.id),
        board_id: String(item.board_id),
        category_id: item.category_id ? String(item.category_id) : undefined,
        type: item.type as 'text' | 'image' | 'link' | 'file',
        content: String(item.content),
        title: item.title ? String(item.title) : undefined,
        image_url: item.image_url ? String(item.image_url) : undefined,
        thumbnail_url: item.thumbnail_url ? String(item.thumbnail_url) : undefined,
        link_url: item.link_url ? String(item.link_url) : undefined,
        file_url: item.file_url ? String(item.file_url) : undefined,
        file_name: item.file_name ? String(item.file_name) : undefined,
        file_type: item.file_type ? String(item.file_type) : undefined,
        file_size: item.file_size ? Number(item.file_size) : undefined,
        author_name: item.author_name ? String(item.author_name) : undefined,
        user_identifier: String(item.user_identifier),
        created_at: new Date(item.created_at as string).toISOString(),
        updated_at: new Date(item.updated_at as string).toISOString(),
        position_x: item.position_x ? Number(item.position_x) : undefined,
        position_y: item.position_y ? Number(item.position_y) : undefined,
        like_count: Number(item.like_count) || 0,
        age_seconds: Number(item.age_seconds) || 0,
      }));
    }
    return [];
  } catch (error) {
    throw error;
  }
}; 

// 보드용 경량 콘텐츠 아이템 가져오기 (썸네일, 파일 메타데이터 포함)
export const getContentItemsForBoard = async (boardId: string): Promise<ContentItemWithLikes[]> => {
  try {
    const { data, error: queryError } = await supabase
      .from('content_items_with_likes')
      .select('id, board_id, category_id, type, title, content, link_url, thumbnail_url, file_name, file_type, file_size, created_at, updated_at, user_identifier, like_count, age_seconds')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (queryError) {
      // 뷰가 없으면 기본 content_items 사용하고 좋아요 개수를 별도로 계산
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('content_items')
        .select('id, board_id, category_id, type, title, content, link_url, thumbnail_url, file_name, file_type, file_size, created_at, updated_at, user_identifier')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        throw fallbackError;
      }

      // 각 콘텐츠 아이템의 좋아요 개수를 별도로 가져오기
      const itemsWithLikes: ContentItemWithLikes[] = [];
      
      for (const item of (fallbackData as unknown as ContentItemWithLikes[] | null) || []) {
        const { data: likeData, error: likeError } = await supabase
          .from('user_likes')
          .select('id')
          .eq('content_item_id', (item as ContentItemWithLikes).id);
        
        const likeCount = likeError ? 0 : ((likeData as {id: string}[] | null)?.length || 0);
        
        itemsWithLikes.push({
          ...item,
          like_count: likeCount,
          age_seconds: Math.floor((Date.now() - new Date((item as ContentItemWithLikes).created_at as string).getTime()) / 1000)
        });
      }

      return itemsWithLikes;
    }

    return data as unknown as ContentItemWithLikes[] || [];
  } catch (error) {
    throw error;
  }
};

// 뷰어용 전체 콘텐츠 아이템 가져오기 (이미지 포함)
export const getContentItemForViewer = async (itemId: string): Promise<ContentItemWithLikes | null> => {
  try {
    // 기본 content_items 테이블에서 모든 컬럼 가져오기 (이미지 포함)
    const { data, error } = await supabase 
      .from('content_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      throw error;
    }

    // 좋아요 개수 별도 계산
    const { data: likeData, error: likeError } = await supabase
      .from('user_likes')
      .select('id')
      .eq('content_item_id', itemId);
    
    const likeCount = likeError ? 0 : ((likeData as {id: string}[] | null)?.length || 0);
    
    return {
      ...(data as unknown as ContentItemWithLikes),
      like_count: likeCount,
      age_seconds: Math.floor((Date.now() - new Date((data as unknown as ContentItemWithLikes).created_at as string).getTime()) / 1000)
    };
  } catch (error) {
    throw error;
  }
};

// 잘못된 좋아요 데이터 정리 함수
export const cleanupInvalidLikes = async (contentItemId: string, userIdentifier: string) => {
  try {
    // 해당 사용자의 좋아요 데이터 삭제
    await supabase
      .from('user_likes')
      .delete()
      .eq('content_item_id', contentItemId)
      .eq('user_identifier', userIdentifier);

    return true;
  } catch {
    return false;
  }
}; 

// content_items_with_likes 뷰 새로고침 함수
export const refreshContentView = async () => {
  try {
    // 뷰를 삭제하고 다시 생성
    const { error: dropError } = await supabase.rpc('refresh_content_view');
    
    if (dropError) {
      // 수동으로 뷰 새로고침 시도
      const { error: manualError } = await supabase
        .from('content_items_with_likes')
        .select('count(*)')
        .limit(1);
      
      if (manualError) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}; 