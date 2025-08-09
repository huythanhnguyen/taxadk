# HTKK AI Frontend

Giao diện người dùng cho hệ thống kê khai thuế thông minh HTKK AI.

## Tính năng

- 🤖 **Multi-Agent Chat**: Tương tác với 3 AI agents chuyên biệt
- 📋 **Tax Forms**: Tạo và quản lý tờ khai thuế (01/GTGT, 03/TNDN, 02/TNCN)
- 📄 **Document Processing**: Upload và xử lý PDF/XML/hình ảnh
- 💾 **Session Management**: Lưu trữ lịch sử chat
- 🎨 **Modern UI**: Giao diện hiện đại với Tailwind CSS và Shadcn/ui
- 📱 **Responsive**: Tối ưu cho mobile và desktop

## Tech Stack

- **Framework**: React 18+ với TypeScript
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + Shadcn/ui
- **State Management**: React Hooks + Zustand
- **Form Handling**: React Hook Form + Zod
- **Routing**: React Router DOM
- **Markdown**: React Markdown với GFM support

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Cấu trúc thư mục

```
src/
├── components/          # React components
│   ├── ui/             # Base UI components (Shadcn/ui)
│   ├── chat/           # Chat-related components
│   ├── tax-forms/      # Tax form components
│   └── WelcomeScreen.tsx
├── types/              # TypeScript type definitions
├── services/           # API services
├── utils/              # Utility functions
├── lib/                # Library configurations
└── assets/             # Static assets
```

## Environment Variables

Tạo file `.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_ADK_SERVER_URL=http://127.0.0.1:8000
```

## Tích hợp với Backend

Frontend kết nối với HTKK AI backend qua:

- **REST API**: Quản lý session, user, forms
- **Server-Sent Events (SSE)**: Real-time chat streaming
- **File Upload**: Xử lý PDF/XML documents

## Components chính

### WelcomeScreen
- Màn hình chào mừng với quick actions
- Form selection và file upload
- Giới thiệu tính năng

### ChatMessagesView
- Hiển thị cuộc trò chuyện với AI
- Support markdown rendering
- Function call timeline
- File upload trong chat

### TaxFormView
- Tạo và chỉnh sửa tờ khai thuế
- Dynamic form rendering
- Real-time calculations
- XML export

### ChatHistorySidebar
- Lịch sử cuộc trò chuyện
- Search và filter
- Session management

## Customization

### Themes
Sử dụng CSS variables để customize theme:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 96%;
  /* ... */
}
```

### Components
Extend base components từ `src/components/ui/`:

```tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CustomButton({ className, ...props }) {
  return (
    <Button 
      className={cn("custom-styles", className)} 
      {...props} 
    />
  )
}
```

## Development

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Component-first architecture

### Testing
```bash
# Run tests (khi có)
npm test

# Type checking
npx tsc --noEmit
```

### Build Optimization
- Tree shaking
- Code splitting
- Asset optimization
- Bundle analysis

## Deployment

### Production Build
```bash
npm run build
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.
