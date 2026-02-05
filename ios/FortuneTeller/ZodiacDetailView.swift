//
//  ZodiacDetailView.swift
//  FortuneTeller
//
//  Detailed zodiac view with AI-powered fortune readings.
//

import SwiftUI

struct ZodiacDetailView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    @StateObject private var viewModel = ZodiacViewModel()
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.12, green: 0.08, blue: 0.25),
                    Color(red: 0.05, green: 0.05, blue: 0.12)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            if let profile = profileManager.activeProfile {
                ScrollView {
                    VStack(spacing: 24) {
                        // 1. Header with both zodiacs
                        zodiacHeader(for: profile)
                        
                        // 2. Fortune Cards
                        fortuneCards(for: profile)
                    }
                    .padding()
                }
            } else {
                noProfileView
            }
        }
        .navigationTitle("星座运势")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color(red: 0.12, green: 0.08, blue: 0.25), for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task {
                        if let profile = profileManager.activeProfile {
                            viewModel.reset()
                            await viewModel.fetchFortune(
                                westernSign: profile.westernZodiac.name,
                                chineseSign: profile.chineseZodiac,
                                forceRefresh: true
                            )
                        }
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundStyle(.white)
                }
                .disabled(viewModel.isLoading)
            }
        }
        .alert("获取运势失败", isPresented: $viewModel.showError) {
            Button("确定", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "未知错误")
        }
    }
    
    // MARK: - Zodiac Header
    
    private func zodiacHeader(for profile: UserProfile) -> some View {
        HStack(spacing: 24) {
            // Western Zodiac
            VStack(spacing: 8) {
                Text(profile.westernZodiac.icon)
                    .font(.system(size: 60))
                    .shadow(color: .purple.opacity(0.6), radius: 12)
                
                Text(profile.westernZodiac.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                
                Text(profile.westernZodiac.element + "象")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
            
            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.2))
                .frame(width: 1, height: 80)
            
            // Chinese Zodiac
            VStack(spacing: 8) {
                Text(animalEmoji(for: profile.chineseZodiac))
                    .font(.system(size: 60))
                    .shadow(color: .orange.opacity(0.6), radius: 12)
                
                Text("属\(profile.chineseZodiac)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                
                Text("\(String(profile.birthYear))年")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 24)
        .padding(.horizontal, 16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.purple.opacity(0.4),
                            Color.blue.opacity(0.3)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
    }
    
    // MARK: - Fortune Cards
    
    private func fortuneCards(for profile: UserProfile) -> some View {
        VStack(spacing: 16) {
            // Card A: Yearly Chinese Zodiac Fortune
            fortuneCard(
                title: "本年属相运势",
                subtitle: "属\(profile.chineseZodiac) · \(currentYear())年",
                icon: "calendar.circle.fill",
                iconColor: .orange,
                content: viewModel.yearlyFortuneText,
                isLoading: viewModel.isLoading && !viewModel.hasFetched
            ) {
                Task {
                    await viewModel.fetchFortune(
                        westernSign: profile.westernZodiac.name,
                        chineseSign: profile.chineseZodiac
                    )
                }
            }
            
            // Card B: Daily Western Zodiac Fortune
            fortuneCard(
                title: "今日星座运势",
                subtitle: "\(profile.westernZodiac.name) · \(todayString())",
                icon: "star.circle.fill",
                iconColor: .purple,
                content: viewModel.dailyFortuneText,
                isLoading: viewModel.isLoading && !viewModel.hasFetched
            ) {
                Task {
                    await viewModel.fetchFortune(
                        westernSign: profile.westernZodiac.name,
                        chineseSign: profile.chineseZodiac
                    )
                }
            }
        }
    }
    
    // MARK: - Fortune Card Component
    
    private func fortuneCard(
        title: String,
        subtitle: String,
        icon: String,
        iconColor: Color,
        content: String,
        isLoading: Bool,
        onTap: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(iconColor)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                    
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
            }
            
            Divider()
            
            // Content
            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle())
                    Text("正在获取运势...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.vertical, 20)
            } else if content.isEmpty {
                // Placeholder - tap to fetch
                Button(action: onTap) {
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "sparkles")
                                .font(.title)
                                .foregroundStyle(iconColor.opacity(0.6))
                            Text("点击获取运势")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 20)
                }
                .buttonStyle(.plain)
            } else {
                Text(content)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineSpacing(4)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(uiColor: .secondarySystemBackground))
        )
    }
    
    // MARK: - No Profile View
    
    private var noProfileView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 60))
                .foregroundStyle(.white.opacity(0.5))
            
            Text("请先创建用户档案")
                .font(.headline)
                .foregroundStyle(.white.opacity(0.7))
            
            Text("需要您的出生日期来计算星座信息")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.5))
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }
    
    // MARK: - Helper Functions
    
    private func currentYear() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy"
        return formatter.string(from: Date())
    }
    
    private func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M月d日"
        return formatter.string(from: Date())
    }
    
    private func animalEmoji(for animal: String) -> String {
        switch animal {
        case "鼠": return "🐭"
        case "牛": return "🐮"
        case "虎": return "🐯"
        case "兔": return "🐰"
        case "龙": return "🐲"
        case "蛇": return "🐍"
        case "马": return "🐴"
        case "羊": return "🐑"
        case "猴": return "🐵"
        case "鸡": return "🐔"
        case "狗": return "🐶"
        case "猪": return "🐷"
        default: return "🐾"
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ZodiacDetailView()
            .environmentObject(ProfileManager())
    }
}
