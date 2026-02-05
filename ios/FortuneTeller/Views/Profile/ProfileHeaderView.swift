//
//  ProfileHeaderView.swift
//  FortuneTeller
//
//  Horizontal scrolling profile selector with Five Elements ring.
//

import SwiftUI

/// Horizontal profile selector with active profile, other profiles, and add button
struct ProfileHeaderView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    @Binding var showEditSheet: Bool
    @Binding var editingProfile: UserProfile?
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                // Active profile (large, highlighted with Five Elements ring)
                if let active = profileManager.activeProfile {
                    ActiveAvatarButton(profile: active) {
                        editingProfile = active
                        showEditSheet = true
                    }
                }
                
                // Other profiles (smaller, dimmed with subtle ring)
                ForEach(profileManager.profiles.dropFirst()) { profile in
                    OtherAvatarButton(profile: profile) {
                        withAnimation(.spring(response: 0.3)) {
                            profileManager.setActive(profile)
                        }
                    }
                }
                
                // Add new button
                AddProfileButton {
                    editingProfile = nil
                    showEditSheet = true
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }
}

// MARK: - Active Avatar Button

struct ActiveAvatarButton: View {
    let profile: UserProfile
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                ZStack {
                    // Five Elements neon ring
                    FiveElementsRingView(
                        energyData: profile.fiveElementsEnergy,
                        isActive: true,
                        ringSize: 68,
                        lineWidth: 4
                    )
                    
                    // Avatar background
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.blue.opacity(0.6), .purple.opacity(0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)
                    
                    // Avatar icon
                    Image(systemName: profile.avatar)
                        .font(.system(size: 24))
                        .foregroundStyle(.white)
                }
                
                Text(profile.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Other Avatar Button

struct OtherAvatarButton: View {
    let profile: UserProfile
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                ZStack {
                    // Dimmed Five Elements ring
                    FiveElementsRingView(
                        energyData: profile.fiveElementsEnergy,
                        isActive: false,
                        ringSize: 48,
                        lineWidth: 2
                    )
                    
                    // Avatar
                    Circle()
                        .fill(Color(.systemGray4))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: profile.avatar)
                        .font(.system(size: 18))
                        .foregroundStyle(.gray)
                }
                
                Text(profile.name)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .opacity(0.7)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Add Profile Button

struct AddProfileButton: View {
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Circle()
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 2, dash: [5])
                    )
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(.secondary)
                    )
                
                Text("添加")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview {
    struct PreviewWrapper: View {
        @StateObject var manager = ProfileManager()
        @State var showEdit = false
        @State var editing: UserProfile?
        
        var body: some View {
            VStack {
                ProfileHeaderView(
                    showEditSheet: $showEdit,
                    editingProfile: $editing
                )
                .environmentObject(manager)
                
                Button("Add Sample") {
                    manager.add(UserProfile.sample)
                }
            }
            .padding()
        }
    }
    return PreviewWrapper()
}
