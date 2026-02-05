//
//  FeatureGridView.swift
//  FortuneTeller
//
//  2x4 grid of feature buttons for dashboard.
//

import SwiftUI

/// Feature type enum for navigation
enum FeatureType: String, CaseIterable {
    case chart = "命盘"
    case horoscope = "星座"
    case palmistry = "手相"
    case physiognomy = "面相"
    case fengshui = "风水"
    case divination = "占卜"
    case mbti = "MBTI"
    case consultation = "深度咨询"
    
    var icon: String {
        switch self {
        case .chart: return "list.bullet.clipboard"
        case .horoscope: return "star.circle"
        case .palmistry: return "hand.raised"
        case .physiognomy: return "face.smiling"
        case .fengshui: return "house"
        case .divination: return "hexagon"
        case .mbti: return "brain.head.profile"
        case .consultation: return "person.bubble"
        }
    }
    
    var label: String {
        return self.rawValue
    }
}

/// 2x4 grid of feature buttons
struct FeatureGridView: View {
    
    let onFeatureTap: (FeatureType) -> Void
    
    // 4-column grid
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 4)
    
    // Ordered features: Row 1, then Row 2
    private let features: [FeatureType] = [
        .chart, .horoscope, .palmistry, .physiognomy,  // Row 1
        .fengshui, .divination, .mbti, .consultation    // Row 2
    ]
    
    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(features, id: \.self) { feature in
                FeatureGridButton(
                    icon: feature.icon,
                    label: feature.label
                ) {
                    onFeatureTap(feature)
                }
            }
        }
    }
}

/// Single grid button with icon and label
struct FeatureGridButton: View {
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
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview {
    FeatureGridView { feature in
        print("Tapped: \(feature.label)")
    }
    .padding()
    .background(Color(.systemBackground))
}
