//
//  FeatureButtonRow.swift
//  FortuneTeller
//
//  Row of 4 feature icon buttons.
//

import SwiftUI

/// Data for a feature button
struct FeatureButtonData: Identifiable {
    let id = UUID()
    let icon: String
    let label: String
    let action: () -> Void
}

/// Row of 4 square feature buttons
struct FeatureButtonRow: View {
    
    let buttons: [FeatureButtonData]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(buttons) { button in
                FeatureSquareButton(
                    icon: button.icon,
                    label: button.label,
                    action: button.action
                )
                .frame(maxWidth: .infinity)
            }
        }
    }
}

/// Single square feature button
struct FeatureSquareButton: View {
    let icon: String
    let label: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color(.systemGray6))
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: icon)
                        .font(.system(size: 24))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
                
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.primary)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview {
    FeatureButtonRow(buttons: [
        FeatureButtonData(icon: "list.bullet.clipboard", label: "命盘", action: {}),
        FeatureButtonData(icon: "heart.circle", label: "合盘", action: {}),
        FeatureButtonData(icon: "square.grid.2x2", label: "排盘", action: {}),
        FeatureButtonData(icon: "grid", label: "更多", action: {})
    ])
    .padding()
    .background(Color(.systemBackground))
}
