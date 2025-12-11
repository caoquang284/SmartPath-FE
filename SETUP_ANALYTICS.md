# Hướng dẫn Setup Google Analytics & Search Console

## 📊 PHẦN 1: GOOGLE ANALYTICS 4

### Bước 1: Tạo Google Analytics Account

1. **Truy cập**: https://analytics.google.com/
2. **Đăng nhập** bằng Google Account
3. Click **"Start measuring"** hoặc **"Admin"** (biểu tượng bánh răng ở góc dưới trái)

### Bước 2: Tạo Account

1. Click **"Create Account"**
2. **Account name**: Nhập `SmartPath`
3. Tick các checkbox về data sharing (khuyến nghị)
4. Click **Next**

### Bước 3: Tạo Property

1. **Property name**: Nhập `smartpath.id.vn`
2. **Reporting time zone**: Chọn `(GMT+07:00) Bangkok, Hanoi, Jakarta`
3. **Currency**: Chọn `Vietnamese Dong (₫)`
4. Click **Next**

### Bước 4: Thông tin doanh nghiệp

1. **Industry category**: Chọn `Education`
2. **Business size**: Chọn `Small` (1-10 employees) hoặc theo thực tế
3. Click **Next**

### Bước 5: Business objectives

Chọn một hoặc nhiều mục tiêu:
- ✅ **Examine user behavior** (Khuyến nghị)
- ✅ **Measure advertising ROI**
- Click **Create**

### Bước 6: Đồng ý Terms of Service

1. Chọn country: **Vietnam**
2. Đọc và tick ✅ **I accept**
3. Tick các checkbox email (tùy chọn)
4. Click **Accept**

### Bước 7: Setup Data Stream

1. Trong popup "Set up a data stream", chọn **Web**
2. **Website URL**: Nhập `https://smartpath.id.vn`
3. **Stream name**: Nhập `SmartPath Web`
4. ✅ Tick **Enhanced measurement** (khuyến nghị - tự động track scroll, clicks, downloads...)
5. Click **Create stream**

### Bước 8: Lấy Measurement ID

Sau khi tạo stream, bạn sẽ thấy:

```
Web stream details

Measurement ID
G-XXXXXXXXXX  [Copy button]
```

1. Click **Copy** bên cạnh Measurement ID
2. Measurement ID có dạng: `G-` + 10 ký tự (ví dụ: `G-ABC1234567`)

### Bước 9: Thêm vào Netlify Environment Variables

1. Truy cập **Netlify Dashboard**: https://app.netlify.com/
2. Chọn site **SmartPath**
3. Vào **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Điền:
   - **Key**: `NEXT_PUBLIC_GA_ID`
   - **Value**: `G-XXXXXXXXXX` (paste Measurement ID vừa copy)
   - **Scopes**: Production, Deploy Preview, Branch deploys (chọn hết)
6. Click **Create variable**

### Bước 10: Thêm vào file .env.local (Local development)

```bash
# Tạo hoặc edit file .env.local
echo "NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX" >> .env.local
```

Hoặc mở file `.env.local` và thêm:
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Bước 11: Deploy lại

Code đã có sẵn GA tracking, chỉ cần:
```bash
git add .
git commit -m "Add Google Analytics environment variable"
git push
```

Netlify sẽ tự động rebuild với GA_ID mới.

### Bước 12: Verify GA đang hoạt động

1. Truy cập: https://smartpath.id.vn
2. Quay lại Google Analytics
3. Vào **Reports** → **Realtime** (menu bên trái)
4. Sau 30 giây - 2 phút, bạn sẽ thấy:
   - **Users in last 30 minutes**: 1+
   - Map hiển thị vị trí của bạn
   - Page views

✅ **Thành công!** GA đã track được.

---

## 🔍 PHẦN 2: GOOGLE SEARCH CONSOLE

### Bước 1: Truy cập Search Console

1. **Truy cập**: https://search.google.com/search-console
2. **Đăng nhập** bằng cùng Google Account với GA

### Bước 2: Thêm Property

1. Click **Add Property** (hoặc dropdown ở góc trên bên trái)
2. Chọn **URL prefix** (khuyến nghị)
3. Nhập: `https://smartpath.id.vn`
4. Click **Continue**

### Bước 3: Verify Ownership - Chọn phương pháp

Có 5 phương pháp, **khuyến nghị dùng HTML tag**:

#### Phương pháp 1: HTML tag (Khuyến nghị - Dễ nhất)

1. Chọn tab **HTML tag**
2. Copy code có dạng:
   ```html
   <meta name="google-site-verification" content="ABC123xyz..." />
   ```
3. Copy phần **content** (ví dụ: `ABC123xyz...`)

4. **Cập nhật code**: File `app/layout.tsx` đã sẵn sàng, chỉ cần update:

Mở file `.env.local` và thêm:
```
NEXT_PUBLIC_GSC_VERIFICATION=ABC123xyz...
```

Hoặc thêm trực tiếp vào code:

