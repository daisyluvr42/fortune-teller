//
//  PillarView.swift
//  FortuneTeller
//
//  Custom SwiftUI component for displaying a single Bazi pillar.
//

import SwiftUI

/// A single Bazi pillar view (年/月/日/时柱)
struct PillarView: View {
    
    let pillarName: String   // e.g., "年柱", "月柱"
    let stem: String         // 天干 (e.g., "甲")
    let branch: String       // 地支 (e.g., "子")
    let tenGod: String?      // 十神 (e.g., "比肩", nil for 日主)
    let hiddenStems: [String]? // 藏干
    
    // MARK: - Configuration
    
    private let stemSize: CGFloat = 50
    private let branchSize: CGFloat = 50
    private let strokeWidth: CGFloat = 3
    
    var body: some View {
        VStack(spacing: 8) {
            
            // MARK: - Pillar Name Label
            Text(pillarName)
                .font(.caption)
                .foregroundStyle(.secondary)
            
            // MARK: - Ten God Tag
            tenGodTag
            
            // MARK: - Stem Circle
            stemCircle
            
            // MARK: - Branch Square
            branchSquare
            
            // MARK: - Hidden Stems (Optional)
            if let hidden = hiddenStems, !hidden.isEmpty {
                hiddenStemsView(hidden)
            }
        }
        .frame(minWidth: 70)
    }
    
    // MARK: - Ten God Tag (Dynamic border matching stem's element color)
    
    private var tenGodTag: some View {
        Group {
            if let god = tenGod {
                Text(god)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Color(.label))
                    .padding(.horizontal, 10)  // Increased padding for breathing room
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(Color(.systemBackground).opacity(0.9))
                    )
                    .overlay(
                        Capsule()
                            .stroke(FiveElementColor.stemColor(stem), lineWidth: 1.5)  // Dynamic border color
                    )
            } else {
                // Day Master - special styling
                Text("日主")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(Color.orange)
                    )
            }
        }
    }
    
    // MARK: - Stem Circle
    
    private var stemCircle: some View {
        ZStack {
            Circle()
                .fill(FiveElementColor.stemBackground(stem))
            
            Circle()
                .stroke(FiveElementColor.stemColor(stem), lineWidth: strokeWidth)
            
            Text(stem)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(FiveElementColor.stemColor(stem))
        }
        .frame(width: stemSize, height: stemSize)
    }
    
    // MARK: - Branch Square
    
    private var branchSquare: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(FiveElementColor.branchBackground(branch))
            
            RoundedRectangle(cornerRadius: 8)
                .stroke(FiveElementColor.branchColor(branch), lineWidth: strokeWidth)
            
            Text(branch)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(FiveElementColor.branchColor(branch))
        }
        .frame(width: branchSize, height: branchSize)
    }
    
    // MARK: - Hidden Stems View
    
    private func hiddenStemsView(_ stems: [String]) -> some View {
        HStack(spacing: 2) {
            ForEach(stems, id: \.self) { stem in
                Text(stem)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(FiveElementColor.stemColor(stem))
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.gray.opacity(0.1))
        )
    }
}

// MARK: - Preview

#Preview {
    HStack(spacing: 16) {
        PillarView(
            pillarName: "年柱",
            stem: "甲",
            branch: "子",
            tenGod: "比肩",
            hiddenStems: ["癸"]
        )
        
        PillarView(
            pillarName: "月柱",
            stem: "丙",
            branch: "寅",
            tenGod: "食神",
            hiddenStems: ["甲", "丙", "戊"]
        )
        
        PillarView(
            pillarName: "日柱",
            stem: "甲",
            branch: "午",
            tenGod: nil,
            hiddenStems: ["丁", "己"]
        )
        
        PillarView(
            pillarName: "时柱",
            stem: "壬",
            branch: "申",
            tenGod: "偏印",
            hiddenStems: ["庚", "壬", "戊"]
        )
    }
    .padding()
}
