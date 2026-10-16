# Demo camera AI qua Tailscale bằng mạng 4G

Quy trình này mở Web AgriTrace đang chạy trên máy tính cho điện thoại qua tailnet riêng. Không cần mở cổng router, dùng IP công khai hoặc đưa dịch vụ ra Internet.

## 1. Chuẩn bị một lần

- Máy tính có Docker Desktop và Tailscale.
- Điện thoại Android/iPhone có Tailscale và trình duyệt cập nhật.
- Hai thiết bị đăng nhập **cùng một tailnet**.
- Trong Tailscale Admin Console, bật **DNS > MagicDNS** và **HTTPS Certificates**.
- Tài khoản demo: `admin@gmail.com` / `1230123` hoặc `managera@gmail.com` / `1230123`.

Tên máy trong chứng chỉ Tailscale xuất hiện trong Certificate Transparency. Đổi tên máy trước nếu tên hiện tại chứa thông tin nhạy cảm.

## 2. Khởi động AgriTrace trên máy tính

Tại thư mục gốc dự án:

```powershell
docker compose up --build -d
docker compose ps
```

Chờ `mongo` và `blockchain` ở trạng thái healthy, rồi kiểm tra trên máy tính:

```text
http://localhost:3000
```

Nếu trang chưa mở được:

```powershell
docker compose logs --tail 100 web api blockchain mongo
```

## 3. Cấp URL HTTPS riêng qua Tailscale

Trên máy tính, kiểm tra Tailscale đã kết nối:

```powershell
tailscale status
```

Chuyển tiếp HTTPS của tailnet tới Web đang chạy ở cổng 3000:

```powershell
tailscale serve --bg --https=443 localhost:3000
tailscale serve status
```

Lần đầu chạy, Tailscale có thể in một URL để quản trị viên cho phép Serve. Mở URL đó, cấp quyền, rồi chạy lại lệnh.

Ghi lại URL đầy đủ do `tailscale serve status` hiển thị, dạng:

```text
https://ten-may.ten-tailnet.ts.net
```

Dùng đúng URL `https://...ts.net`; không dùng `localhost`, IP `100.x.y.z`, tên máy trần hoặc `http://` cho bước camera.

## 4. Demo thật bằng điện thoại dùng 4G/5G

1. Tắt Wi-Fi trên điện thoại; xác nhận điện thoại đang dùng 4G/5G.
2. Mở Tailscale, bật kết nối và xác nhận đúng tailnet với máy tính.
3. Mở Chrome hoặc Safari, truy cập URL HTTPS ở bước 3.
4. Đăng nhập bằng tài khoản demo.
5. Mở **Nhận diện sâu bệnh**.
6. Chọn lô cây được AI hỗ trợ. Mô hình hiện hỗ trợ **cà chua** và **ớt chuông**; lô không phù hợp sẽ không xuất hiện.
7. Chọn **Chụp ảnh bằng camera**, cho phép quyền camera, chụp lá rõ nét và xác nhận ảnh.
8. Có thể thêm tối đa 3 ảnh. Mỗi ảnh phải là JPEG, PNG hoặc WebP và không quá 5 MB.
9. Chọn **Phân tích bằng AI**.
10. Kiểm tra kết quả, độ tin cậy, mức rủi ro và lịch sử vừa lưu. Kết quả chỉ dùng sàng lọc ban đầu, không thay thế chẩn đoán chuyên môn.

Ảnh nên đủ sáng, nền gọn, lá chiếm phần lớn khung hình; nếu có thể chụp toàn cây, mặt trên và mặt dưới lá.

## 5. Dừng demo

Tắt Tailscale Serve nhưng giữ hệ thống chạy:

```powershell
tailscale serve --bg --https=443 localhost:3000 off
```

Tắt toàn bộ hệ thống:

```powershell
docker compose down
```

Không chạy `docker compose down -v` nếu cần giữ dữ liệu MongoDB.

## Xử lý sự cố

### Điện thoại 4G không mở được URL

- Trên cả hai thiết bị, xác nhận Tailscale đang bật và đăng nhập cùng tailnet.
- Trên máy tính chạy `tailscale status` và `tailscale serve status`.
- Xác nhận `http://localhost:3000` vẫn mở được trên máy tính.
- Dùng đúng URL HTTPS đầy đủ từ `tailscale serve status`.
- Trong Tailscale Admin Console, xác nhận máy tính online, MagicDNS/HTTPS đang bật và ACL/grants không chặn điện thoại.
- Thử kiểm tra đường truyền bằng `tailscale ping <ten-dien-thoai-hoac-IP-Tailscale>`. Kết nối qua DERP vẫn dùng được; không bắt buộc phải hiện `direct`.
- Tắt VPN khác, Private Relay hoặc ứng dụng chặn mạng trên điện thoại nếu chúng tranh quyền VPN với Tailscale.
- Nếu máy tính ngủ, mất mạng hoặc Docker Desktop dừng, điện thoại cũng mất truy cập.

### Trình duyệt báo chứng chỉ hoặc chuyển sang HTTP

- Không bỏ `https://` và không dùng tên máy trần.
- Kiểm tra **DNS > MagicDNS**, **HTTPS Certificates** và trạng thái TLS của máy trong Tailscale Admin Console.
- Cập nhật Tailscale trên máy tính và điện thoại, sau đó chạy lại lệnh `tailscale serve`.
- Nếu vừa đổi tên máy, lấy URL mới bằng `tailscale serve status`.

### Không thấy nút camera hoặc camera không mở

- Dùng Chrome/Safari mới trên điện thoại thật; trình duyệt desktop thường mở bộ chọn tệp thay vì camera.
- Cho phép quyền Camera cho trình duyệt trong cài đặt hệ điều hành.
- Mở qua URL Tailscale HTTPS, không mở bằng HTTP/IP.
- Đóng tab, mở lại URL rồi thử lại sau khi cấp quyền.
- Nếu camera vẫn lỗi, dùng **Chọn ảnh từ thiết bị** để tiếp tục demo AI.

### “Mô hình AI chưa sẵn sàng”

```powershell
docker compose ps
docker compose logs --tail 200 api
```

- Chờ API khởi động xong rồi tải lại trang.
- Kiểm tra máy còn đủ RAM và dung lượng để build/chạy image API.
- Build lại API nếu image cũ không chứa mô hình: `docker compose up --build -d api web`.

### Không có lô để chọn hoặc báo cây chưa được hỗ trợ

Mô hình chỉ bật nhóm cà chua và ớt chuông. Tạo/chọn lô trồng trọt có tên hoặc danh mục phù hợp; không ép lô cây khác hoặc sản phẩm chăn nuôi qua bộ phân loại.

### Tải ảnh hoặc phân tích thất bại

- Dùng 1–3 ảnh JPEG/PNG/WebP, tối đa 5 MB mỗi ảnh.
- Đăng nhập lại nếu phiên hết hạn.
- Chụp lại ảnh rõ, đủ sáng nếu kết quả “chưa đủ cơ sở”.
- Xem lỗi máy chủ bằng `docker compose logs --tail 200 api`.
