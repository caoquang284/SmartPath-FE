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

  isBanned?: boolean; 
  bannedUntil?: string | null; 
  banReason?: string | null;
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
  // AI Review fields
  status: 'Accepted' | 'Pending' | 'Rejected';
  rejectReason?: string | null;
  aiConfidence?: number | null;
  aiCategoryMatch?: boolean | null;
  aiReason?: string | null;
  reviewedAt?: string | null;
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
  meta: BotGenerateMeta;
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

export type KnowledgePreviewResultDto = {
  proposedTitle: string;
  proposedSourceUrl?: string | null;
  relatedDocuments: KnowledgeDocumentDto[];
};

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

export interface AdminDailyCount { date: string; count: number }
export interface AdminActivityDaily {
  date: string;
  posts: number; comments: number; reactions: number; reports: number; newUsers: number;
}

export interface UserAdminSummary {
  user: UserProfile;
  posts: number; comments: number; reactions: number; friends: number;
  reportsAgainst: number; reportsFiled: number;
}

export interface RetrievedContextPreview {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  snippet: string;
}

export interface KnowledgeSourcePreview {
  documentId: string;
  title?: string | null;
  sourceUrl?: string | null;
}

export interface BotGenerateMeta {
  usedModel?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  retrievedContextCount?: number | null;
  contexts?: RetrievedContextPreview[];
  sources?: KnowledgeSourcePreview[];
}

// Study Material Types
export enum MaterialStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2
}

export enum SourceType {
  File = 1,
  Url = 2
}

export interface MaterialCategory {
  id: string;
  name: string;
  slug: string;
  path: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  children: MaterialCategory[];
}

