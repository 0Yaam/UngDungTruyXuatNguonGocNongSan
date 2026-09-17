import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ManagementHubScreen extends ConsumerStatefulWidget {
  const ManagementHubScreen({super.key, this.initialTab = 0});
  final int initialTab;

  @override
  ConsumerState<ManagementHubScreen> createState() =>
      _ManagementHubScreenState();
}

class _ManagementHubScreenState extends ConsumerState<ManagementHubScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _quality = [];
  List<Map<String, dynamic>> _areas = [];
  List<Map<String, dynamic>> _certifications = [];

  String get _role {
    final auth = ref.read(authStateProvider);
    return (auth?['user']?['role'] ?? auth?['role'] ?? 'farmer').toString();
  }

  @override
  void initState() {
    super.initState();
    final initialIndex = widget.initialTab < 0
        ? 0
        : widget.initialTab > 2
        ? 2
        : widget.initialTab;
    _tabs = TabController(length: 3, vsync: this, initialIndex: initialIndex);
    _tabs.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      setState(() {
        _loading = true;
        _error = null;
      });
      final service = ref.read(managementServiceProvider);
      final results = await Future.wait([
        service.getQualityInspections(),
        service.getFarmingAreas(),
        service.getCertifications(),
      ]);
      if (!mounted) return;
      setState(() {
        _quality = results[0];
        _areas = results[1];
        _certifications = results[2];
      });
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _canCreate =>
      _tabs.index == 1 || _role == 'admin' || _role == 'manager';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ sơ chất lượng'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(icon: Icon(Icons.science_outlined), text: 'Kiểm nghiệm'),
            Tab(icon: Icon(Icons.landscape_outlined), text: 'Vùng trồng'),
            Tab(
              icon: Icon(Icons.workspace_premium_outlined),
              text: 'Chứng nhận',
            ),
          ],
        ),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      floatingActionButton: _canCreate
          ? FloatingActionButton.extended(
              onPressed: _openCreate,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Thêm mới'),
            )
          : null,
      body: GlassPageBackground(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? _ErrorView(message: _error!, onRetry: _load)
            : TabBarView(
                controller: _tabs,
                children: [
                  _QualityList(items: _quality),
                  _AreaList(items: _areas, onEdit: _openAreaForm),
                  _CertificationList(items: _certifications),
                ],
              ),
      ),
    );
  }

  void _openCreate() {
    switch (_tabs.index) {
      case 0:
        _openQualityForm();
        break;
      case 1:
        _openAreaForm();
        break;
      case 2:
        _openCertificationForm();
        break;
    }
  }

  Future<void> _openQualityForm() async {
    final batches = await ref.read(batchServiceProvider).getBatches();
    if (!mounted) return;
    if (batches.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cần có ít nhất một lô nông sản.')),
      );
      return;
    }
    String productId = batches.first.batchId;
    String type = 'GENERAL';
    String result = 'pending';
    final report = TextEditingController();
    final lab = TextEditingController();
    final summary = TextEditingController();
    final sampleDate = TextEditingController(
      text: DateTime.now().toIso8601String().split('T').first,
    );
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => _FormSheet(
          title: 'Phiếu kiểm nghiệm mới',
          children: [
            DropdownButtonFormField<String>(
              value: productId,
              decoration: const InputDecoration(labelText: 'Lô nông sản'),
              items: batches
                  .map(
                    (batch) => DropdownMenuItem(
                      value: batch.batchId,
                      child: Text(batch.productName),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setModalState(() => productId = value!),
            ),
            TextField(
              controller: report,
              decoration: const InputDecoration(labelText: 'Số phiếu *'),
            ),
            TextField(
              controller: lab,
              decoration: const InputDecoration(
                labelText: 'Đơn vị kiểm nghiệm *',
              ),
            ),
            DropdownButtonFormField<String>(
              value: type,
              decoration: const InputDecoration(labelText: 'Loại kiểm nghiệm'),
              items: const [
                DropdownMenuItem(value: 'GENERAL', child: Text('Tổng hợp')),
                DropdownMenuItem(
                  value: 'PESTICIDE_RESIDUE',
                  child: Text('Dư lượng thuốc BVTV'),
                ),
                DropdownMenuItem(
                  value: 'MICROBIOLOGY',
                  child: Text('Vi sinh vật'),
                ),
                DropdownMenuItem(
                  value: 'HEAVY_METAL',
                  child: Text('Kim loại nặng'),
                ),
                DropdownMenuItem(value: 'NUTRITION', child: Text('Dinh dưỡng')),
              ],
              onChanged: (value) => setModalState(() => type = value!),
            ),
            DropdownButtonFormField<String>(
              value: result,
              decoration: const InputDecoration(labelText: 'Kết luận'),
              items: const [
                DropdownMenuItem(value: 'pending', child: Text('Chờ kết quả')),
                DropdownMenuItem(value: 'passed', child: Text('Đạt yêu cầu')),
                DropdownMenuItem(value: 'failed', child: Text('Không đạt')),
              ],
              onChanged: (value) => setModalState(() => result = value!),
            ),
            TextField(
              controller: sampleDate,
              readOnly: true,
              decoration: const InputDecoration(
                labelText: 'Ngày lấy mẫu',
                suffixIcon: Icon(Icons.calendar_today_outlined),
              ),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2100),
                  initialDate: DateTime.now(),
                );
                if (date != null)
                  sampleDate.text = date.toIso8601String().split('T').first;
              },
            ),
            TextField(
              controller: summary,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Tóm tắt kết quả'),
            ),
          ],
          onSave: () async {
            if (report.text.trim().isEmpty || lab.text.trim().isEmpty) return;
            await ref.read(managementServiceProvider).createQualityInspection({
              'product': productId,
              'report_number': report.text.trim(),
              'laboratory': lab.text.trim(),
              'inspection_type': type,
              'result': result,
              'sample_date': sampleDate.text,
              'summary': summary.text.trim(),
            });
            if (context.mounted) Navigator.pop(context, true);
          },
        ),
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _openAreaForm([Map<String, dynamic>? area]) async {
    final name = TextEditingController(text: area?['name']?.toString() ?? '');
    final address = TextEditingController(
      text: area?['address']?.toString() ?? '',
    );
    final size = TextEditingController(
      text: area?['area_size']?.toString() ?? '',
    );
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _FormSheet(
        title: area == null ? 'Thêm vùng trồng' : 'Cập nhật vùng trồng',
        children: [
          TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Tên vùng *'),
          ),
          TextField(
            controller: address,
            decoration: const InputDecoration(labelText: 'Địa chỉ *'),
          ),
          TextField(
            controller: size,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Diện tích (ha)'),
          ),
        ],
        onSave: () async {
          if (name.text.trim().isEmpty || address.text.trim().isEmpty) return;
          final data = {
            'name': name.text.trim(),
            'address': address.text.trim(),
            if (double.tryParse(size.text) != null)
              'area_size': double.parse(size.text),
          };
          if (area == null) {
            await ref.read(managementServiceProvider).createFarmingArea(data);
          } else {
            await ref
                .read(managementServiceProvider)
                .updateFarmingArea(area['_id'].toString(), data);
          }
          if (context.mounted) Navigator.pop(context, true);
        },
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _openCertificationForm() async {
    final name = TextEditingController();
    final authority = TextEditingController();
    final number = TextEditingController();
    final issueDate = TextEditingController(
      text: DateTime.now().toIso8601String().split('T').first,
    );
    final expiryDate = TextEditingController(
      text: DateTime.now()
          .add(const Duration(days: 365))
          .toIso8601String()
          .split('T')
          .first,
    );
    String type = 'VietGAP';
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => _FormSheet(
          title: 'Thêm chứng nhận',
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Tên chứng nhận *'),
            ),
            DropdownButtonFormField<String>(
              value: type,
              decoration: const InputDecoration(labelText: 'Loại'),
              items:
                  [
                        'VietGAP',
                        'GlobalGAP',
                        'Organic',
                        'HACCP',
                        'ISO22000',
                        'Other',
                      ]
                      .map(
                        (value) =>
                            DropdownMenuItem(value: value, child: Text(value)),
                      )
                      .toList(),
              onChanged: (value) => setModalState(() => type = value!),
            ),
            TextField(
              controller: authority,
              decoration: const InputDecoration(labelText: 'Tổ chức cấp *'),
            ),
            TextField(
              controller: number,
              decoration: const InputDecoration(labelText: 'Số chứng nhận *'),
            ),
            TextField(
              controller: issueDate,
              decoration: const InputDecoration(
                labelText: 'Ngày cấp (YYYY-MM-DD)',
              ),
            ),
            TextField(
              controller: expiryDate,
              decoration: const InputDecoration(
                labelText: 'Ngày hết hạn (YYYY-MM-DD)',
              ),
            ),
          ],
          onSave: () async {
            if (name.text.trim().isEmpty ||
                authority.text.trim().isEmpty ||
                number.text.trim().isEmpty)
              return;
            await ref.read(managementServiceProvider).createCertification({
              'name': name.text.trim(),
              'type': type,
              'issuing_authority': authority.text.trim(),
              'certificate_number': number.text.trim(),
              'issue_date': issueDate.text,
              'expiry_date': expiryDate.text,
            });
            if (context.mounted) Navigator.pop(context, true);
          },
        ),
      ),
    );
    if (saved == true) _load();
  }
}

