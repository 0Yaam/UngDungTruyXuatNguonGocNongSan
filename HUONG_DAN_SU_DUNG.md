# 📱 Hướng Dẫn Sử Dụng - Ứng Dụng Truy Xuất Nguồn Gốc Nông Sản

## 📋 Mục Lục
1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Cài đặt và khởi chạy](#cài-đặt-và-khởi-chạy)
3. [Hướng dẫn sử dụng Web Admin](#hướng-dẫn-sử-dụng-web-admin)
4. [Hướng dẫn sử dụng App Mobile](#hướng-dẫn-sử-dụng-app-mobile)
5. [Demo từng chức năng](#demo-từng-chức-năng)
6. [Tài khoản test](#tài-khoản-test)

---

## 🌐 Tổng Quan Hệ Thống

### Kiến trúc
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Flutter App   │────▶│   Node.js API   │────▶│    MongoDB      │
│   (Mobile)      │     │   (Backend)     │     │   (Database)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌─────────────────┐
│   React Web     │     │   Blockchain    │
│   (Admin)       │     │   (Ethereum)    │
└─────────────────┘     └─────────────────┘
```

### Các thành phần chính
| Thành phần | Công nghệ | Cổng | Mô tả |
|------------|-----------|------|-------|
| API Backend | Node.js + Express + TypeScript | 5000 | Xử lý logic nghiệp vụ |
| Web Admin | React + TypeScript | 3000 | Quản lý sản phẩm, vùng trồng |
| Mobile App | Flutter | - | Quét QR, xem truy xuất |
| Database | MongoDB | 27017 | Lưu trữ dữ liệu |
| Blockchain | Hardhat + Solidity | 8545 | Xác thực dữ liệu |

---

## 🚀 Cài Đặt và Khởi Chạy

### Cách 1: Sử dụng Docker (Khuyến nghị)
```bash
# Chạy toàn bộ hệ thống
docker-compose up -d

# Hoặc sử dụng file batch
start-docker.bat
```

### Cách 2: Chạy thủ công

#### 1. Khởi động API Backend
```bash
cd "Source code/api"
npm install
npm run dev
```
→ API chạy tại: http://localhost:5000

#### 2. Khởi động Web Admin
```bash
cd "Source code/web"
npm install
npm run dev
```
→ Web chạy tại: http://localhost:3000

#### 3. Khởi động Blockchain (tuỳ chọn)
```bash
cd "Source code/blockchain"
npm install
npx hardhat node
# Mở terminal khác:
npx hardhat run scripts/deploy.ts --network localhost
```
→ Blockchain chạy tại: http://localhost:8545

#### 4. Chạy Flutter App
```bash
cd "Source code/app"
flutter pub get
flutter run
```

---

## 💻 Hướng Dẫn Sử Dụng Web Admin

### Đăng nhập
1. Truy cập http://localhost:3000
2. Nhập email và mật khẩu
3. Nhấn "Đăng nhập"

### Menu chính
| Icon | Tên | Chức năng |
|------|-----|-----------|
| 📊 | Dashboard | Tổng quan, tạo sản phẩm mới |
| 📦 | Sản phẩm | Quản lý danh sách sản phẩm |
| 🌾 | Vùng canh tác | Quản lý vùng trồng/chăn nuôi |
| 📜 | Chứng nhận | Quản lý chứng nhận chất lượng |
| 📋 | Sự kiện | Quản lý nhật ký sản xuất |
| 👥 | Người dùng | Quản lý tài khoản (Admin) |

---

## 📱 Hướng Dẫn Sử Dụng App Mobile

### Màn hình chính
1. **Quét QR**: Quét mã QR trên sản phẩm để xem thông tin truy xuất
2. **Danh sách sản phẩm**: Xem tất cả sản phẩm có thể truy xuất
3. **Tài khoản**: Đăng nhập/đăng ký, xem thông tin cá nhân

### Quét QR Code
1. Nhấn nút "Quét QR" trên màn hình chính
2. Đưa camera hướng vào mã QR trên sản phẩm
3. Xem thông tin chi tiết truy xuất nguồn gốc

---

## 🎯 Demo Từng Chức Năng

### 1. 🌾 Quản lý Vùng Canh Tác

#### Tạo vùng canh tác mới
1. Vào menu **Vùng canh tác**
2. Nhấn nút **"+ Thêm vùng canh tác"**
3. Điền thông tin:
   - **Tên vùng**: VD: "Nông trại Đà Lạt"
   - **Địa chỉ**: VD: "Xã Xuân Thọ, TP. Đà Lạt, Lâm Đồng"
   - **Diện tích**: VD: 5.5 (ha)
   - **Mô tả**: VD: "Vùng trồng rau sạch theo tiêu chuẩn VietGAP"
4. Nhấn **"Lưu"**

#### Xem chi tiết vùng
- Nhấn vào card vùng canh tác để xem:
  - Thông tin cơ bản
  - Danh sách chứng nhận (nếu có)
  - Chủ sở hữu

---

### 2. 📜 Quản lý Chứng Nhận

#### Cấp chứng nhận cho vùng canh tác
1. Vào menu **Chứng nhận**
2. Nhấn nút **"+ Thêm chứng nhận"**
3. Điền thông tin:
   - **Tên chứng nhận**: VD: "VietGAP Rau An Toàn"
   - **Loại**: Chọn VietGAP / GlobalGAP / Organic
   - **Số chứng nhận**: VD: "VG-2024-001234"
   - **Cơ quan cấp**: VD: "Trung tâm Chứng nhận Phù hợp QUACERT"
   - **Vùng canh tác**: Chọn vùng đã tạo
   - **Ngày cấp**: VD: 01/01/2024
   - **Ngày hết hạn**: VD: 01/01/2027
4. Nhấn **"Lưu"**

#### Màu sắc theo loại chứng nhận
| Loại | Màu | Ý nghĩa |
|------|-----|---------|
| 🇻🇳 VietGAP | Xanh lá | Tiêu chuẩn Việt Nam |
| 🌍 GlobalGAP | Xanh dương | Tiêu chuẩn quốc tế |
| 🌿 Organic | Vàng cam | Hữu cơ |

---

### 3. 📦 Tạo Sản Phẩm / Lô Nông Sản

#### Tạo sản phẩm mới
1. Vào **Dashboard** hoặc menu **Sản phẩm**
2. Nhấn **"+ Tạo sản phẩm"**
3. Điền thông tin:
   - **Tên sản phẩm**: VD: "Cà chua Đà Lạt"
   - **Loại**: Trồng trọt / Chăn nuôi
   - **Danh mục**: VD: "Rau củ"
   - **Vùng canh tác**: Chọn vùng (tự động điền xuất xứ)
   - **Mô tả**: VD: "Cà chua bi organic, trồng tại Đà Lạt"
   - **Hình ảnh**: Upload ảnh sản phẩm
4. Nhấn **"Lưu"**

#### Mã QR tự động
- Sau khi tạo, hệ thống tự động sinh mã QR
- Có thể tải xuống hoặc in mã QR để dán lên sản phẩm

---

### 4. 📋 Ghi Nhật Ký Sản Xuất (Trace Events)

#### Các loại sự kiện
| Icon | Loại | Mô tả |
|------|------|-------|
| 🌱 | SEEDING | Gieo hạt |
| 🧪 | FERTILIZING | Bón phân |
| 💊 | PESTICIDE | Phun thuốc BVTV |
| 💧 | WATERING | Tưới nước |
| 🌾 | HARVESTING | Thu hoạch |
| 🏭 | PROCESSING | Chế biến |
| 📦 | PACKAGING | Đóng gói |
| 🚛 | SHIPPING | Vận chuyển |
| ✅ | QUALITY_CHECK | Kiểm tra chất lượng |

#### Ghi sự kiện mới
1. Vào menu **Sự kiện** hoặc vào chi tiết sản phẩm
2. Nhấn **"+ Thêm sự kiện"**
3. Chọn sản phẩm (nếu chưa chọn)
4. Điền thông tin:
   - **Loại sự kiện**: Chọn từ danh sách
   - **Mô tả**: VD: "Bón phân NPK 16-16-8, liều lượng 50kg/ha"
   - **Chi tiết** (tuỳ chọn):
     - Tên phân: NPK 16-16-8
     - Liều lượng: 50kg/ha
     - Người thực hiện: Nguyễn Văn A
5. Nhấn **"Lưu"**

#### Xác thực Blockchain
- Sau khi tạo, sự kiện có trạng thái "Chờ xác thực"
- Nhấn **"Ghi Blockchain"** để xác thực
- Sau khi xác thực: hiển thị ✅ và mã giao dịch (TxHash)

---

### 5. 🔍 Truy Xuất Nguồn Gốc (Mobile App)

#### Quét QR
1. Mở app Flutter
2. Nhấn **"Quét QR"**
3. Đưa camera vào mã QR trên sản phẩm
4. Xem thông tin hiển thị:

#### Màn hình chi tiết truy xuất
```
┌─────────────────────────────────────┐
│  🟢 Gradient Header                 │
│  ┌────┐  Cà chua Đà Lạt            │
│  │ 🍅 │  🌾 Trồng trọt              │
│  └────┘  📍 Đà Lạt, Lâm Đồng       │
│          📅 Bắt đầu: 01/01/2024    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🏷️ Mã lô sản phẩm                  │
│ ┌─────────────────────────────────┐ │
│ │ 📱 507f1f77bcf86cd799439011     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🌾 Vùng canh tác                    │
│ Tên vùng: Nông trại Đà Lạt         │
│ Địa chỉ: Xuân Thọ, Đà Lạt          │
│ Diện tích: 5.5 ha                   │
│ Chủ sở hữu: Nguyễn Văn A           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📜 Chứng nhận chất lượng            │
│ ┌───────────────────┐               │
│ │ 🇻🇳 VietGAP        │ ✓ Hợp lệ     │
│ │ Số: VG-2024-001234│               │
│ │ QUACERT           │               │
│ └───────────────────┘               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⛓️ Xác thực Blockchain              │
│ ✅ Đã xác thực trên Blockchain      │
│ 5 sự kiện đã ghi                    │
│ Batch ID: 507f1f77bcf86cd799439011 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📅 Lịch sử truy xuất    [5 sự kiện] │
│                                     │
│ ●─ 🌱 Gieo hạt          01/01/2024 │
│ │  Gieo hạt cà chua giống F1       │
│ │  ✅ Đã xác thực blockchain        │
│ │                                   │
│ ●─ 🧪 Bón phân          15/01/2024 │
│ │  Bón phân NPK 16-16-8            │
│ │  ✅ Đã xác thực blockchain        │
│ │                                   │
│ ●─ 💧 Tưới nước         20/01/2024 │
│    Tưới nhỏ giọt tự động           │
│    ✅ Đã xác thực blockchain        │
└─────────────────────────────────────┘
```

---

### 6. ⛓️ Xác Thực Blockchain

#### Cách hoạt động
1. Mỗi sự kiện được tạo ra có một **dataHash** (mã băm dữ liệu)
2. Hash này được ghi lên blockchain Ethereum
3. Sau khi ghi, không thể sửa đổi được nữa
4. Người dùng có thể xác minh bằng cách so sánh hash

#### Xác minh tính toàn vẹn
1. Trong chi tiết truy xuất, nhấn **"Xác minh"**
2. Hệ thống sẽ:
   - Tính lại hash từ dữ liệu hiện tại
   - So sánh với hash trên blockchain
3. Kết quả:
   - ✅ **Hợp lệ**: Dữ liệu chưa bị thay đổi
   - ❌ **Không hợp lệ**: Dữ liệu đã bị sửa đổi

---

## 👤 Tài Khoản Test

### Web Admin
| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@example.com | 123456 | Admin |
| farmer@example.com | 123456 | Nông dân |

### Mobile App
- Có thể đăng ký tài khoản mới
- Hoặc sử dụng tài khoản trên để đăng nhập

---

## 🔧 Troubleshooting

### Lỗi thường gặp

#### 1. EADDRINUSE: address already in use
```bash
# Tìm và tắt process đang dùng port
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

#### 2. MongoDB connection failed
- Kiểm tra MongoDB đang chạy
- Kiểm tra connection string trong `.env`

#### 3. Flutter app không kết nối được API
- Đổi `localhost` thành IP máy trong `lib/core/api_client.dart`
- VD: `http://192.168.1.100:5000/api`

#### 4. Blockchain không hoạt động
- Đảm bảo Hardhat node đang chạy
- Chạy lại deploy script

---

## 📞 Liên Hệ Hỗ Trợ

- **Email**: support@example.com
- **Tài liệu API**: http://localhost:5000/api-docs (nếu có Swagger)

---

*Cập nhật lần cuối: 02/04/2026*
