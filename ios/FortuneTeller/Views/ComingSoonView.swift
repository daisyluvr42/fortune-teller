//
//  ComingSoonView.swift
//  FortuneTeller
//
//  Placeholder view for features not yet implemented.
//

import SwiftUI

struct ComingSoonView: View {
    
    let title: String
    let icon: String
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.95, blue: 0.98),
                    Color(red: 0.92, green: 0.92, blue: 0.96)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // Icon
                Image(systemName: icon)
                    .font(.system(size: 72))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.purple.opacity(0.6), .blue.opacity(0.6)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                
                // Title
                Text(title)
                    .font(.title)
                    .fontWeight(.bold)
                
                // Coming soon message
                Text("此功能正在开发中...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                // Badge
                Text("敬请期待")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.purple)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(.purple.opacity(0.15))
                    )
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ComingSoonView(title: "星座运势", icon: "star.circle")
    }
}