class _QualityList extends StatelessWidget {
  const _QualityList({required this.items});
  final List<Map<String, dynamic>> items;
  @override
  Widget build(BuildContext context) => _ListShell(
    title: 'Kết quả kiểm nghiệm',
    count: items.length,
    children: items
        .map(
          (item) => _RecordCard(
            icon: Icons.science_outlined,
            title: (item['report_number'] ?? 'Phiếu kiểm nghiệm').toString(),
            subtitle:
                '${item['laboratory'] ?? ''}\n${_productName(item['product'])}',
            status: (item['result'] ?? 'pending').toString(),
          ),
        )
        .toList(),
  );
}

class _AreaList extends StatelessWidget {
  const _AreaList({required this.items, required this.onEdit});
  final List<Map<String, dynamic>> items;
  final ValueChanged<Map<String, dynamic>> onEdit;
  @override
  Widget build(BuildContext context) => _ListShell(
    title: 'Vùng trồng của tôi',
    count: items.length,
    children: items
        .map(
          (item) => _RecordCard(
            icon: Icons.landscape_outlined,
            title: (item['name'] ?? 'Vùng trồng').toString(),
            subtitle: '${item['address'] ?? ''}\n${item['area_size'] ?? 0} ha',
            trailing: IconButton(
              onPressed: () => onEdit(item),
              icon: const Icon(Icons.edit_outlined),
            ),
          ),
        )
        .toList(),
  );
}

