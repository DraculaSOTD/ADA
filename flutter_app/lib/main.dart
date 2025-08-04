import 'package:flutter/material.dart';
import 'package:flutter_app/screens/auth_page.dart';
import 'package:flutter_app/theme.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DataPulse',
      theme: AppTheme.lightTheme,
      home: const AuthPage(),
    );
  }
}
