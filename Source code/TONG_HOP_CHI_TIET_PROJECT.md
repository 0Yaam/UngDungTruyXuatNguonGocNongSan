# TONG HOP CHI TIET PROJECT

Ngay cap nhat: 2026-04-17

## 1) Tong quan he thong

Day la he thong truy xuat nguon goc nong san da nen tang, gom 4 khoi chinh:

- Backend API: Node.js + TypeScript + Express + MongoDB + Ethers.
- Blockchain: Hardhat + Solidity (Traceability smart contract).
- Web app: React + TypeScript (quan tri/van hanh).
- Mobile app: Flutter (farmer/manager/consumer).

Mo hinh du lieu lai:

- Off-chain (MongoDB): luu du lieu nghiep vu chi tiet, truy van nhanh.
- On-chain (EVM): luu hash va lich su hanh dong de dam bao tinh toan ven.

## 2) Muc tieu nghiep vu

- Quan ly vong doi lo nong san (batch/product).
- Ghi nhan su kien theo timeline canh tac/che bien/van chuyen.
- Tao QR de truy xuat nhanh tren web/mobile.
- Xac minh du lieu su kien qua blockchain.
- Xuat bao cao PDF/Excel va bo QR.

## 3) Kien truc tong the

```text
[Web React] ----\
                 \         +---------------------------+
[Mobile Flutter] ---> API  | Express + MongoDB        |
                 /         | (du lieu off-chain)       |
[Other Clients]-/          +------------+--------------+
                                        |
                                        | ethers
                                        v
                             +--------------------------+
                             | Traceability.sol         |
                             | (bang chung on-chain)    |
                             +--------------------------+
```

Luong xu ly tong quat:

1. Client gui request tao product/trace event den API.
2. API luu du lieu nghiep vu vao MongoDB.
3. API hash core data va ghi hash len smart contract.
4. API tra ve metadata on-chain/off-chain cho client.
5. Client co the verify lai su kien theo eventId.

## 4) Cau truc thu muc va vai tro

### 4.1 Thu muc goc

- create_traceability_doc.py, make_docx.py: script tao tai lieu Word.
- TONG_HOP_CHI_TIET_PROJECT.md: tai lieu tong hop (file nay).
- Dockerfile (goc): hien tai khong dung lam runtime chinh.

### 4.2 Backend API (api/)

- Entry point: api/src/index.ts.
- Router tong hop: api/src/routes/index.ts (base /api/v1).
- Cau hinh env/db/upload/blockchain: api/src/config/.
- Service nghiep vu: api/src/services/.
- Controller + middleware + model: api/src/controllers/, api/src/middlewares/, api/src/models/.

Nhom nghiep vu chinh:

- Auth, users, product, trace event.
- Farming area, certification.
- Export, upload.
- Notification, admin, search, audit log.

### 4.3 Smart Contract (blockchain/)

- Contract chinh dang dung: blockchain/contracts/Traceability.sol.
- Contract thu nghiem/legacy: blockchain/contracts/AgriTraceability.sol.
- Deploy script: blockchain/scripts/deploy.ts.
- Unit test contract: blockchain/test/Traceability.test.ts.
- Cau hinh Hardhat: blockchain/hardhat.config.ts.

### 4.4 Web (web/)

- Entry: web/src/index.tsx, web/src/App.tsx.
- API client va wrappers: web/src/core/api/.
- Auth context va pages/components trong web/src/.
- Build deployment qua nginx (web/Dockerfile + web/nginx.conf).

### 4.5 Mobile (app/)

- Entry: app/lib/main.dart.
- Cau truc: app/lib/core, app/lib/screens, app/lib/services, app/lib/providers.
- Ho tro quet QR, xem trace timeline, thao tac nghiep vu theo role.

## 5) Cong nghe chinh

### API

- express, typescript, mongoose.
- xac thuc: jwt + bcrypt.
- upload: multer.
- export: pdfkit, exceljs, qrcode.
- blockchain sdk: ethers.

### Blockchain

- hardhat, solidity ^0.8.24, hardhat-toolbox.

### Web

