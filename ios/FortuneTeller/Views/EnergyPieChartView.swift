//
//  EnergyPieChartView.swift
//  FortuneTeller
//
//  Five Elements Energy Pie Chart - displays Wu Xing energy distribution.
//

import SwiftUI

/// Data model for element energy
struct ElementEnergy: Identifiable {
    let id = UUID()
    let element: FiveElement
    let score: Int
    let percentage: Double
}

/// Five Elements Energy Pie Chart View
struct EnergyPieChartView: View {
    
    let energyData: [ElementEnergy]
    
    // Calculate total for percentages
    private var total: Int {
        energyData.reduce(0) { $0 + $1.score }
    }
    
    // Dominant and weakest elements
    private var dominant: ElementEnergy? {
        energyData.max(by: { $0.score < $1.score })
    }
    
    private var weakest: ElementEnergy? {
        energyData.min(by: { $0.score < $1.score })
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Title
            Text("📊 五行能量分布")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            // Pie Chart with Legend
            HStack(spacing: 20) {
                // Pie Chart
                ZStack {
                    ForEach(Array(sliceData.enumerated()), id: \.offset) { index, slice in
                        PieSlice(
                            startAngle: slice.startAngle,
                            endAngle: slice.endAngle
                        )
                        .fill(slice.color)
                    }
                }
                .frame(width: 140, height: 140)
                
                // Legend
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(energyData) { energy in
                        HStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(energy.element.color)
                                .frame(width: 16, height: 16)
                            
                            Text(energy.element.rawValue)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(energy.element.color)
                            
                            Text("\(energy.score)分 (\(Int(energy.percentage * 100))%)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(red: 0.1, green: 0.1, blue: 0.18))
            )
            
            // Strongest/Weakest Metrics
            HStack(spacing: 40) {
                if let dom = dominant {
                    VStack(spacing: 4) {
                        Text("⬆️ 最强五行")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        
                        HStack(spacing: 4) {
                            Circle()
                                .fill(dom.element.color)
                                .frame(width: 20, height: 20)
                            Text(dom.element.rawValue)
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        
                        Text("↑ \(Int(dom.percentage * 100))%")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                }
                
                if let weak = weakest {
                    VStack(spacing: 4) {
                        Text("⬇️ 最弱五行")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        
                        HStack(spacing: 4) {
                            Circle()
                                .fill(weak.element.color)
                                .frame(width: 20, height: 20)
                            Text(weak.element.rawValue)
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        
                        Text("↓ \(Int(weak.percentage * 100))%")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.white)
                .shadow(color: .black.opacity(0.05), radius: 10, y: 4)
        )
    }
    
    // Calculate slice data for pie chart
    private var sliceData: [(startAngle: Angle, endAngle: Angle, color: Color)] {
        var slices: [(startAngle: Angle, endAngle: Angle, color: Color)] = []
        var currentAngle: Double = -90 // Start from 12 o'clock
        
        for energy in energyData {
            let sweepAngle = energy.percentage * 360
            let startAngle = Angle(degrees: currentAngle)
            let endAngle = Angle(degrees: currentAngle + sweepAngle)
            slices.append((startAngle, endAngle, energy.element.color))
            currentAngle += sweepAngle
        }
        
        return slices
    }
}

/// Pie Slice Shape
struct PieSlice: Shape {
    let startAngle: Angle
    let endAngle: Angle
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2
        
        path.move(to: center)
        path.addArc(
            center: center,
            radius: radius,
            startAngle: startAngle,
            endAngle: endAngle,
            clockwise: false
        )
        path.closeSubpath()
        
        return path
    }
}

// MARK: - Preview

#Preview {
    EnergyPieChartView(energyData: [
        ElementEnergy(element: .wood, score: 190, percentage: 0.238),
        ElementEnergy(element: .fire, score: 200, percentage: 0.250),
        ElementEnergy(element: .earth, score: 200, percentage: 0.250),
        ElementEnergy(element: .metal, score: 100, percentage: 0.125),
        ElementEnergy(element: .water, score: 110, percentage: 0.138)
    ])
    .padding()
    .background(Color.gray.opacity(0.1))
}