export interface StudyMaterialResponse {
  id: string;
  categoryId: string;
  categoryPath: string;
  title: string;
  description: string | null;
  sourceType: SourceType;
  fileUrl: string | null;
  sourceUrl: string | null;
  status: MaterialStatus;
  rejectReason: string | null;
  aiCategoryMatch: boolean | null;
  aiConfidence: number | null;
  aiSuggestedCategoryId: string | null;
  aiReason: string | null;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StudyMaterialCreateRequest {
  categoryId: string;
  title: string;
  description?: string;
  sourceType: SourceType;
  sourceUrl?: string;
}

export interface StudyMaterialSearchRequest {
  categoryId?: string;
  status?: MaterialStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface StudyMaterialSearchResponse extends PageResult<StudyMaterialResponse> {}

export interface StudyMaterialReviewRequest {
  decision: 'Accepted' | 'Rejected';
  reason?: string;
}

// Study Material Rating Types
export interface StudyMaterialRatingRequest {
  rating: number; // 1-5
  comment?: string;
}

export interface StudyMaterialRatingResponse {
  id: string;
  materialId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyMaterialRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export type MaterialPageResult<T> = {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
};

// Category request types for backend compatibility
export interface MaterialCategoryCreateRequest {
  name: string;
  slug?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface MaterialCategoryUpdateRequest {
  name?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface MoveCategoryRequest {
  newParentId?: string;
  newSortOrder?: number;
}

// Search Engine Types

export interface SearchRequest {
  query: string;
  searchType?: 'All' | 'Posts' | 'StudyMaterials';
  isQuestion?: boolean | null;
  includeSemanticSearch?: boolean;
  includeKeywordSearch?: boolean;
  sortBy?: 'relevance' | 'created' | 'updated' | 'views' | 'likes' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  fromDate?: string; // ISO date
  toDate?: string; // ISO date
  tags?: string[];
}

export interface PostSearchResult {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  isQuestion: boolean;
  isSolved: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
  };
  categories: PostSearchCategory[];
  tags: string[];
  relevanceScore: number;
  matchType: 'Exact' | 'Semantic' | 'Keyword' | 'Fuzzy';
  highlightedTitle: string[];
  highlightedContent: string[];
}

export interface PostSearchCategory {
  id: string;
  name: string;
  slug: string;
}

export interface StudyMaterialSearchResult {
  id: string;
  title: string;
  description: string;
  summary?: string | null;
  type: string;
  url: string;
  downloadUrl?: string;
  viewCount: number;
  downloadCount: number;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
  };
  category: MaterialSearchCategory;
  tags: string[];
  relevanceScore: number;
  matchType: 'Exact' | 'Semantic' | 'Keyword' | 'Fuzzy';
  highlightedTitle: string[];
  highlightedDescription: string[];
  isApproved: boolean;
  aiConfidence?: number | null;
}

export interface MaterialSearchCategory {
  id: string;
  name: string;
  path: string;
}

export interface SearchFacets {
  categories: CategoryFacet[];
  materialCategories: MaterialCategoryFacet[];
  types: TypeFacet[];
  tags: TagFacet[];
  years: YearFacet[];
}

export interface CategoryFacet {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface MaterialCategoryFacet {
  id: string;
  name: string;
  path: string;
  level: number;
  count: number;
  children?: MaterialCategoryFacet[];
}

export interface TypeFacet {
  name: string;
  count: number;
}

export interface TagFacet {
  name: string;
  count: number;
}

export interface YearFacet {
  name: string;
  count: number;
}

export interface SearchSuggestions {
  correctedQuery?: string;
  relatedQueries: string[];
  didYouMean: string[];
}

export interface SearchResponse {
  posts: PostSearchResult[];
  studyMaterials: StudyMaterialSearchResult[];
  totalPosts: number;
  totalStudyMaterials: number;
  totalResults: number;
  facets: SearchFacets;
  suggestions: SearchSuggestions;
  queryTime: string;
}

// Search Suggestion Types
export interface PostSuggestion {
  id: string;
  title: string;
  isQuestion: boolean;
  categories: string[];
}

export interface MaterialSuggestion {
  id: string;
  title: string;
  type: string;
  category: string;
}

// Search Analytics (Admin)
export interface SearchAnalytics {
  totalQueries: number;
  uniqueQueries: number;
  topQueries: string[];
  averageQueryLength: number;
  queryLengthDistribution: number[];
  topResultTypes: ResultTypeStat[];
  averageResultsPerPage: number;
}

export interface ResultTypeStat {
  type: 'Posts' | 'StudyMaterials';
  count: number;
  percentage: number;
}

// Enhanced Post Types for Search Compatibility
export interface EnhancedPostResponse extends Omit<PostResponseDto, 'categories'> {
  summary?: string | null;
  isSolved?: boolean;
  viewCount?: number;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
  };
  tags?: string[];
  relevanceScore?: number;
  matchType?: 'Exact' | 'Semantic' | 'Keyword' | 'Fuzzy';
  highlightedTitle?: string[];
  highlightedContent?: string[];
}

// Enhanced Study Material Types for Search Compatibility
export interface EnhancedStudyMaterialResponse extends Omit<StudyMaterialResponse, 'aiConfidence' | 'totalRatings'> {
  summary?: string | null;
  type: string;
  url: string;
  downloadUrl?: string;
  viewCount?: number;
  downloadCount?: number;
  uploader?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
  };
  category?: MaterialSearchCategory;
  tags?: string[];
  relevanceScore?: number;
  matchType?: 'Exact' | 'Semantic' | 'Keyword' | 'Fuzzy';
  highlightedTitle?: string[];
  highlightedDescription?: string[];
  isApproved?: boolean;
}

// Pagination Response for Search
export interface SearchPaginationResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  code: number;
}

// SignalR Event Types
export interface NewMessageEvent {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  createdAt: string;
  isRead: boolean;
}

export interface MessageReadEvent {
  messageId: string;
  chatId: string;
  userId: string;
  readAt: string;
}

export interface NewMessageNotification {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  message: string;
  createdAt: string;
}

export interface MessagesReadInChatEvent {
  chatId: string;
  userId: string;
  readAt: string;
}