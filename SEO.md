# Hướng dẫn SEO cho SmartPath

## ✅ Đã hoàn thành

### 1. Technical SEO
- ✅ Metadata đầy đủ (title, description, keywords)
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Card tags
- ✅ Sitemap.xml tự động
- ✅ Robots.txt
- ✅ Structured Data (JSON-LD)
- ✅ PWA Manifest
- ✅ Mobile-responsive
- ✅ HTTPS enabled

### 2. On-Page SEO
- ✅ Semantic HTML
- ✅ Heading hierarchy (H1, H2, H3)
- ✅ Alt text cho images
- ✅ Internal linking
- ✅ Fast page load

## 🔧 Các bước tiếp theo cần làm thủ công

### Bước 1: Tạo Google Search Console

1. Truy cập [Google Search Console](https://search.google.com/search-console)
2. Click **Add Property**
3. Nhập `smartpath.id.vn`
4. Chọn phương thức xác minh **HTML tag**
5. Copy verification code
6. Thêm code vào `app/layout.tsx` trong metadata:
   ```tsx
   verification: {
     google: 'your-verification-code-here',
   }
   ```
7. Deploy và verify

### Bước 2: Submit Sitemap

1. Trong Google Search Console
2. Vào **Sitemaps** (menu bên trái)
3. Nhập URL: `https://smartpath.id.vn/sitemap.xml`
4. Click **Submit**

### Bước 3: Google Analytics 4

1. Truy cập [Google Analytics](https://analytics.google.com)
2. Tạo property mới cho `smartpath.id.vn`
3. Lấy Measurement ID (dạng G-XXXXXXXXXX)
4. Thêm vào project:

```bash
npm install @next/third-parties
```

Trong `app/layout.tsx`:
```tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </html>
  )
}
```

### Bước 4: Tạo nội dung chất lượng

**Chiến lược Content:**

1. **Blog/Tin tức** (tạo folder `app/blog`):
   - Viết bài về học tập
   - Hướng dẫn sử dụng platform
   - Chia sẻ kinh nghiệm sinh viên
   - Update 2-3 bài/tuần

2. **FAQ Page** (`app/faq/page.tsx`):
   - Câu hỏi thường gặp
   - Sử dụng structured data FAQPage

3. **Landing pages cho từ khóa**:
   - "Diễn đàn sinh viên UIT"
   - "Học tập online sinh viên"
   - "Chia sẻ tài liệu học tập"

### Bước 5: Backlinks

**Chiến lược xây dựng backlinks:**

1. **Forum/Community:**
   - Đăng ký profile trên các forum sinh viên
   - Reddit, Quora (tiếng Việt)
   - Groups Facebook sinh viên

2. **Guest Posting:**
   - Viết bài cho các blog giáo dục
   - Chia sẻ trên Medium, Dev.to

3. **Social Media:**
   - Tạo Fanpage Facebook
   - TikTok, YouTube shorts
   - LinkedIn company page

4. **Directories:**
   - Submit vào các directory:
     - https://www.google.com/business/
     - Các directory Việt Nam

### Bước 6: Local SEO (nếu có)

1. Google My Business
2. Bing Places
3. Schema.org LocalBusiness

### Bước 7: Performance Optimization

```bash
# Chạy Lighthouse audit
npm install -g lighthouse
lighthouse https://smartpath.id.vn --view
```

**Mục tiêu:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

**Tối ưu:**
- Image optimization (WebP)
- Lazy loading images
- Code splitting
- CDN (Netlify đã có)

### Bước 8: Monitoring

**Công cụ cần theo dõi:**

1. **Google Search Console:**
   - Impressions
   - Clicks
   - CTR
   - Average position

2. **Google Analytics:**
   - Users
   - Sessions
   - Bounce rate
   - Conversion rate

3. **PageSpeed Insights:**
   - Core Web Vitals
   - LCP, FID, CLS

## 🎯 KPI Mục tiêu (3-6 tháng)

- [ ] Top 10 cho "diễn đàn sinh viên"
- [ ] Top 5 cho "SmartPath"
- [ ] Top 3 cho "học tập sinh viên UIT"
- [ ] 1000+ organic visits/tháng
- [ ] Domain Authority 20+

## 📊 Checklist hàng tuần

- [ ] Publish 2-3 bài blog mới
- [ ] Check Search Console errors
- [ ] Monitor rankings
- [ ] Reply to user questions
- [ ] Share trên social media
- [ ] Build 2-3 backlinks mới

## 🔗 Resources

- [Google Search Central](https://developers.google.com/search)
- [Ahrefs Keyword Explorer](https://ahrefs.com/)
- [SEMrush](https://www.semrush.com/)
- [Moz](https://moz.com/)

## 📞 Next Steps

1. ✅ Deploy code mới
2. ⏳ Setup Google Search Console (ngay)
3. ⏳ Setup Google Analytics (ngay)
4. ⏳ Tạo nội dung blog (tuần này)
5. ⏳ Social media marketing (tuần này)
6. ⏳ Monitor & optimize (ongoing)
