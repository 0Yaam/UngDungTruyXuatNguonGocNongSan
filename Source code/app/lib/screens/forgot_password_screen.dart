import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _loading = false;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
      _success = false;
    });

    try {
      final authService = ref.read(authServiceProvider);
      await authService.forgotPassword(_emailCtrl.text.trim());

      if (!mounted) return;
      setState(() {
        _success = true;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: GlassPageBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GlassPanel(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 8,
                  ),
                  radius: 22,
                  child: IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back_rounded),
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 22),
                GlassPanel(
                  padding: const EdgeInsets.all(24),
                  colors: [
                    Colors.white.withValues(alpha: 0.56),
                    const Color(0xB8E1E9FF),
                  ],
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Quên mật khẩu',
                        style: textTheme.displaySmall?.copyWith(fontSize: 30),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                GlassPanel(
                  padding: const EdgeInsets.all(22),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const GlassIconCapsule(
                              icon: Icons.lock_reset_rounded,
                              size: 54,
                              color: AppColors.pine,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Đặt lại mật khẩu',
                                    style: textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Chúng tôi sẽ gửi email hướng dẫn đặt lại mật khẩu.',
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 18),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0x2AD65C74),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: const Color(0x55D65C74),
                              ),
                            ),
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: AppColors.danger,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                        if (_success) ...[
                          const SizedBox(height: 18),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0x2A4A7DFF),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: const Color(0x554A7DFF),
                              ),
                            ),
                            child: const Text(
                              'Vui lòng kiểm tra email để đặt lại mật khẩu',
                              style: TextStyle(
                                color: AppColors.pine,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                        TextFormField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            hintText: 'nongdan@agritrace.vn',
                            prefixIcon: Icon(Icons.mail_outline_rounded),
                          ),
                          validator: (value) {
                            if (value == null || !value.contains('@')) {
                              return 'Nhập email hợp lệ';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 22),
                        FilledButton(
                          onPressed: _loading || _success ? null : _submit,
                          child: _loading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Gửi yêu cầu'),
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: GestureDetector(
                            onTap: () {
                              Navigator.pushReplacementNamed(
                                context,
                                AppRouter.login,
                              );
                            },
                            child: RichText(
                              text: TextSpan(
                                style: textTheme.bodyMedium,
                                children: const [
                                  TextSpan(text: 'Quay lại '),
                                  TextSpan(
                                    text: 'Đăng nhập',
                                    style: TextStyle(
                                      color: AppColors.pine,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
