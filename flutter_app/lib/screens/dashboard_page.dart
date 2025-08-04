import 'package:flutter/material.dart';
import 'package:flutter_app/screens/active_models_tab.dart';
import 'package:flutter_app/screens/in_progress_tab.dart';
import 'package:flutter_app/screens/my_models_tab.dart';
import 'package:flutter_app/screens/tokens_wallet_tab.dart';
import 'package:flutter_app/widgets/model_performance_card.dart';
import 'package:flutter_app/widgets/notifications_card.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'My Models'),
            Tab(text: 'In Progress'),
            Tab(text: 'Active Models'),
            Tab(text: 'Tokens Wallet'),
          ],
        ),
      ),
      body: Row(
        children: [
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: const [
                MyModelsTab(),
                InProgressTab(),
                ActiveModelsTab(),
                TokensWalletTab(),
              ],
            ),
          ),
          SizedBox(
            width: 300,
            child: Column(
              children: const [
                ModelPerformanceCard(),
                NotificationsCard(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
