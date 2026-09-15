import 'package:app/screens/account_screen.dart';
import 'package:app/screens/camera_management_screen.dart';
import 'package:app/screens/add_event_screen.dart';
import 'package:app/screens/create_product_screen.dart';
import 'package:app/screens/farmer/farmer_dashboard_screen.dart';
import 'package:app/screens/forgot_password_screen.dart';
import 'package:app/screens/edit_product_screen.dart';
import 'package:app/screens/disease_detection_screen.dart';
import 'package:app/screens/management_hub_screen.dart';
import 'package:app/screens/product_trash_screen.dart';
import 'package:app/models/batch.dart';
import 'package:app/screens/login_screen.dart';
import 'package:app/screens/notifications_screen.dart';
import 'package:app/screens/qr_scanner_screen.dart';
import 'package:app/screens/register_screen.dart';
<<<<<<< HEAD
import 'package:app/screens/timeline_dashboard_screen.dart';
import 'package:app/screens/welcome_screen.dart';
import 'package:app/widgets/app_tab_scaffold.dart';
=======
import 'package:app/screens/trace_timeline_screen.dart';
import 'package:app/screens/timeline_screen.dart';
>>>>>>> dan/main
import 'package:flutter/material.dart';

class AppRouter {
  static const home = '/';
  static const timeline = '/timeline';
  static const trace = '/trace';
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const farmer = '/farmer';
  static const scanner = '/scanner';
  static const addEvent = '/add-event';
  static const createProduct = '/create-product';
  static const notifications = '/notifications';
  static const account = '/account';
  static const cameras = '/cameras';
  static const management = '/management';
  static const editProduct = '/edit-product';
  static const diseaseDetection = '/disease-detection';
  static const productTrash = '/product-trash';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    final uri = Uri.parse(settings.name ?? '/');

    switch (uri.path) {
      case home:
        return _page(const WelcomeScreen());

      case timeline:
<<<<<<< HEAD
      case trace:
=======
>>>>>>> dan/main
        final batchId =
            uri.queryParameters['batchId'] ??
            uri.queryParameters['productId'] ??
            (settings.arguments as String?);
        return _tabPage(
          TimelineDashboardScreen(initialBatchId: batchId),
          AppTab.journal,
        );

      case trace:
        final productId =
            uri.queryParameters['productId'] ??
            uri.queryParameters['batchId'] ??
            (settings.arguments as String?);
        return _page(TraceTimelineScreen(productId: productId ?? ''));

      case login:
        return _page(const LoginScreen());

      case register:
        return _page(const RegisterScreen());

      case forgotPassword:
        return _page(const ForgotPasswordScreen());

      case farmer:
        return _tabPage(const FarmerDashboardScreen(), AppTab.journal);

      case scanner:
        return _tabPage(const QrScannerScreen(), AppTab.scanner);

      case addEvent:
        final batchId =
            uri.queryParameters['batchId'] ??
            uri.queryParameters['productId'] ??
            (settings.arguments as String?);
        return _tabPage(
          AddEventScreen(initialBatchId: batchId),
          AppTab.journal,
        );

      case createProduct:
        return _tabPage(const CreateProductScreen(), AppTab.journal);

      case notifications:
        return _tabPage(const NotificationsScreen(), AppTab.farmingArea);

      case account:
        return _tabPage(const AccountScreen(), AppTab.account);

      case cameras:
        final batchId =
            uri.queryParameters['batchId'] ??
            uri.queryParameters['productId'] ??
            (settings.arguments as String?);
        if (batchId == null || batchId.isEmpty) {
          return _tabPage(const FarmerDashboardScreen(), AppTab.journal);
        }
        return _tabPage(CameraManagementScreen(batchId: batchId), AppTab.journal);

      case management:
        final tab = int.tryParse(uri.queryParameters['tab'] ?? '') ?? 0;
        return _tabPage(
          ManagementHubScreen(initialTab: tab),
          tab == 1 ? AppTab.farmingArea : AppTab.quality,
        );

      case editProduct:
        final batch = settings.arguments as Batch?;
        if (batch == null) {
          return _tabPage(const FarmerDashboardScreen(), AppTab.journal);
        }
        return _tabPage(EditProductScreen(batch: batch), AppTab.journal);

      case diseaseDetection:
        return _tabPage(const DiseaseDetectionScreen(), AppTab.disease);

      case productTrash:
        return _tabPage(const ProductTrashScreen(), AppTab.trash);

      default:
        return _page(const WelcomeScreen());
    }
  }

  static MaterialPageRoute _page(Widget child) {
    return MaterialPageRoute(builder: (_) => child);
  }

  static MaterialPageRoute _tabPage(Widget child, AppTab selectedTab) {
    return _page(AppTabScaffold(selectedTab: selectedTab, child: child));
  }
}
