import 'package:app/core/api_client.dart';
import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authData = ref.watch(authStateProvider);
    final user = authData?['user'] is Map<String, dynamic>
        ? authData!['user'] as Map<String, dynamic>
        : authData ?? const <String, dynamic>{};
    final firstName = (user['first_name'] ?? '').toString();
    final lastName = (user['last_name'] ?? '').toString();
    final displayName = (user['name'] ?? '$firstName $lastName').toString().trim();
    final email = (user['email'] ?? 'farmer@gmail.com').toString();
    final role = (user['role'] ?? authData?['role'] ?? '')
        .toString()
        .toLowerCase();
    final canUseDiseaseDetection = const {
      'admin',
      'manager',
      'farmer',
    }.contains(role);
    final phone = (user['phone'] ?? 'Chưa cập nhật').toString();
    final location = (user['address'] ?? 'Cái Bè, Tiền Giang').toString();

    return GlassPageBackground(
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 118),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Tài khoản',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: AppColors.forest,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                IconButton(
                  tooltip: 'Thông báo',
                  onPressed: () => Navigator.pushNamed(context, AppRouter.notifications),
                  icon: const Icon(Icons.notifications_none_rounded),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF063D21), Color(0xFF0A6A36)],
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.forest.withValues(alpha: 0.24),
                    blurRadius: 30,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      shape: BoxShape.circle,
                    ),
                    child: const CircleAvatar(
                      backgroundColor: Color(0xFFE4F4DF),
                      child: Icon(Icons.person_rounded, color: AppColors.pine, size: 40),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName.isEmpty ? 'Nguyễn Văn An' : displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _ProfileChip(icon: Icons.badge_outlined, label: _roleLabel(role)),
                            _ProfileChip(icon: Icons.location_on_outlined, label: location),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: const [
                Expanded(
                  child: _AccountStat(value: '12', label: 'Lô theo dõi'),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _AccountStat(value: '8', label: 'Nhật ký mới'),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _AccountStat(value: '2', label: 'Cảnh báo'),
                ),
              ],
            ),
            const SizedBox(height: 18),
            GlassPanel(
              radius: 24,
              padding: const EdgeInsets.symmetric(vertical: 8),
              colors: [
                Colors.white.withValues(alpha: 0.96),
                Colors.white.withValues(alpha: 0.82),
              ],
              child: Column(
                children: [
                  _AccountRow(icon: Icons.mail_outline_rounded, label: 'Email', value: email),
                  _AccountRow(icon: Icons.phone_outlined, label: 'Số điện thoại', value: phone),
                  _AccountRow(
                    icon: Icons.verified_user_outlined,
                    label: 'Vai trò',
                    value: _roleLabel(role),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            GlassPanel(
              radius: 24,
              padding: const EdgeInsets.symmetric(vertical: 8),
              colors: [
                Colors.white.withValues(alpha: 0.96),
                Colors.white.withValues(alpha: 0.82),
              ],
              child: Column(
                children: [
                  _AccountAction(
                    icon: Icons.inventory_2_outlined,
                    label: 'Lô nông sản của tôi',
                    onTap: () => Navigator.pushReplacementNamed(context, AppRouter.farmer),
                  ),
                  _AccountAction(
                    icon: Icons.workspace_premium_outlined,
                    label: 'Chứng nhận & kiểm nghiệm',
                    onTap: () => Navigator.pushNamed(context, '${AppRouter.management}?tab=2'),
                  ),
                  if (canUseDiseaseDetection)
                    _AccountAction(
                      icon: Icons.health_and_safety_outlined,
                      label: 'Nhận diện bệnh cây',
                      onTap: () => Navigator.pushNamed(
                        context,
                        AppRouter.diseaseDetection,
                      ),
                    ),
                  _AccountAction(
                    icon: Icons.delete_outline_rounded,
                    label: 'Thùng rác lô',
                    onTap: () => Navigator.pushNamed(context, AppRouter.productTrash),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              ),
              onPressed: () {
                ref.read(authStateProvider.notifier).state = null;
                ApiClient.instance.setToken(null);
                Navigator.pushNamedAndRemoveUntil(context, AppRouter.home, (_) => false);
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Đăng xuất'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileChip extends StatelessWidget {
  const _ProfileChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 15),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _AccountStat extends StatelessWidget {
  const _AccountStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      radius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      colors: [
        Colors.white.withValues(alpha: 0.94),
        Colors.white.withValues(alpha: 0.76),
      ],
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: AppColors.pine,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountRow extends StatelessWidget {
  const _AccountRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.pine),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(value),
    );
  }
}

class _AccountAction extends StatelessWidget {
  const _AccountAction({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: AppColors.pine),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      trailing: const Icon(Icons.chevron_right_rounded),
    );
  }
}

String _roleLabel(String role) {
  switch (role) {
    case 'admin':
      return 'Quản trị';
    case 'manager':
      return 'Quản lý';
    case 'farmer':
      return 'Nông dân';
    case 'consumer':
      return 'Người dùng';
    default:
      return 'Nông dân';
  }
}
