//
//  WelcomeCard.swift
//  FortuneTeller
//
//  Empty state card prompting user to create their first profile.
//

import SwiftUI

/// Welcome card shown when no profiles exist
struct WelcomeCard: View {
    
    let onCreateTap: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            // Icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.purple.opacity(0.1), .blue.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                
                Image(systemName: "person.crop.circle.badge.plus")
                    .font(.system(size: 44))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
            
            // Title
            Text("欢迎使用命理大师")
                .font(.title2)
                .fontWeight(.bold)
            
            // Description
            Text("请先建立您的第一个命理档案")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            // Create Button
            Button(action: onCreateTap) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("创建档案")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 40)
        }
        .padding(32)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(.white)
                .shadow(color: .black.opacity(0.08), radius: 20, y: 8)
        )
        .padding(.horizontal)
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        Color(.systemGray6)
            .ignoresSafeArea()
        
        WelcomeCard {
            print("Create tapped")
        }
    }
}
