//
//  SuperDashboardCard.swift
//  FortuneTeller
//
//  Combined dashboard card with score on left and bar charts on right.
//

import SwiftUI

/// Main dashboard card with horizontal layout: score on left, charts on right
struct SuperDashboardCard: View {
    
    let luckScore: Int
    
    var body: some View {
        HStack(spacing: 0) {
            // Left Side: Score Section
            VStack(spacing: 8) {
                Text("\(luckScore)")
                    .font(.system(size: 52, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.orange, .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                Text("今日运势")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                // Description Badge
                Text(luckDescription)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color(.systemGray6))
                    )
            }
            .frame(maxWidth: .infinity)
            
            // Divider
            Rectangle()
                .fill(Color(.systemGray4))
                .frame(width: 1, height: 100)
                .padding(.vertical, 8)
            
            // Right Side: Mini Bar Charts
            VStack(spacing: 8) {
                MiniBarChartView()
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 20)
        .padding(.horizontal, 16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.white)
                .shadow(color: .black.opacity(0.06), radius: 12, y: 4)
        )
    }
    
    private var luckDescription: String {
        switch luckScore {
        case 80...100: return "🎉 大吉大利"
        case 60..<80: return "😊 顺风顺水"
        case 40..<60: return "🙂 平稳过渡"
        default: return "💪 低调蛰伏"
        }
    }
}

// MARK: - Preview

#Preview {
    SuperDashboardCard(luckScore: 88)
        .padding()
        .background(Color(.systemGray5))
}
