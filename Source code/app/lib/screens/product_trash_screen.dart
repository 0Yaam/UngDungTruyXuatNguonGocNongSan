import 'package:app/core/theme.dart';
import 'package:app/models/product.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductTrashScreen extends ConsumerStatefulWidget {
  const ProductTrashScreen({super.key});

  @override
  ConsumerState<ProductTrashScreen> createState() => _ProductTrashScreenState();
}

class _ProductTrashScreenState extends ConsumerState<ProductTrashScreen> {
  bool _loading = true;
  String? _error;
  List<Product> _products = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      setState(() {
        _loading = true;
        _error = null;
      });
      final products = await ref.read(batchServiceProvider).getTrashProducts();
      if (mounted) setState(() => _products = products);
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _restore(Product product) async {
    try {
      await ref.read(batchServiceProvider).restoreProduct(product.id);
      ref.invalidate(batchListProvider);
      if (!mounted) return;
      setState(() {
        _products = _products.where((item) => item.id != product.id).toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã khôi phục "${product.name}".')),
      );
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    }
  }

  Future<void> _permanentDelete(Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa vĩnh viễn?'),
        content: Text(
          'Chỉ lô chưa có nhật ký, tồn kho, kiểm nghiệm hoặc dữ liệu chuỗi cung ứng mới được xóa thật. Bạn muốn xóa "${product.name}"?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(batchServiceProvider).permanentDeleteProduct(product.id);
      if (!mounted) return;
      setState(() {
        _products = _products.where((item) => item.id != product.id).toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã xóa vĩnh viễn "${product.name}".')),
      );
    } catch (error) {
      if (mounted) setState(() => _error = _friendlyError(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final role = (auth?['user']?['role'] ?? auth?['role'] ?? '').toString();
    final canPermanentDelete = role == 'admin';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thùng rác lô nông sản'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: GlassPageBackground(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
                  children: [
                    GlassPanel(
                      child: Row(
                        children: [
                          const GlassIconCapsule(
                            icon: Icons.delete_outline_rounded,
                            color: AppColors.danger,
                            size: 56,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Lô đã lưu trữ',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${_products.length} lô trong thùng rác. Có thể khôi phục hoặc xóa vĩnh viễn nếu chưa có lịch sử liên quan.',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      GlassPanel(
                        colors: [
                          const Color(0xFFFFF1F2).withValues(alpha: 0.82),
                          Colors.white.withValues(alpha: 0.46),
                        ],
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              color: AppColors.danger,
                            ),
                            const SizedBox(width: 10),
                            Expanded(child: Text(_error!)),
                            IconButton(
                              onPressed: () => setState(() => _error = null),
                              icon: const Icon(Icons.close_rounded),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    if (_products.isEmpty)
                      const GlassPanel(child: Text('Thùng rác đang trống.'))
                    else
                      ..._products.map(
                        (product) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _TrashProductCard(
                            product: product,
                            canPermanentDelete: canPermanentDelete,
                            onRestore: () => _restore(product),
                            onPermanentDelete: () => _permanentDelete(product),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _TrashProductCard extends StatelessWidget {
  const _TrashProductCard({
    required this.product,
    required this.canPermanentDelete,
    required this.onRestore,
    required this.onPermanentDelete,
  });

  final Product product;
  final bool canPermanentDelete;
  final VoidCallback onRestore;
  final VoidCallback onPermanentDelete;

  @override
  Widget build(BuildContext context) {
    final deletedBy = product.deletedBy;
    final deletedByName = deletedBy == null
        ? ''
        : '${deletedBy['first_name'] ?? ''} ${deletedBy['last_name'] ?? ''}'
              .trim();

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const GlassIconCapsule(
                icon: Icons.inventory_2_outlined,
                color: AppColors.ink,
                size: 52,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text('${product.category} • ${product.origin}'),
                    const SizedBox(height: 4),
                    Text(
                      'Lưu trữ: ${_date(product.deletedAt)}${deletedByName.isEmpty ? '' : ' bởi $deletedByName'}',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: onRestore,
                  icon: const Icon(Icons.restore_rounded),
                  label: const Text('Khôi phục'),
                ),
              ),
              if (canPermanentDelete) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onPermanentDelete,
                    icon: const Icon(Icons.delete_forever_outlined),
                    label: const Text('Xóa hẳn'),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

String _friendlyError(Object error) {
  final message = error.toString();
  if (message.startsWith('Exception: ')) {
    return message.substring('Exception: '.length);
  }
  if (message.startsWith('DioException')) {
    return 'Không thể xử lý yêu cầu. Vui lòng kiểm tra lại dữ liệu.';
  }
  return message;
}

String _date(DateTime? date) {
  if (date == null) return 'Chưa rõ';
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}
