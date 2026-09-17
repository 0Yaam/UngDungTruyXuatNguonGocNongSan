import 'dart:ui';

import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppTabScaffold extends StatelessWidget {
  const AppTabScaffold({
    super.key,
    required this.child,
    required this.selectedTab,
  });

  final Widget child;
  final AppTab selectedTab;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: AppBottomTabBar(selectedTab: selectedTab),
    );
  }
}

enum AppTab { journal, scanner, quality, farmingArea, disease, trash, account }

class AppBottomTabBar extends ConsumerWidget {
  const AppBottomTabBar({super.key, required this.selectedTab});

  final AppTab selectedTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tabs = [
      _AppTabItemData(
        tab: AppTab.journal,
        icon: Icons.home_outlined,
        label: 'Trang chủ',
        color: const Color(0xFF2F8F4D),
        route: AppRouter.farmer,
      ),
      _AppTabItemData(
        tab: AppTab.scanner,
        icon: Icons.inventory_2_outlined,
        label: 'Lô của tôi',
        color: const Color(0xFF2F8F4D),
        route: AppRouter.farmer,
      ),
      _AppTabItemData(
        tab: AppTab.quality,
        icon: Icons.description_outlined,
        label: 'Nhật ký',
        color: const Color(0xFF2F8F4D),
        route: AppRouter.addEvent,
      ),
      _AppTabItemData(
        tab: AppTab.farmingArea,
        icon: Icons.notifications_none_rounded,
        label: 'Thông báo',
        color: const Color(0xFF2F8F4D),
        route: AppRouter.notifications,
        badge: 3,
      ),
      _AppTabItemData(
        tab: AppTab.account,
        icon: Icons.person_outline_rounded,
        label: 'Tài khoản',
        color: const Color(0xFF2F8F4D),
        route: AppRouter.account,
      ),
    ];

    return SafeArea(
      top: false,
      child: DecoratedBox(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: AppColors.forest.withValues(alpha: 0.14),
              blurRadius: 24,
              offset: const Offset(0, -8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(10, 5, 10, 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.92),
                border: Border(
                  top: BorderSide(color: Colors.white.withValues(alpha: 0.84)),
                ),
              ),
              child: Row(
                children: [
                  for (final tab in tabs)
                    Expanded(
                      child: _AppBottomTabItem(
                        item: tab,
                        selected: tab.tab == selectedTab,
                        onTap: () => _openTab(context, tab),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _openTab(BuildContext context, _AppTabItemData item) {
    if (item.tab == selectedTab) return;
    Navigator.pushReplacementNamed(context, item.route);
  }
}

class _AppTabItemData {
  const _AppTabItemData({
    required this.tab,
    required this.icon,
    required this.label,
    required this.color,
    required this.route,
    this.badge = 0,
  });

  final AppTab tab;
  final IconData icon;
  final String label;
  final Color color;
  final String route;
  final int badge;
}

class _AppBottomTabItem extends StatelessWidget {
  const _AppBottomTabItem({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _AppTabItemData item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? item.color : AppColors.muted;
    final labelWeight = selected ? FontWeight.w900 : FontWeight.w700;

    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      child: Tooltip(
        message: item.label,
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: onTap,
            child: SizedBox(
              height: 68,
              child: Column(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOut,
                    width: selected ? 44 : 0,
                    height: 3,
                    decoration: BoxDecoration(
                      color: selected ? item.color : Colors.transparent,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  const SizedBox(height: 7),
                  SizedBox(
                    width: 38,
                    height: 30,
                    child: Stack(
                      clipBehavior: Clip.none,
                      alignment: Alignment.center,
                      children: [
                        Icon(item.icon, color: foreground, size: 25),
                        if (item.badge > 0)
                          Positioned(
                            right: -4,
                            top: -5,
                            child: Container(
                              width: 19,
                              height: 19,
                              alignment: Alignment.center,
                              decoration: const BoxDecoration(
                                color: Color(0xFFFF4B4B),
                                shape: BoxShape.circle,
                              ),
                              child: Text(
                                item.badge > 9 ? '9+' : '${item.badge}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                  height: 1,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 3),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        item.label,
                        maxLines: 1,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: foreground,
                          fontSize: 10,
                          fontWeight: labelWeight,
                          height: 1.0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
