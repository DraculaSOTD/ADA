import 'package:flutter/material.dart';

class ModelPerformanceCard extends StatelessWidget {
  const ModelPerformanceCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(16.0),
        child: Text('Model Performance'),
      ),
    );
  }
}