- react 18, typescript, react-router-dom, axios.

### Mobile

- flutter, dio, riverpod.
- qr/mobile scan: mobile_scanner, qr_flutter.

## 6) Luong on-chain/off-chain chi tiet

### 6.1 Tao product

Trong api/src/services/product.service.ts:

- Tao Product trong MongoDB.
- Lay product._id lam batchId.
- Neu da cau hinh blockchain:
  - Goi createBatchOnChain(batchId).
  - Cap nhat onChainBatchId va status active.
- Tao QR truy xuat: {FRONTEND_URL}/trace/{batchId}.

### 6.2 Tao trace event

Trong api/src/services/traceEvent.service.ts:

- Tao TraceEvent voi trang thai ban dau pending.
- Tao coreData (batchId, eventType, description, details, recordedBy).
- Hash coreData bang keccak256.
- Neu chua cau hinh blockchain:
  - Danh dau onChainStatus = skipped.
  - Van luu dataHash off-chain.
- Neu da cau hinh blockchain:
  - Kiem tra batch ton tai tren chain.
  - Neu chua co thi tao batch truoc.
  - Goi addAction len contract.
  - Luu txHash, blockNumber, actionIndex, onChainStatus = confirmed.
- Neu ghi chain loi:
  - onChainStatus = failed.
  - Van luu hash off-chain de doi soat.

### 6.3 Verify su kien

- Endpoint verify tim event theo eventId.
- Rebuild hash tu coreData.
- Goi verifyAction(batchId, actionIndex, dataHash) tren contract.
- Tra ve ket qua verified va metadata lien quan.

## 7) Smart contract Traceability

File: blockchain/contracts/Traceability.sol

Kieu du lieu chinh:

- ActionType: SEEDING, FERTILIZING, WATERING, PEST_CONTROL, HARVESTING, PACKAGING, SHIPPING.
- Action: dataHash, actionType, timestamp, recorder.
- Batch: owner, exists, actions[].

Ham chinh:

- createBatch(batchId).
- addAction(batchId, dataHash, actionType) (chi owner batch).
- getHistory(batchId).
- verifyAction(batchId, index, dataHash).
- getActionCount(batchId).
- batchExists(batchId).
- getBatchOwner(batchId).

## 8) API REST (base /api/v1)

### 8.1 Auth

- POST /auth/register
- POST /auth/login
- GET /auth/logout
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/change-password (auth)

### 8.2 Users

- GET /users (admin)
- GET /users/:id (auth)
- PATCH /users/update (auth)

### 8.3 Products

- GET /products
- GET /products/:id
- POST /products (admin/manager/farmer)
- PATCH /products/:id (admin/manager)
- DELETE /products/:id (admin)

### 8.4 Trace

- GET /trace/verify/:eventId
- GET /trace/:productId
- GET /trace/events/product/:productId (auth)
- POST /trace/events (admin/manager/farmer)

### 8.5 Farming areas

- GET /farming-areas
- GET /farming-areas/my/areas (auth)
- GET /farming-areas/:id
- POST /farming-areas (admin/manager/farmer)
- PATCH /farming-areas/:id (admin/manager/farmer)
- DELETE /farming-areas/:id (admin)

### 8.6 Certifications

- GET /certifications
- GET /certifications/holder/:userId
- GET /certifications/farming-area/:areaId
- GET /certifications/:id
- POST /certifications (admin/manager)
- POST /certifications/check-expired (admin)
- PATCH /certifications/:id (admin/manager)
- DELETE /certifications/:id (admin)

### 8.7 Export

Tat ca endpoint export can auth:

- GET /export/product/:id/pdf
- GET /export/product/:id/timeline
- GET /export/products/excel
- GET /export/product/:id/qr
- POST /export/qr/batch

### 8.8 Upload

- POST /upload/single (auth)
- POST /upload/multiple (auth)
- DELETE /upload/:filename (auth)

### 8.9 Notifications

- GET /notifications (auth)
- GET /notifications/unread-count (auth)
- PATCH /notifications/read-all (auth)
- PATCH /notifications/:id/read (auth)
- DELETE /notifications/:id (auth)
- POST /notifications/check-expiring-certifications (admin)

