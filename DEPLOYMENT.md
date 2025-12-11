# Hướng dẫn Deploy lên Netlify

## Bước 1: Chuẩn bị

Đảm bảo bạn đã:
- Có tài khoản [Netlify](https://www.netlify.com/)
- Push code lên GitHub repository
- Đã cài đặt tất cả dependencies: `npm install`

## Bước 2: Deploy qua Netlify Dashboard

### 2.1. Import project

1. Đăng nhập vào [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Chọn **GitHub** và authorize Netlify
4. Chọn repository: `caoquang284/SmartPath-FE`

### 2.2. Cấu hình Build Settings

Netlify sẽ tự động phát hiện Next.js project. Kiểm tra các settings sau:

- **Base directory**: (để trống)
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Functions directory**: (để trống)

### 2.3. Cấu hình Environment Variables

Trước khi deploy, cần thêm các biến môi trường:

1. Trong phần **Site settings** → **Environment variables**
2. Click **"Add a variable"** và thêm:

```
NEXT_PUBLIC_API_URL=http://34.142.139.243/api
NEXT_PUBLIC_HUB_URL=http://34.142.139.243/hubs/message
```

### 2.4. Deploy

1. Click **"Deploy site"**
2. Netlify sẽ build và deploy tự động
3. Chờ khoảng 2-5 phút để quá trình build hoàn tất

## Bước 3: Deploy qua Netlify CLI (Tùy chọn)

### 3.1. Cài đặt Netlify CLI

```bash
npm install -g netlify-cli
```

### 3.2. Login

```bash
netlify login
```

### 3.3. Init project

```bash
netlify init
```

Chọn:
- **Create & configure a new site**
- Chọn team của bạn
- Đặt tên site
- Build command: `npm run build`
- Publish directory: `.next`

### 3.4. Deploy

```bash
# Deploy draft (test)
netlify deploy

# Deploy production
netlify deploy --prod
```

## Bước 4: Cấu hình Environment Variables qua CLI

```bash
netlify env:set NEXT_PUBLIC_API_URL http://34.142.139.243/api
netlify env:set NEXT_PUBLIC_HUB_URL http://34.142.139.243/hubs/message
```

## Bước 5: Custom Domain (Tùy chọn)

1. Vào **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Làm theo hướng dẫn để cấu hình DNS

## Bước 6: Continuous Deployment

Netlify tự động deploy khi:
- Push code lên branch `main` (hoặc branch mặc định)
- Merge Pull Request

Để tắt auto-deploy:
1. Vào **Site settings** → **Build & deploy**
2. **Continuous deployment** → **Build settings**
3. Có thể dừng builds hoặc chỉ deploy từ branch cụ thể

## Troubleshooting

### Build failed

1. Kiểm tra logs trong Netlify dashboard
2. Đảm bảo `package.json` có đầy đủ dependencies
3. Test build local: `npm run build`

### Environment variables không hoạt động

1. Đảm bảo tên biến bắt đầu với `NEXT_PUBLIC_`
2. Sau khi thêm env vars, trigger rebuild:
   - Dashboard: **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
   - CLI: `netlify deploy --prod`

### Routing issues (404 errors)

- File `netlify.toml` đã được cấu hình với redirects rules
- Nếu vẫn gặp vấn đề, kiểm tra file `netlify.toml`

## Links hữu ích

- [Netlify Next.js Documentation](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Netlify CLI Documentation](https://cli.netlify.com/)
- [Environment Variables Guide](https://docs.netlify.com/environment-variables/overview/)

## Notes

- Project này sử dụng Next.js với App Router
- Build time: ~2-5 phút
- Auto-deployment được bật mặc định cho branch `main`
