//
//  ZodiacView.swift
//  FortuneTeller
//
//  Display user's Western zodiac and Chinese zodiac based on birth date.
//

import SwiftUI

struct ZodiacView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.15, green: 0.05, blue: 0.25),
                    Color(red: 0.05, green: 0.05, blue: 0.15)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    if let profile = profileManager.activeProfile {
                        // Western Zodiac Card
                        westernZodiacCard(for: profile)
                        
                        // Chinese Zodiac Card
                        chineseZodiacCard(for: profile)
                    } else {
                        // No profile state
                        noProfileView
                    }
                }
                .padding()
            }
        }
        .navigationTitle("星座运势")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(Color(red: 0.15, green: 0.05, blue: 0.25), for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }
    
    // MARK: - Western Zodiac Card
    
    private func westernZodiacCard(for profile: UserProfile) -> some View {
        let zodiacInfo = ZodiacUtils.getWesternZodiac(date: profile.birthDate)
        
        return VStack(spacing: 16) {
            // Header
            HStack {
                Image(systemName: "star.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.yellow)
                Text("西方星座")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }
            
            // Main zodiac display
            HStack(spacing: 20) {
                // Large emoji icon
                Text(zodiacInfo.icon)
                    .font(.system(size: 72))
                    .shadow(color: .purple.opacity(0.5), radius: 10)
                
                VStack(alignment: .leading, spacing: 8) {
                    // Zodiac name
                    Text(zodiacInfo.name)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white, .purple.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    
                    // Element badge
                    HStack(spacing: 6) {
                        Image(systemName: elementIcon(for: zodiacInfo.element))
                            .foregroundStyle(elementColor(for: zodiacInfo.element))
                        Text("\(zodiacInfo.element)象星座")
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    .font(.subheadline)
                }
                
                Spacer()
            }
            
            // Birth date info
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(.white.opacity(0.6))
                Text(formatDate(profile.birthDate))
                    .foregroundStyle(.white.opacity(0.6))
                Spacer()
            }
            .font(.caption)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.purple.opacity(0.3),
                            Color.blue.opacity(0.2)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
    
    // MARK: - Chinese Zodiac Card
    
    private func chineseZodiacCard(for profile: UserProfile) -> some View {
        let year = Calendar.current.component(.year, from: profile.birthDate)
        let animal = ZodiacUtils.getChineseZodiac(year: year)
        
        return VStack(spacing: 16) {
            // Header
            HStack {
                Image(systemName: "moon.stars.fill")
                    .font(.title2)
                    .foregroundStyle(.orange)
                Text("中国属相")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }
            
            // Main zodiac display
            HStack(spacing: 20) {
                // Animal emoji
                Text(animalEmoji(for: animal))
                    .font(.system(size: 72))
                    .shadow(color: .orange.opacity(0.5), radius: 10)
                
                VStack(alignment: .leading, spacing: 8) {
                    // Animal name
                    Text("属\(animal)")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white, .orange.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    
                    // Year info
                    Text("\(String(year))年生")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }
                
                Spacer()
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.orange.opacity(0.3),
                            Color.red.opacity(0.2)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
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
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年M月d日"
        return formatter.string(from: date)
    }
    
    private func elementIcon(for element: String) -> String {
        switch element {
        case "火": return "flame.fill"
        case "土": return "mountain.2.fill"
        case "风": return "wind"
        case "水": return "drop.fill"
        default: return "circle.fill"
        }
    }
    
    private func elementColor(for element: String) -> Color {
        switch element {
        case "火": return .red
        case "土": return .brown
        case "风": return .cyan
        case "水": return .blue
        default: return .gray
        }
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
        ZodiacView()
            .environmentObject(ProfileManager())
    }
}
