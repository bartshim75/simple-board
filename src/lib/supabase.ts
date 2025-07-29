import { createClient } from '@supabase/supabase-js';
import { ContentItemWithLikes, Like } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';



if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env.local file.');
  // Create a dummy client for development
  if (typeof window !== 'undefined') {
    console.warn('Supabase not configured. Database operations will fail.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 연결 테스트 함수 (개발용)
export const testSupabaseConnection = async () => {
  // 개발 환경에서만 실행
  if (process.env.NODE_ENV !== 'development') return true;
  
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('content_items')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('Connection test error:', error);
      return false;
    }
    
    console.log('Connection test successful');
    return true;
  } catch (error) {
    console.log('Connection test failed:', error);
    return false;
  }
};

// 테이블 존재 여부 확인 함수 (개발용)
export const checkTablesExist = async () => {
  // 개발 환경에서만 실행
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('=== Checking Database Tables ===');
  
  // content_items 테이블 확인
  try {
    const { data: contentData, error: contentError } = await supabase
      .from('content_items')
      .select('id')
      .limit(1);
    
    console.log('content_items table:', contentError ? 'NOT FOUND' : 'EXISTS');
  } catch (error) {
    console.log('content_items table: ERROR', error);
  }
  
  // user_likes 테이블 확인
  try {
    const { data: likesData, error: likesError } = await supabase
      .from('user_likes')
      .select('id')
      .limit(1);
    
    console.log('user_likes table:', likesError ? 'NOT FOUND' : 'EXISTS');
  } catch (error) {
    console.log('user_likes table: ERROR', error);
  }
  
  // content_items_with_likes 뷰 확인
  try {
    const { data: viewData, error: viewError } = await supabase
      .from('content_items_with_likes')
      .select('id')
      .limit(1);
    
    console.log('content_items_with_likes view:', viewError ? 'NOT FOUND' : 'EXISTS');
  } catch (error) {
    console.log('content_items_with_likes view: ERROR', error);
  }
  
  console.log('=== Table Check Complete ===');
};

// 좋아요 관련 함수들 (직접 테이블 접근 방식으로 복원)
export const likeContentItem = async (contentItemId: string, userIdentifier: string) => {
  try {
    // 먼저 이미 좋아요를 눌렀는지 확인
    const alreadyLiked = await checkIfLiked(contentItemId, userIdentifier);
    if (alreadyLiked) {
      if (process.env.NODE_ENV === 'development') {
        console.log('User already liked this content, skipping...');
      }
      return null; // 이미 좋아요를 눌렀으면 아무것도 하지 않음
    }

    // RPC 함수를 사용하여 좋아요 추가
    const { data, error } = await supabase.rpc('add_like', {
      p_content_item_id: contentItemId,
      p_user_identifier: userIdentifier
    });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('=== Like Error Details ===');
        console.log('Error message:', error.message);
        console.log('Error code:', error.code);
        console.log('Error details:', error.details);
        console.log('Full error:', error);
        console.log('========================');
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Error liking content item:', String(error));
    }
    throw error;
  }
};

export const unlikeContentItem = async (contentItemId: string, userIdentifier: string) => {
  try {
    const { error } = await supabase
      .from('user_likes')
      .delete()
      .eq('content_item_id', contentItemId)
      .eq('user_identifier', userIdentifier);

    if (error) {
      const errorMessage = 'Error unliking content item: ' + JSON.stringify(error);
      console.log(errorMessage);
      throw error;
    }
  } catch (error) {
    const errorMessage = 'Error unliking content item: ' + String(error);
    console.log(errorMessage);
    throw error;
  }
};

export const checkIfLiked = async (contentItemId: string, userIdentifier: string): Promise<boolean> => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Checking like status for:', { contentItemId, userIdentifier });
    }
    
    // 모든 좋아요 데이터를 가져와서 클라이언트에서 필터링
    const { data, error } = await supabase
      .from('user_likes')
      .select('id, content_item_id, user_identifier')
      .eq('content_item_id', contentItemId);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Error checking like status:', JSON.stringify(error));
      }
      throw error;
    }

    // 클라이언트에서 user_identifier 필터링
    const userLike = data?.find(like => like.user_identifier === userIdentifier);
    
    if (userLike) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ User has liked this content:', userLike);
      }
      return true;
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ User has not liked this content');
      }
      return false;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ Error checking like status:', String(error));
    }
    return false;
  }
};

// 좋아요 개수가 포함된 콘텐츠 아이템 가져오기
export const getContentItemsWithLikes = async (boardId: string): Promise<ContentItemWithLikes[]> => {
  try {
    // content_items_with_likes 뷰 사용
    const { data, error } = await supabase
      .from('content_items_with_likes')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('content_items_with_likes view not available, falling back to content_items:', error);
      
      // 뷰가 없으면 기본 content_items 사용
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('content_items')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        console.log('Error fetching content items:', JSON.stringify(fallbackError));
        throw fallbackError;
      }

      // like_count와 age_seconds를 0으로 설정
      const itemsWithLikes: ContentItemWithLikes[] = (fallbackData || []).map(item => ({
        ...item,
        like_count: 0,
        age_seconds: Math.floor((Date.now() - new Date(item.created_at).getTime()) / 1000)
      }));

      return itemsWithLikes;
    }

    return data || [];
  } catch (error) {
    console.log('Error in getContentItemsWithLikes:', String(error));
    throw error;
  }
}; 

// 잘못된 좋아요 데이터 정리 함수
export const cleanupInvalidLikes = async (contentItemId: string, userIdentifier: string) => {
  try {
    console.log('🧹 Cleaning up invalid likes for:', { contentItemId, userIdentifier });
    
    // 해당 사용자의 좋아요 데이터 삭제
    const { error } = await supabase
      .from('user_likes')
      .delete()
      .eq('content_item_id', contentItemId)
      .eq('user_identifier', userIdentifier);

    if (error) {
      console.log('❌ Error cleaning up likes:', JSON.stringify(error));
      throw error;
    }

    console.log('✅ Invalid likes cleaned up successfully');
    return true;
  } catch (error) {
    console.log('❌ Error in cleanupInvalidLikes:', String(error));
    return false;
  }
}; 

// content_items_with_likes 뷰 새로고침 함수
export const refreshContentView = async () => {
  try {
    console.log('🔄 Refreshing content_items_with_likes view...');
    
    // 뷰를 삭제하고 다시 생성
    const { error: dropError } = await supabase.rpc('refresh_content_view');
    
    if (dropError) {
      console.log('❌ Error refreshing view:', JSON.stringify(dropError));
      // 수동으로 뷰 새로고침 시도
      const { error: manualError } = await supabase
        .from('content_items_with_likes')
        .select('count(*)')
        .limit(1);
      
      if (manualError) {
        console.log('❌ Manual refresh also failed:', JSON.stringify(manualError));
        return false;
      }
    }
    
    console.log('✅ Content view refreshed successfully');
    return true;
  } catch (error) {
    console.log('❌ Error in refreshContentView:', String(error));
    return false;
  }
}; 