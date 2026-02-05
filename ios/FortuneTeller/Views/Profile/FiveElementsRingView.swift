//
//  FiveElementsRingView.swift
//  FortuneTeller
//
//  Custom segmented ring displaying Five Elements energy distribution with neon glow.
//

import SwiftUI

/// Segmented ring view for Five Elements energy visualization
struct FiveElementsRingView: View {
    
    let energyData: [ElementEnergy]
    let isActive: Bool
    let ringSize: CGFloat
    let lineWidth: CGFloat
    
    init(
        energyData: [ElementEnergy],
        isActive: Bool = true,
        ringSize: CGFloat = 68,
        lineWidth: CGFloat = 4
    ) {
        self.energyData = energyData
        self.isActive = isActive
        self.ringSize = ringSize
        self.lineWidth = lineWidth
    }
    
    var body: some View {
        ZStack {
            // Background glow layer (only when active)
            if isActive {
                ForEach(Array(segmentData.enumerated()), id: \.offset) { index, segment in
                    Circle()
                        .trim(from: segment.startFraction, to: segment.endFraction)
                        .stroke(
                            segment.color,
                            style: StrokeStyle(lineWidth: lineWidth + 6, lineCap: .butt)
                        )
                        .blur(radius: 6)
                        .opacity(0.6)
                }
            }
            
            // Main ring segments
            ForEach(Array(segmentData.enumerated()), id: \.offset) { index, segment in
                Circle()
                    .trim(from: segment.startFraction, to: segment.endFraction)
                    .stroke(
                        segment.color,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt)
                    )
                    .shadow(color: isActive ? segment.color.opacity(0.8) : .clear, radius: isActive ? 8 : 0)
            }
        }
        .frame(width: ringSize, height: ringSize)
        .rotationEffect(.degrees(-90)) // Start from 12 o'clock
        .opacity(isActive ? 1.0 : 0.5)
    }
    
    /// Calculate segment fractions from energy data
    private var segmentData: [(startFraction: CGFloat, endFraction: CGFloat, color: Color)] {
        var segments: [(startFraction: CGFloat, endFraction: CGFloat, color: Color)] = []
        var currentFraction: CGFloat = 0
        
        // Small gap between segments for visual separation
        let gap: CGFloat = 0.008
        
        for energy in energyData {
            let segmentLength = CGFloat(energy.percentage) - gap
            let startFraction = currentFraction
            let endFraction = currentFraction + max(segmentLength, 0.01) // Minimum visible size
            
            segments.append((
                startFraction: startFraction,
                endFraction: endFraction,
                color: energy.element.color
            ))
            
            currentFraction = endFraction + gap
        }
        
        return segments
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 40) {
        // Active state
        ZStack {
            FiveElementsRingView(
                energyData: mockFiveElements,
                isActive: true,
                ringSize: 68
            )
            
            Circle()
                .fill(Color.blue.opacity(0.6))
                .frame(width: 56, height: 56)
            
            Image(systemName: "person.circle.fill")
                .font(.system(size: 24))
                .foregroundStyle(.white)
        }
        
        // Inactive state
        ZStack {
            FiveElementsRingView(
                energyData: mockFiveElements,
                isActive: false,
                ringSize: 48,
                lineWidth: 2
            )
            
            Circle()
                .fill(Color.gray.opacity(0.4))
                .frame(width: 40, height: 40)
            
            Image(systemName: "person.circle.fill")
                .font(.system(size: 18))
                .foregroundStyle(.gray)
        }
    }
    .padding(40)
    .background(Color(.systemGray5))
}

/// Mock data for preview
private let mockFiveElements: [ElementEnergy] = [
    ElementEnergy(element: .metal, score: 100, percentage: 0.125),
    ElementEnergy(element: .wood, score: 190, percentage: 0.238),
    ElementEnergy(element: .water, score: 110, percentage: 0.137),
    ElementEnergy(element: .fire, score: 200, percentage: 0.250),
    ElementEnergy(element: .earth, score: 200, percentage: 0.250)
]
