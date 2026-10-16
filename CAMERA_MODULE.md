# Camera module

## Luồng hoạt động

- Mặc định Camera chỉ phát live stream. Không có inference nền.
- Người dùng chọn `Chẩn đoán bệnh cây`, sau đó API lấy snapshot đã cấu hình, frame mới nhất của camera điện thoại, hoặc ảnh người dùng chọn.
- Frame được lưu trong `uploads/camera-tasks`, gửi qua adapter `cameraTask.service.ts`, phân tích bằng pipeline ONNX hiện có và lưu `CameraTaskRun`.
- Nhiệm vụ mới được thêm bằng một definition và runner trong `cameraTask.service.ts`; không cần đổi model Camera hay giao diện quản lý.

## Camera thật và MediaMTX

1. Chạy `docker compose up --build`.
2. Camera/encoder publish RTSP tới `rtsp://<server>:8554/<stream-path>` hoặc cấu hình MediaMTX pull RTSP nguồn.
3. Tạo Camera trong web/mobile và đặt playback URL thành `http://<server>:8889/<stream-path>` (WebRTC) hoặc `http://<server>:8888/<stream-path>/index.m3u8` (HLS).
4. Nếu camera có HTTP snapshot endpoint, cấu hình `snapshot_url` để chẩn đoán không cần upload thủ công.

## Tailscale

Web vẫn được mở qua Tailscale Serve. Với MediaMTX, tạo thêm HTTPS endpoint và dùng URL đó trong Camera:

```powershell
tailscale serve --bg --https=443 http://localhost:3000
tailscale serve --bg --https=8443 http://localhost:8889
tailscale serve --bg --https=8444 http://localhost:8888
```

Đặt `MEDIA_PUBLIC_WEBRTC_BASE=https://<ten-may>.<tailnet>.ts.net:8443` và `MEDIA_PUBLIC_HLS_BASE=https://<ten-may>.<tailnet>.ts.net:8444`. Cổng UDP `8189` cần đi được trong tailnet để WebRTC dùng đường media trực tiếp; HLS là phương án dự phòng chỉ qua HTTPS.

## Heartbeat và trạng thái

Khi tạo camera, API trả `ingest_key` đúng một lần. Agent camera gửi heartbeat:

```bash
curl -X POST http://server:5000/api/v1/cameras/agent/CAM-XXXX/heartbeat \
  -H "x-camera-key: <ingest_key>" \
  -H "content-type: application/json" \
  -d '{}'
```

Camera tự offline sau `CAMERA_OFFLINE_AFTER_MS` nếu không có heartbeat hoặc task thành công.

## Migration camera cũ

```bash
cd "Source code/api"
npm run data:migrate-cameras
```

Script giữ nguyên `Product.live_cameras` để trang truy xuất cũ tiếp tục hoạt động, đồng thời tạo Camera độc lập cho module mới.

## Dùng điện thoại làm camera qua Tailscale

Không cần camera IP để chạy thử. Trình duyệt trên điện thoại có thể phát camera sau trực tiếp vào module Camera:

1. Trên web, vào **Giám sát nông trại** và tạo camera với loại nguồn **Điện thoại qua Tailscale**.
2. Trên máy chạy Docker, cấp URL HTTPS cho web:

```powershell
tailscale serve --bg --https=443 http://localhost:3000
tailscale serve status
```

3. Điện thoại và máy chủ cùng đăng nhập một tailnet. Trên điện thoại, mở URL `https://<ten-may>.<tailnet>.ts.net` do `tailscale serve status` trả về.
4. Đăng nhập AgriTrace, mở **Giám sát nông trại**, chọn camera Phone và bấm **Dùng điện thoại làm camera**.
5. Cấp quyền camera, bấm **Bắt đầu phát** và giữ trang này mở. Giao diện ưu tiên camera sau, nén JPEG tối đa 960 px và khoảng 3 FPS để giảm băng thông.
6. Trên máy tính hoặc thiết bị khác, mở cùng camera để xem live. Khi cần AI, chọn **Chẩn đoán bệnh cây** rồi bấm chạy; mặc định camera chỉ giám sát và không chạy AI nền.

Trình duyệt chỉ cho dùng `getUserMedia` trong secure context. Vì vậy phải mở bằng URL HTTPS Tailscale hoặc `localhost`; URL `http://100.x.x.x` sẽ không được cấp quyền camera.
