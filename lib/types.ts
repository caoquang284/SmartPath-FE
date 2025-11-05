export type UserRole = 'student' | 'admin';

export interface StoredUser {
  id: string;
  email: string;
  username: string;

  fullName?: string | null;
  phoneNumber?: string | null;
  major?: string | null;
  faculty?: string | null;
  yearOfStudy?: number | null;
  bio?: string | null;
  avatarUrl?: string | null;

  role: UserRole;
  point: number;

  createdAt?: string;
}

export type UserProfile = Omit<StoredUser, 'password'>;

export type DecodedJwt = {
  sub?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  email?: string;
  role?: string | string[];
  [key: string]: any;
};

export type LoginRequest = {
  EmailOrUsername: string;
  Password: string;
};

export type RegisterRequest = {
  Email: string;
  Username: string;
  Password: string;
  FullName: string;
  Role: Role
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  currentUserId: string;
};

export interface PostResponseDto {
  id: string;
  title: string;
  content: string;
  isQuestion: boolean;
  createdAt: string;            
  updatedAt?: string | null;
  authorUsername?: string | null;
  authorPoint: number
  authorId: string;
  authorAvatarUrl?: string | null;
  commentCount: number;
  categories?: string[];
  isPositiveReacted: boolean | null;
  isNegativeReacted: boolean | null;
  negativeReactionCount: number;
  positiveReactionCount: number;
}

export interface PostRequestDto {
  title: string;
  content: string;
  isQuestion: boolean;
  categoryIds?: string[];
}

export interface CommentRequestDto {
  postId: string;
  content: string;
  parentCommentId?: string | null;
}

export interface CommentResponseDto {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl?: string | null;
  authorPoint: number;
  createdAt: string;               
  replies?: CommentResponseDto[];  
  isPositiveReacted: boolean | null;
  isNegativeReacted: boolean | null;
  negativeReactionCount: number;
  positiveReactionCount: number;
}

export type ReactionRequestDto = {
  postId?: string;
  commentId?: string;
  isPositive: boolean;
};

export type ReactionResponseDto = {
  id: string;
  isPositive: boolean;
  createdAt: string;
};

export interface ReportRequestDto {
  post_id: string;
  reason: string;
  details?: string;
}

export interface ChatOtherUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  senderUsername: string;
  isRead: boolean;
  createdAt: string;
}

export interface Chat {
  id: string;
  name?: string | null;
  member1Id: string;
  member2Id: string;
  otherUser?: ChatOtherUser | null;   
  messages: Message[];
}

export interface ChatCreatePayload {
  member1Id: string;
  member2Id: string;
  name?: string | null;
}

export interface MessageRequestDto {
  chat_id: string;
  content: string;
}

export interface Notification {
  id: string 
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  url: string | null;
}

export interface SystemLog {
  id: string;
  user_id: string;
  action: string;
  description?: string;
  target_type?: 'post' | 'comment' | 'reaction' | 'report'; 
  createdAt: string;
  url: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface CategoryPost {
  id?: string;
  post_id: string;
  category_id: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits?: number;
  semester?: number;
}

export type EventRegistrationStatus = 'going' | 'interested';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  category: string;
  host_id: string;
  banner_url?: string;
  capacity?: number;
  attendees_count?: number;
  is_virtual?: boolean;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: EventRegistrationStatus;
  created_at: string;
}

export interface BadgeRequestDto {
  point: number;
  name: string;
}

export interface BadgeResponseDto {
  id: string;
  point: number;
  name: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  note?: string;
}

export interface UserRequestDto {
  email: string;
  username: string;
  password?: string;
  fullName?: string;
  phoneNumber?: string;
  major?: string;
  faculty?: string;
  yearOfStudy?: number;
  bio?: string;
  avatarUrl?: string;
  role?: UserRole; 
}

export interface BadgeAward {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type?: string;
  createdAt?: Date;
}

export interface FriendshipRequestDto { followedUserId: string; }
export interface FriendshipResponseDto {
  followerId: string;
  followedUserId: string;
  createdAt: string;
}
export interface FriendSummaryDto {
  id: string;                 
  username: string;
  fullName?: string;
  avatarUrl?: string | null;
  point?: number;
  primaryBadge?: { id: string; name: string } | null;
  isMutual?: boolean;
}

export enum Role {
  Admin,
  Student 
}

export enum BotMessageRole {
  System = 0,
  User = 1,
  Assistant = 2,
}

export interface BotConversationCreateRequest {
  title?: string | null;
  systemPrompt?: string | null;
}

export interface BotConversationResponse {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  messageCount: number;
}

export interface BotMessageRequest {
  conversationId: string;
  content: string;
  role: BotMessageRole; // 0 System, 1 User, 2 Assistant

  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  toolCallsJson?: string | null;
}

export interface BotMessageResponse {
  id: string;
  conversationId: string;
  role: BotMessageRole;
  content: string;
  createdAt: string;

  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  toolCallsJson?: string | null;
}

export interface BotConversationWithMessagesResponse extends BotConversationResponse {
  messages: BotMessageResponse[];
}

export interface RenameConversationRequest {
  title: string;
}

export type PageResult<T> = {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
};

export interface BotGenerateResponse {
  userMessage: BotMessageResponse;
  assistantMessage: BotMessageResponse;
}

export interface KnowledgeSearchHit {
chunkId: string; // Guid
documentId: string; // Guid
chunkIndex: number;
content: string;
title?: string | null;
sourceUrl?: string | null;
score: number;
}

export interface KnowledgeDocumentDto {
id: string;
title?: string | null;
sourceUrl?: string | null;
meta?: string | null;
createdAt: string; // ISO
chunkCount: number;
}

export interface KnowledgeDocumentUpdateRequest {
title?: string | null;
meta?: string | null;
}

export interface KnowledgeTextIngestRequest {
title: string;
sourceUrl?: string | null;
text: string;
}

export interface KnowledgeUrlIngestRequest {
url: string;
title?: string | null;
}

export type KnowledgeListResult = PageResult<KnowledgeDocumentDto>;