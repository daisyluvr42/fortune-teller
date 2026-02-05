//
//  MiniBarChartView.swift
//  FortuneTeller
//
//  Compact 3-bar chart for emotion, wealth, and career.
//

import SwiftUI

/// Data for a single luck bar
struct LuckBarData: Identifiable {
    let id = UUID()
    let label: String
    let value: Double  // 0.0 to 1.0
    let gradient: [Color]
}

/// Compact version of the 3-bar luck chart
struct MiniBarChartView: View {
    
    let bars: [LuckBarData]
    
    init(bars: [LuckBarData]? = nil) {
        self.bars = bars ?? [
            LuckBarData(label: "感情", value: 0.75, gradient: [Color.pink.opacity(0.6), Color.pink]),
            LuckBarData(label: "财运", value: 0.55, gradient: [Color.yellow.opacity(0.6), Color.orange]),
            LuckBarData(label: "事业", value: 0.85, gradient: [Color.blue.opacity(0.6), Color.blue])
        ]
    }
    
    var body: some View {
        HStack(spacing: 16) {
            ForEach(bars) { bar in
                MiniLuckBar(
                    label: bar.label,
                    value: bar.value,
                    gradient: bar.gradient
                )
            }
        }
    }
}

/// Single mini progress bar
struct MiniLuckBar: View {
    let label: String
    let value: Double
    let gradient: [Color]
    
    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .bottom) {
                // Background capsule
                Capsule()
                    .fill(Color.gray.opacity(0.15))
                    .frame(width: 18, height: 70)
                
                // Filled capsule
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: gradient,
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(width: 18, height: 70 * value)
            }
            
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Preview

#Preview {
    MiniBarChartView()
        .padding()
        .background(Color(.systemBackground))
}
