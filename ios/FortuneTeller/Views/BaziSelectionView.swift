//
//  BaziSelectionView.swift
//  FortuneTeller
//
//  Mode selection view for Bazi chart: Single or Compatibility mode.
//

import SwiftUI

struct BaziSelectionView: View {
    
    @State private var navigateToSingle = false
    @State private var navigateToCouple = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.9, green: 0.95, blue: 1.0),
                    Color(red: 0.85, green: 0.9, blue: 0.98),
                    Color(red: 0.95, green: 0.92, blue: 0.98)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 32) {
                    
                    // MARK: - Header
                    VStack(spacing: 8) {
                        Text("选择模式")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("请选择您想要的排盘方式")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 40)
                    
                    // MARK: - Mode Cards
                    VStack(spacing: 20) {
                        
                        // Single Mode Card
                        ModeSelectionCard(
                            icon: "person.fill",
                            title: "单人模式",
                            subtitle: "分析个人八字命盘",
                            description: "输入您的出生时间，获取详细的八字分析、五行能量分布、运势预测等。",
                            gradientColors: [
                                Color(red: 0.6, green: 0.5, blue: 0.9),
                                Color(red: 0.5, green: 0.4, blue: 0.85)
                            ]
                        ) {
                            navigateToSingle = true
                        }
                        
                        // Compatibility Mode Card
                        ModeSelectionCard(
                            icon: "heart.fill",
                            title: "合盘模式",
                            subtitle: "双人姻缘配对分析",
                            description: "输入双方出生时间，分析两人八字契合度、婚姻运势、相处建议等。",
                            gradientColors: [
                                Color(red: 0.95, green: 0.5, blue: 0.6),
                                Color(red: 0.9, green: 0.4, blue: 0.5)
                            ]
                        ) {
                            navigateToCouple = true
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer(minLength: 40)
                }
            }
        }
        .navigationTitle("命盘推演")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $navigateToSingle) {
            SingleInputView()
        }
        .navigationDestination(isPresented: $navigateToCouple) {
            CoupleInputView()
        }
    }
}

// MARK: - Mode Selection Card

struct ModeSelectionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let description: String
    let gradientColors: [Color]
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 16) {
                
                // Icon and title row
                HStack(spacing: 16) {
                    // Icon circle
                    Image(systemName: icon)
                        .font(.title)
                        .foregroundStyle(.white)
                        .frame(width: 56, height: 56)
                        .background(
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: gradientColors,
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )
                        .shadow(color: gradientColors.first?.opacity(0.4) ?? .clear, radius: 8, y: 4)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.primary)
                        
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                
                // Description
                Text(description)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(.white)
                    .shadow(color: .black.opacity(0.08), radius: 12, y: 5)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Couple Input View (Placeholder)

struct CoupleInputView: View {
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.98, green: 0.92, blue: 0.95),
                    Color(red: 0.95, green: 0.88, blue: 0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.pink.opacity(0.7), .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                Text("合盘模式")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("此功能正在开发中...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                Text("敬请期待！")
                    .font(.caption)
                    .foregroundStyle(.pink)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(.pink.opacity(0.15))
                    )
            }
        }
        .navigationTitle("合盘模式")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        BaziSelectionView()
    }
}