```tsx
// In app/layout.tsx, find this line:
verification: {
  google: 'your-google-verification-code',
}

// Replace with your actual code:
verification: {
  google: 'ABC123xyz...',
}
```

5. Commit và push:
```bash
git add app/layout.tsx
git commit -m "Add Google Search Console verification"
git push
```

6. Đợi 2-3 phút để Netlify deploy xong

7. **Quay lại Search Console**, click **Verify**

✅ **"Ownership verified"** - Thành công!

#### Phương pháp 2: HTML file upload (Alternative)

1. Chọn tab **HTML file**
2. Download file (ví dụ: `google123abc.html`)
3. Upload file vào `/public/` folder của project
4. Commit và push
5. Verify tại Search Console

#### Phương pháp 3: DNS record (Alternative - Cần access DNS)

1. Chọn tab **Domain name provider**
2. Copy TXT record value
3. Thêm vào DNS của domain provider (nơi bạn mua domain)
4. Đợi DNS propagate (5-60 phút)
5. Click Verify

### Bước 4: Submit Sitemap

**SAU KHI VERIFY THÀNH CÔNG:**

1. Trong Search Console, menu bên trái chọn **Sitemaps**
2. Trong ô **"Add a new sitemap"**, nhập: `sitemap.xml`
3. Click **Submit**

Bạn sẽ thấy:
```
Sitemap: https://smartpath.id.vn/sitemap.xml
Status: Success
Discovered URLs: [number]
```

### Bước 5: Request Indexing

1. Menu bên trái chọn **URL Inspection**
2. Nhập: `https://smartpath.id.vn`
3. Chờ vài giây để kiểm tra
4. Click **Request Indexing**
5. Google sẽ crawl và index site trong vài giờ - vài ngày

### Bước 6: Monitor Performance

**Mất 2-3 ngày** để có data. Sau đó check:

1. **Overview**: Tổng quan impressions, clicks, CTR
2. **Performance**: Chi tiết keywords, pages
3. **Coverage**: Pages được index
4. **Enhancements**: Core Web Vitals, mobile usability

---

## 📋 CHECKLIST HOÀN THÀNH

### Google Analytics 4
- [ ] Tạo GA account và property
- [ ] Lấy được Measurement ID (G-XXXXXXXXXX)
- [ ] Thêm NEXT_PUBLIC_GA_ID vào Netlify Environment Variables
- [ ] Thêm vào .env.local (local dev)
- [ ] Deploy code
- [ ] Verify GA hoạt động (check Realtime)

### Google Search Console
- [ ] Tạo property cho smartpath.id.vn
- [ ] Verify ownership (HTML tag hoặc DNS)
- [ ] Submit sitemap.xml
- [ ] Request indexing cho homepage
- [ ] Setup email notifications

---

## 🎯 NEXT STEPS

### Ngay sau khi setup:

1. **Google Analytics**:
   - Setup Goals/Conversions (đăng ký, đăng bài, etc.)
   - Link với Google Ads (nếu có)
   - Setup custom events

2. **Search Console**:
   - Check Coverage report hàng tuần
   - Fix any errors
   - Monitor keyword rankings

### Hàng tuần:

1. **Check GA**:
   - Users, Sessions
   - Top pages
   - Traffic sources
   - Bounce rate

2. **Check GSC**:
   - Impressions, Clicks
   - Average position
   - CTR improvements
   - Coverage issues

### Hàng tháng:

1. **Optimize dựa trên data**:
   - Improve pages với high bounce rate
   - Optimize keywords với high impressions but low CTR
   - Fix slow pages (Core Web Vitals)

---

## 🆘 TROUBLESHOOTING

### GA không track được

**Check:**
1. GA_ID có đúng format G-XXXXXXXXXX?
2. Environment variable đã được set trên Netlify?
3. Site đã rebuild sau khi add env var?
4. Có ad blocker đang chạy?
5. Check Network tab trong DevTools xem có request tới GA không

**Fix:**
```bash
# Re-deploy
git commit --allow-empty -m "Trigger rebuild for GA"
git push
```

### Search Console không verify được

**Check:**
1. Meta tag đã được thêm vào `<head>`?
2. Site đã deploy chưa?
3. View source của https://smartpath.id.vn có chứa meta tag?

**Fix:**
- Thử phương pháp khác (HTML file hoặc DNS)
- Clear cache và thử verify lại
- Đợi 5-10 phút sau deploy rồi verify

### Sitemap không submit được

**Check:**
1. Truy cập https://smartpath.id.vn/sitemap.xml có hiển thị XML?
2. Sitemap có lỗi syntax không?

**Fix:**
```bash
# Test sitemap locally
npm run build
npm run start
# Visit http://localhost:3000/sitemap.xml
```

---

## 📞 SUPPORT

Nếu gặp vấn đề:
1. Check [GA Help Center](https://support.google.com/analytics)
2. Check [Search Console Help](https://support.google.com/webmasters)
3. Google: "next.js google analytics 4 not working"
