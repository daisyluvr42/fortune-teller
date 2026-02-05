//
//  DivinationView.swift
//  FortuneTeller
//
//  Daily divination feature - shake hexagram for fortune telling.
//

import SwiftUI

struct DivinationView: View {
    
    @State private var isShaking = false
    @State private var resultText = ""
    @State private var showResult = false
    
    var body: some View {
        ZStack {
            // Background gradient (mystical golden/orange theme)
            LinearGradient(
                colors: [
                    Color(red: 0.98, green: 0.95, blue: 0.88),
                    Color(red: 0.95, green: 0.88, blue: 0.78),
                    Color(red: 0.92, green: 0.82, blue: 0.70)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 32) {
                
                Spacer()
                
                // MARK: - Hexagram Icon
                ZStack {
                    // Outer glow
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [
                                    Color.orange.opacity(0.3),
                                    Color.clear
                                ],
                                center: .center,
                                startRadius: 60,
                                endRadius: 120
                            )
                        )
                        .frame(width: 240, height: 240)
                    
                    // Main circle
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.9, green: 0.7, blue: 0.4),
                                    Color(red: 0.8, green: 0.55, blue: 0.25)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 160, height: 160)
                        .shadow(color: .orange.opacity(0.4), radius: 20, y: 10)
                    
                    // Hexagon icon
                    Image(systemName: "hexagon.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(.white.opacity(0.9))
                        .rotationEffect(.degrees(isShaking ? 10 : -10))
                        .animation(
                            isShaking ? 
                                Animation.easeInOut(duration: 0.1).repeatForever(autoreverses: true) :
                                .default,
                            value: isShaking
                        )
                }
                
                // MARK: - Title
                VStack(spacing: 8) {
                    Text("每日一卜")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.6, green: 0.4, blue: 0.2),
                                    Color(red: 0.5, green: 0.3, blue: 0.15)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    
                    Text("心诚则灵，闭目凝神")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                
                // MARK: - Cast Button
                Button {
                    castHexagram()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "wand.and.stars")
                            .font(.title2)
                        Text("摇卦")
                            .font(.title2)
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(.white)
                    .frame(width: 200, height: 56)
                    .background(
                        RoundedRectangle(cornerRadius: 28)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.85, green: 0.55, blue: 0.25),
                                        Color(red: 0.75, green: 0.45, blue: 0.15)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .shadow(color: .orange.opacity(0.4), radius: 10, y: 5)
                }
                .disabled(isShaking)
                
                // MARK: - Result Area
                if showResult {
                    VStack(spacing: 12) {
                        Text("卦象解读")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        
                        Text(resultText)
                            .font(.body)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.primary)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(.white.opacity(0.8))
                            )
                    }
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                
                Spacer()
                Spacer()
            }
        }
        .navigationTitle("每日一卜")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Cast Hexagram Action
    
    private func castHexagram() {
        // Start shaking animation
        withAnimation {
            isShaking = true
            showResult = false
        }
        
        // Simulate casting delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation {
                isShaking = false
            }
            
            // Show mock result
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                    resultText = mockResults.randomElement() ?? "今日宜静不宜动，保持平常心。"
                    showResult = true
                }
            }
        }
    }
    
    // Mock results for placeholder
    private let mockResults = [
        "🌟 大吉：今日诸事顺遂，可放心前行。贵人相助，逢凶化吉。",
        "☀️ 中吉：稳中求进，宜守不宜攻。财运平稳，感情和睦。",
        "🌙 小吉：心想事成需耐心，急躁反而误事。静待时机为上策。",
        "⚡ 变卦：今日变数较多，做决定前三思。避免冲动行事。",
        "🌈 吉中带险：机遇与挑战并存，需谨慎把握。"
    ]
}

// MARK: - Preview

#Preview {
    NavigationStack {
        DivinationView()
    }
}