class _CertificationList extends StatelessWidget {
  const _CertificationList({required this.items});
  final List<Map<String, dynamic>> items;
  @override
  Widget build(BuildContext context) => _ListShell(
    title: 'Chứng nhận',
    count: items.length,
    children: items
        .map(
          (item) => _RecordCard(
            icon: Icons.workspace_premium_outlined,
            title: (item['name'] ?? item['type'] ?? 'Chứng nhận').toString(),
            subtitle:
                '${item['issuing_authority'] ?? ''}\nSố: ${item['certificate_number'] ?? ''}',
            status: (item['status'] ?? 'valid').toString(),
          ),
        )
        .toList(),
  );
}

class _ListShell extends StatelessWidget {
  const _ListShell({
    required this.title,
    required this.count,
    required this.children,
  });
  final String title;
  final int count;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async {},
    child: ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text('$count hồ sơ', style: const TextStyle(color: AppColors.muted)),
        const SizedBox(height: 16),
        if (children.isEmpty)
          const GlassPanel(child: Text('Chưa có dữ liệu.'))
        else
          ...children.map(
            (child) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: child,
            ),
          ),
      ],
    ),
  );
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.status,
    this.trailing,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final String? status;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => GlassPanel(
    child: Row(
      children: [
        GlassIconCapsule(icon: icon, color: AppColors.pine),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 4),
              Text(subtitle),
            ],
          ),
        ),
        if (status != null) Chip(label: Text(_statusLabel(status!))),
        if (trailing != null) trailing!,
      ],
    ),
  );
}

class _FormSheet extends StatefulWidget {
  const _FormSheet({
    required this.title,
    required this.children,
    required this.onSave,
  });
  final String title;
  final List<Widget> children;
  final Future<void> Function() onSave;
  @override
  State<_FormSheet> createState() => _FormSheetState();
}

class _FormSheetState extends State<_FormSheet> {
  bool saving = false;
  String? error;
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      20,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 20,
    ),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 18),
          ...widget.children.expand(
            (child) => [child, const SizedBox(height: 12)],
          ),
          if (error != null)
            Text(error!, style: const TextStyle(color: AppColors.danger)),
          FilledButton(
            onPressed: saving
                ? null
                : () async {
                    try {
                      setState(() => saving = true);
                      await widget.onSave();
                    } catch (e) {
                      if (mounted) setState(() => error = e.toString());
                    } finally {
                      if (mounted) setState(() => saving = false);
                    }
                  },
            child: Text(saving ? 'Đang lưu...' : 'Lưu thông tin'),
          ),
        ],
      ),
    ),
  );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger, size: 42),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 14),
          FilledButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    ),
  );
}

String _productName(dynamic product) => product is Map<String, dynamic>
    ? (product['name'] ?? 'Lô nông sản').toString()
    : 'Lô nông sản';
String _statusLabel(String value) => switch (value) {
  'passed' => 'ĐẠT',
  'failed' => 'KHÔNG ĐẠT',
  'pending' => 'CHỜ KẾT QUẢ',
  'valid' => 'HIỆU LỰC',
  'expired' => 'HẾT HẠN',
  _ => value.toUpperCase(),
};
