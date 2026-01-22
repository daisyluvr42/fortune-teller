//
//  ProfessionalChartView.swift
//  FortuneTeller
//
//  Professional Bazi chart table view displaying
//  Nayin, Twelve Stages, Kong Wang, and Shen Sha.
//

import SwiftUI

/// Professional chart table view with extended Bazi data
struct ProfessionalChartView: View {
    let chartResponse: BaziChartResponse
    
    // MARK: - Stage Colors
    
    private func stageColor(for stage: String) -> Color {
        switch stage {
        case "帝旺":
            return .yellow
        case "长生", "临官":
            return .green
        case "沐浴", "冠带", "胎", "养":
            return Color(red: 0.53, green: 0.81, blue: 0.92) // light blue
        case "衰":
            return .orange
        case "病", "死", "绝":
            return .red
        case "墓":
            return .purple
        default:
            return .white
        }
    }
    
    // MARK: - Body
    
    var body: some View {
        VStack(spacing: 16) {
            // Section Title
            HStack {
                Image(systemName: "scroll.fill")
                    .foregroundColor(.yellow)
                Text("专业排盘详情")
                    .font(.headline)
                    .foregroundColor(.yellow)
            }
            .padding(.bottom, 8)
            
            // Main Table
            if chartResponse.nayin != nil || chartResponse.twelveStages != nil {
                chartTableView
            }
            
            // Badges Row (Kong Wang + Shen Sha)
            badgesView
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black.opacity(0.3))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.yellow.opacity(0.3), lineWidth: 1)
                )
        )
    }
    
    // MARK: - Chart Table
    
    private var chartTableView: some View {
        VStack(spacing: 0) {
            // Header Row
            HStack(spacing: 0) {
                headerCell("项目", isFirst: true)
                ForEach(chartResponse.allPillars, id: \.name) { item in
                    headerCell("\(item.name)\n\(item.pillar.fullName)")
                }
            }
            .background(Color.yellow.opacity(0.15))
            
            Divider().background(Color.yellow.opacity(0.3))
            
            // Nayin Row
            if let nayin = chartResponse.nayin {
                HStack(spacing: 0) {
                    dataCell("纳音", isLabel: true)
                    ForEach(nayin.allNayin, id: \.self) { value in
                        dataCell(value)
                    }
                }
                
                Divider().background(Color.white.opacity(0.1))
            }
            
            // Twelve Stages Row
            if let stages = chartResponse.twelveStages {
                HStack(spacing: 0) {
                    dataCell("长生", isLabel: true)
                    ForEach(Array(stages.allStages.enumerated()), id: \.offset) { index, stage in
                        Text(stage)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(stageColor(for: stage))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                }
            }
        }
        .background(Color.white.opacity(0.03))
        .cornerRadius(12)
    }
    
    // MARK: - Header Cell
    
    private func headerCell(_ text: String, isFirst: Bool = false) -> some View {
        Text(text)
            .font(.system(size: isFirst ? 12 : 14, weight: .semibold))
            .foregroundColor(.yellow)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
    }
    
    // MARK: - Data Cell
    
    private func dataCell(_ text: String, isLabel: Bool = false) -> some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundColor(isLabel ? .gray : .white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
    }
    
    // MARK: - Badges View
    
    private var badgesView: some View {
        let hasContent = (chartResponse.kongWang?.isEmpty == false) || 
                        (chartResponse.shenSha?.isEmpty == false)
        
        return Group {
            if hasContent {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        // Kong Wang Badge
                        if let kongWang = chartResponse.kongWang, !kongWang.isEmpty {
                            BadgeView(
                                icon: "circle.slash",
                                label: "空亡",
                                value: kongWang.joined(separator: "、"),
                                color: Color(red: 0.87, green: 0.72, blue: 0.53) // burlywood
                            )
                        }
                        
                        // Shen Sha Badges
                        if let shenSha = chartResponse.shenSha {
                            ForEach(shenSha, id: \.self) { sha in
                                shenShaBadge(for: sha)
                            }
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }
        }
    }
    
    // MARK: - Shen Sha Badge
    
    private func shenShaBadge(for sha: String) -> some View {
        let (icon, color): (String, Color) = {
            if sha.contains("贵人") {
                return ("star.fill", .yellow)
            } else if sha.contains("桃花") {
                return ("heart.fill", .pink)
            } else if sha.contains("驿马") {
                return ("hare.fill", Color(red: 0.39, green: 0.58, blue: 0.93))
            } else {
                return ("sparkles", .white)
            }
        }()
        
        return HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))
            Text(sha)
                .font(.system(size: 13, weight: .semibold))
        }
        .foregroundColor(color)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(color.opacity(0.2))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(color.opacity(0.4), lineWidth: 1)
        )
        .cornerRadius(8)
    }
}

// MARK: - Badge View Component

struct BadgeView: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(.gray)
            Text("\(label)：")
                .font(.system(size: 12))
                .foregroundColor(.gray)
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(color)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(color.opacity(0.15))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
        .cornerRadius(8)
    }
}

// MARK: - Preview

#Preview {
    let samplePillar = Pillar(gan: "甲", zhi: "子", tenGod: "比肩", hiddenStems: ["癸"])
    let sampleChart = BaziChartResponse(
        yearPillar: samplePillar,
        monthPillar: Pillar(gan: "丙", zhi: "寅", tenGod: "食神", hiddenStems: ["甲", "丙", "戊"]),
        dayPillar: Pillar(gan: "甲", zhi: "辰", tenGod: "日主", hiddenStems: ["戊", "乙", "癸"]),
        hourPillar: Pillar(gan: "己", zhi: "巳", tenGod: "正财", hiddenStems: ["丙", "戊", "庚"]),
        patternName: "食神格",
        patternType: "正格",
        dayMaster: "甲",
        strength: "身旺",
        joyElements: "金、水",
        timeCorrection: nil,
        twelveStages: TwelveStages(yearStage: "沐浴", monthStage: "长生", dayStage: "养", hourStage: "帝旺"),
        kongWang: ["申", "酉"],
        nayin: NayinInfo(year: "海中金", month: "炉中火", day: "大林木", hour: "大林木"),
        shenSha: ["天乙贵人(丑)", "桃花(酉)", "驿马(寅)"]
    )
    
    return ProfessionalChartView(chartResponse: sampleChart)
        .padding()
        .background(Color(red: 0.1, green: 0.1, blue: 0.2))
}
