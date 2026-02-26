import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../data/services/supabase_service.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _isLogin = true;

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    try {
      final supabaseService = ref.read(supabaseServiceProvider);
      if (_isLogin) {
        await supabaseService.signIn(_emailController.text, _passwordController.text);
      } else {
        await supabaseService.signUp(_emailController.text, _passwordController.text);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Autenticação realizada com sucesso!')),
        );
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: ${e.toString()}'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(_isLogin ? 'Login' : 'Criar Conta')),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 800;
          if (isDesktop) {
            return Row(
              children: [
                Expanded(
                  child: Container(
                    color: AppColors.primary.withOpacity(0.05),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Image.asset('assets/images/logo.png', height: 160, errorBuilder: (_,__,___) => const Icon(Icons.sailing, size: 120, color: AppColors.primary)),
                          const SizedBox(height: 24),
                          const Text('Singrar Web Portal', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          const Text('Painel de Planejamento de Rotas', style: TextStyle(color: AppColors.textLight, fontSize: 16)),
                        ],
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 450,
                  padding: const EdgeInsets.all(48.0),
                  child: Center(child: _buildForm()),
                ),
              ],
            );
          }
          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: _buildForm(showLogo: true),
            ),
          );
        },
      ),
    );
  }

  Widget _buildForm({bool showLogo = false}) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (showLogo) ...[
          Image.asset('assets/images/logo.png', height: 100, errorBuilder: (_,__,___) => const Icon(Icons.sailing, size: 80, color: AppColors.primary)),
          const SizedBox(height: 48),
        ],
        TextField(
          controller: _emailController,
          decoration: const InputDecoration(labelText: 'E-mail', border: OutlineInputBorder()),
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(color: Colors.white),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passwordController,
          decoration: const InputDecoration(labelText: 'Senha', border: OutlineInputBorder()),
          obscureText: true,
          style: const TextStyle(color: Colors.white),
        ),
        const SizedBox(height: 32),
        _isLoading
            ? const CircularProgressIndicator()
            : ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.background,
                ),
                child: Text(_isLogin ? 'ENTRAR' : 'CADASTRAR', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
        TextButton(
          onPressed: () => setState(() => _isLogin = !_isLogin),
          child: Text(_isLogin ? 'Ainda não tem conta? Crie uma' : 'Já possui conta? Faça login', style: const TextStyle(color: AppColors.textLight)),
        )
      ],
    );
  }
}
