import 'package:flutter/material.dart';

class AppColors {
  static const forest = Color(0xFF123222);
  static const pine = Color(0xFF2E9150);
  static const leaf = Color(0xFF87C96B);
  static const moss = Color(0xFFE4F4DF);
  static const wheat = Color(0xFFF5E8C6);
  static const canvas = Color(0xFFF6F8F2);
  static const ink = Color(0xFF1A2D22);
  static const muted = Color(0xFF677A6D);
  static const danger = Color(0xFFD24D4D);
  static const glassFill = Color(0xC0FFFFFF);
  static const glassLine = Color(0xD6F3F6ED);
}

final appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.pine,
    primary: AppColors.pine,
    secondary: AppColors.leaf,
    tertiary: AppColors.wheat,
    surface: Colors.white,
    error: AppColors.danger,
    brightness: Brightness.light,
  ),
  scaffoldBackgroundColor: AppColors.canvas,
  canvasColor: AppColors.canvas,
  dividerColor: Colors.white.withValues(alpha: 0.6),
  splashColor: Colors.white.withValues(alpha: 0.08),
  textTheme: const TextTheme(
    displaySmall: TextStyle(
      fontSize: 36,
      fontWeight: FontWeight.w800,
      letterSpacing: -1.35,
      color: AppColors.ink,
      height: 1,
    ),
    headlineMedium: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w800,
      letterSpacing: -1,
      color: AppColors.ink,
    ),
    headlineSmall: TextStyle(
      fontSize: 23,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.5,
      color: AppColors.ink,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: AppColors.ink,
    ),
    titleMedium: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w700,
      color: AppColors.ink,
    ),
    bodyLarge: TextStyle(fontSize: 16, height: 1.56, color: AppColors.ink),
    bodyMedium: TextStyle(fontSize: 14, height: 1.56, color: AppColors.muted),
    labelLarge: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      color: Colors.white,
    ),
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.transparent,
    foregroundColor: AppColors.ink,
    centerTitle: false,
    elevation: 0,
    scrolledUnderElevation: 0,
    titleTextStyle: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w800,
      color: AppColors.ink,
    ),
  ),
  cardTheme: CardThemeData(
    color: AppColors.glassFill,
    elevation: 0,
    surfaceTintColor: Colors.transparent,
    shadowColor: const Color(0x2412291C),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(30),
      side: BorderSide(color: AppColors.glassLine),
    ),
    margin: EdgeInsets.zero,
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white.withValues(alpha: 0.5),
    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
    labelStyle: const TextStyle(color: AppColors.muted),
    hintStyle: TextStyle(color: AppColors.muted.withValues(alpha: 0.9)),
    prefixIconColor: AppColors.pine,
    suffixIconColor: AppColors.muted,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide(color: AppColors.glassLine),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide(color: AppColors.glassLine),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: const BorderSide(color: AppColors.pine, width: 1.4),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: const BorderSide(color: AppColors.danger),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: const BorderSide(color: AppColors.danger, width: 1.4),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.forest,
      foregroundColor: Colors.white,
      minimumSize: const Size.fromHeight(56),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      elevation: 0,
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      elevation: 0,
      backgroundColor: Colors.white.withValues(alpha: 0.38),
      foregroundColor: AppColors.ink,
      minimumSize: const Size.fromHeight(56),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(54),
      foregroundColor: AppColors.ink,
      backgroundColor: Colors.white.withValues(alpha: 0.26),
      side: BorderSide(color: AppColors.glassLine),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
    ),
  ),
  chipTheme: ChipThemeData(
    labelStyle: const TextStyle(
      color: AppColors.ink,
      fontWeight: FontWeight.w700,
    ),
    side: BorderSide.none,
    color: WidgetStatePropertyAll(Colors.white.withValues(alpha: 0.34)),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
  ),
);
