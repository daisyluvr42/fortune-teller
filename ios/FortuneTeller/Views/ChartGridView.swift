//
//  ChartGridView.swift
//  FortuneTeller
//
//  Displays all four Bazi pillars horizontally.
//

import SwiftUI

/// Grid view displaying all four Bazi pillars
struct ChartGridView: View {
    
    let chartData: BaziChartResponse
    
    var body: some View {
        VStack(spacing: 16) {
            
            // MARK: - Header
            HStack {
                Text("八字排盘")
                    .font(.headline)
                
                Spacer()
                
                // Pattern badge
                Text(chartData.patternName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.orange)
                    )
            }
            
            // MARK: - Four Pillars Grid
            HStack(spacing: 12) {
                PillarView(
                    pillarName: "年柱",
                    stem: chartData.yearPillar.gan,
                    branch: chartData.yearPillar.zhi,
                    tenGod: chartData.yearPillar.tenGod,
                    hiddenStems: chartData.yearPillar.hiddenStems
                )
                
                PillarView(
                    pillarName: "月柱",
                    stem: chartData.monthPillar.gan,
                    branch: chartData.monthPillar.zhi,
                    tenGod: chartData.monthPillar.tenGod,
                    hiddenStems: chartData.monthPillar.hiddenStems
                )
                
                PillarView(
                    pillarName: "日柱",
                    stem: chartData.dayPillar.gan,
                    branch: chartData.dayPillar.zhi,
                    tenGod: nil,  // Day master has no ten god for itself
                    hiddenStems: chartData.dayPillar.hiddenStems
                )
                
                PillarView(
                    pillarName: "时柱",
                    stem: chartData.hourPillar.gan,
                    branch: chartData.hourPillar.zhi,
                    tenGod: chartData.hourPillar.tenGod,
                    hiddenStems: chartData.hourPillar.hiddenStems
                )
            }
            
            // MARK: - Summary Row
            HStack(spacing: 16) {
                summaryItem(label: "日主", value: chartData.dayMaster)
                summaryItem(label: "身强/弱", value: chartData.strength)
                summaryItem(label: "喜用神", value: chartData.joyElements)
            }
            .font(.caption)
            
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
        )
    }
    
    // MARK: - Summary Item
    
    private func summaryItem(label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(label)
                .foregroundStyle(.secondary)
            Text(value)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Preview

#Preview {
    ChartGridView(
        chartData: BaziChartResponse(
            yearPillar: Pillar(gan: "庚", zhi: "午", tenGod: "比肩", hiddenStems: ["丁", "己"]),
            monthPillar: Pillar(gan: "辛", zhi: "巳", tenGod: "劫财", hiddenStems: ["丙", "戊", "庚"]),
            dayPillar: Pillar(gan: "庚", zhi: "辰", tenGod: "日主", hiddenStems: ["戊", "乙", "癸"]),
            hourPillar: Pillar(gan: "癸", zhi: "未", tenGod: "伤官", hiddenStems: ["己", "丁", "乙"]),
            patternName: "魁罡格",
            patternType: "特殊格局",
            dayMaster: "庚",
            strength: "身弱",
            joyElements: "金、土",
            timeCorrection: nil
        )
    )
    .padding()
}