### 8.10 Admin

- GET /admin/dashboard (admin)
- GET /admin/users (admin)
- PATCH /admin/users/:id/role (admin)
- PATCH /admin/users/:id/status (admin)
- DELETE /admin/users/:id (admin)
- GET /admin/health (admin)

### 8.11 Search

- GET /search/products
- GET /search/products/stats
- GET /search/events
- GET /search/events/stats

### 8.12 Audit logs

- GET /audit-logs (admin)
- GET /audit-logs/entity/:entity/:entityId (admin/manager)
- GET /audit-logs/user/:userId (admin)

## 9) Mo hinh du lieu chinh

### Product

- Truong quan trong: name, category, type, origin, status, farming_area, qrcode, onChainBatchId, created_by.
- status: draft | active | completed.

### TraceEvent

- Truong quan trong: product, batchId, eventType, description, details, images/videos, recorded_by.
- Metadata blockchain: dataHash, txHash, blockNumber, actionIndex, onChainStatus.
- onChainStatus: pending | confirmed | failed | skipped.

### User

- Truong quan trong: first_name, last_name, email, role, isActive.
- role: admin | manager | farmer | consumer.

## 10) Bien moi truong can thiet

### 10.1 API (api/.env)

- PORT (mac dinh 5000)
- DB_URI
- JWT_SECRET
- JWT_LIFETIME
- BLOCKCHAIN_RPC_URL (mac dinh http://127.0.0.1:8545)
- BLOCKCHAIN_PRIVATE_KEY
- CONTRACT_ADDRESS
- FRONTEND_URL (mac dinh http://localhost:3000)
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (neu dung cloud media)

### 10.2 Blockchain (blockchain/.env)

- PRIVATE_KEY
- SEPOLIA_RPC_URL
- AMOY_RPC_URL
- ETHERSCAN_API_KEY
- POLYGONSCAN_API_KEY
- CONTRACT_NAME (tuy chon)

### 10.3 Web

- REACT_APP_API_URL (thuong dung /api/v1 hoac URL API day du)

### 10.4 Mobile

- Dart define khi chay:
  - --dart-define=API_BASE_URL=http://<host>:5000/api/v1

## 11) Run local de dev

### 11.1 Blockchain

```bash
cd blockchain
npm install
npm run node
```

Mo terminal khac:

```bash
cd blockchain
npm run deploy:local
```

Lay CONTRACT_ADDRESS moi va cap nhat cho API.

### 11.2 API

```bash
cd api
npm install
npm run dev
```

API mac dinh: http://localhost:5000

### 11.3 Web

```bash
cd web
npm install
npm start
```

Web mac dinh: http://localhost:3000

### 11.4 Mobile

```bash
cd app
flutter pub get
flutter run
```

Voi Android emulator, backend host thuong la 10.0.2.2.

## 12) Docker hien co

- api/Dockerfile: multi-stage build TypeScript -> dist, runtime Node 20 slim.
- blockchain/Dockerfile: chay hardhat node + deploy script local.
- web/Dockerfile: build React va serve bang nginx.
- web/nginx.conf: proxy /api sang api service.

Tinh trang hien tai:

- Chua co docker-compose.yml de run full stack.
- Dockerfile o root khong phai entrypoint chinh.

## 13) Test va chat luong

- Da co test smart contract: blockchain/test/Traceability.test.ts.
- Chua thay bo test tu dong day du cho API/Web/Mobile.

## 14) Rui ro va luu y ky thuat

- Ton tai code legacy JS trong api/controllers/traceController.js va api/models/Batch.js.
- Runtime hien tai cua API la TypeScript (api/src/index.ts), can tranh sua nham vao code legacy.
- package.json thu muc goc khong dai dien cho toan bo monorepo.
- Mot so chuoi tieng Viet trong source dang loi encoding, nen chuan hoa UTF-8.

## 15) De xuat cai tien ngan han

1. Bo sung docker-compose.yml cho blockchain + api + web + db.
2. Tao .env.example cho tung module.
3. Them test integration cho product/trace flow.
4. Don dep hoac tach ro code legacy JS va TS.
5. Bo sung sequence diagram cho 3 luong: create product, create trace event, verify.

## 16) De xuat tach tai lieu (neu can)

- ARCHITECTURE.md: kien truc va data flow.
- API_REFERENCE.md: endpoint va payload mau.
- RUNBOOK.md: van hanh, monitoring, su co.
- SECURITY_NOTES.md: quy tac bao mat, key management, permissions.

## 17) Cap nhat nen tang truy xuat

- Hash su kien moi dung canonical JSON de bao phu ca du lieu long nhau trong `details`.
- Truong `dataHashVersion` phan biet hash `v1` cu va `v2` moi, giup du lieu da ghi blockchain van xac minh duoc.
- Farmer chi duoc tao va retry su kien cho lo nong san do minh quan ly.
- Endpoint moi: `POST /api/v1/trace/events/:eventId/retry` cho su kien `failed` hoac `skipped`.
- Retry co khoa trang thai atomic de han che hai yeu cau ghi trung mot su kien.
- Web hien thi nut ghi lai blockchain cho tai khoan co quyen.
- Thao tac tao/sua/xoa product, tao trace event va retry duoc ghi vao audit log.

## 18) Kiem nghiem chat luong

- Bo sung mo hinh `QualityInspection` gan truc tiep voi tung lo nong san.
- Quan ly so phieu, loai kiem nghiem, phong thi nghiem, ngay lay mau, ket luan va tai lieu goc.
- Ho tro cac chi tieu chi tiet gom gia tri do, don vi, nguong cho phep va ket qua dat/khong dat.
- API cong khai: `GET /api/v1/quality-inspections/product/:productId`.
- API quan tri cho admin/manager: tao va cap nhat phieu; chi admin duoc xoa.
- Thao tac thay doi phieu kiem nghiem duoc ghi audit log.
- Trang web `/quality-inspections` cung cap dashboard, bo loc va form tao phieu.
- Ket qua kiem nghiem duoc hien thi tren trang truy xuat cong khai khi quet QR.

## 19) Chuc nang uu tien tren Flutter app

- Dashboard chi tai cac lo cua farmer dang dang nhap; admin/manager van xem duoc toan bo.
- Farmer duoc chinh sua thong tin va trang thai lo do minh so huu.
- Them trung tam ho so gom ba tab: kiem nghiem, vung trong va chung nhan.
- Farmer co the tao/cap nhat vung trong cua minh; API chan sua vung cua nguoi khac.
- Admin/manager co the tao phieu kiem nghiem va chung nhan ngay tren app.
- Ket qua kiem nghiem tren app duoc loc theo cac lo thuoc farmer.
- Su kien blockchain `failed` hoac `skipped` co nut retry trong man hinh timeline.
- Them cac shortcut quan ly ho so va nut sua lo tren farmer dashboard.

## 20) Quan ly chuoi cung ung

- Quan ly 7 nhom to chuc: nha cung cap, hop tac xa, che bien, kho, van chuyen, phan phoi va ban le.
- Ho so van hanh ho tro: ban giao, tach lo, gop lo, che bien, nhap kho, xuat kho, van chuyen va thu hoi.
- Tach lo quy uoc lo chinh la lo nguon, `related_products` la cac lo dau ra.
- Gop lo quy uoc lo chinh la lo dau ra, `related_products` la cac lo dau vao.
- Van chuyen ho tro phuong tien, tai xe, dia diem, nhiet do va do am.
- Thu hoi bat buoc co ly do va co trang thai de theo doi tien do.
- Farmer chi duoc tao/sua ho so tren cac lo thuoc quyen quan ly, ke ca lo lien quan khi tach/gop.
- Tat ca thay doi to chuc va ho so van hanh duoc ghi audit log.
- Web co trang `/supply-chain` de quan ly to chuc va toan bo nghiep vu.
- Hanh trinh chuoi cung ung duoc hien thi cong khai trong trang truy xuat QR.
