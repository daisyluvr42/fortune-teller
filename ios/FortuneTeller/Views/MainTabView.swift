//
//  MainTabView.swift
//  FortuneTeller
//
//  Root tab navigation with Dashboard and Profile tabs.
//

import SwiftUI

struct MainTabView: View {
    
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            
            // MARK: - Home Tab (Dashboard)
            DashboardView()
                .tabItem {
                    Label("首页", systemImage: "house.fill")
                }
                .tag(0)
            
            // MARK: - Profile Tab
            ProfileView()
                .tabItem {
                    Label("我的", systemImage: "person.fill")
                }
                .tag(1)
        }
        .tint(.purple) // Active tab color
    }
}

// MARK: - Profile View (Placeholder)

struct ProfileView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.9, green: 0.95, blue: 1.0),
                        Color(red: 0.95, green: 0.92, blue: 0.98)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Avatar placeholder
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.purple.opacity(0.6), .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 100, height: 100)
                        .overlay(
                            Image(systemName: "person.fill")
                                .font(.system(size: 44))
                                .foregroundStyle(.white)
                        )
                        .shadow(color: .purple.opacity(0.3), radius: 10, y: 5)
                    
                    Text("游客用户")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("登录后查看更多功能")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    // Placeholder menu items
                    VStack(spacing: 0) {
                        ProfileMenuItem(icon: "clock.arrow.circlepath", title: "历史记录")
                        Divider().padding(.leading, 56)
                        ProfileMenuItem(icon: "gearshape.fill", title: "设置")
                        Divider().padding(.leading, 56)
                        ProfileMenuItem(icon: "questionmark.circle.fill", title: "帮助与反馈")
                    }
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.white)
                            .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
                    )
                    .padding(.horizontal)
                    
                    Spacer()
                }
                .padding(.top, 40)
            }
            .navigationTitle("我的")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Profile Menu Item

struct ProfileMenuItem: View {
    let icon: String
    let title: String
    
    var body: some View {
        Button {
            // Placeholder action
        } label: {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(.purple)
                    .frame(width: 24)
                
                Text(title)
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview {
    MainTabView()
}
