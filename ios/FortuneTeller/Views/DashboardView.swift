//
//  DashboardView.swift
//  FortuneTeller
//
//  Main dashboard view with profile switching and fortune display.
//

import SwiftUI

struct DashboardView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    @StateObject private var viewModel = HomeViewModel()
    
    @State private var showAskAI = false
    @State private var showProfileEdit = false
    @State private var editingProfile: UserProfile?
    
    // Navigation states for feature grid
    @State private var navigateToChart = false
    @State private var navigateToZodiac = false
    @State private var navigateToDivination = false
    @State private var navigateToConsultation = false
    @State private var navigateToComingSoon = false
    @State private var comingSoonTitle = ""
    @State private var comingSoonIcon = ""
    
    // Mock luck score (in production, calculate from active profile)
    @State private var luckScore: Int = 66
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                backgroundGradient
                
                // Main Content
                VStack(spacing: 20) {
                    // 1. Profile Header (replaces TopNavBarView)
                    ProfileHeaderView(
                        showEditSheet: $showProfileEdit,
                        editingProfile: $editingProfile
                    )
                    
                    // 2. Main Content Area
                    if profileManager.hasProfiles {
                        // Active State: Show dashboard
                        dashboardContent
                    } else {
                        // Empty State: Show welcome card
                        Spacer()
                        WelcomeCard {
                            editingProfile = nil
                            showProfileEdit = true
                        }
                        Spacer()
                    }
                    
                    // 3. Spacer pushes everything to top
                    if profileManager.hasProfiles {
                        Spacer()
                    }
                }
                
                // Floating Action Button (only when profiles exist)
                if profileManager.hasProfiles {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            floatingActionButton
                                .padding(.trailing, 20)
                                .padding(.bottom, 30)
                        }
                    }
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(isPresented: $navigateToChart) {
                BaziResultTabView(hiddenTabs: [.divination, .consultation])
            }
            .navigationDestination(isPresented: $navigateToDivination) {
                DivinationView()
            }
            .navigationDestination(isPresented: $navigateToConsultation) {
                MasterConsultationView()
            }
            .navigationDestination(isPresented: $navigateToZodiac) {
                ZodiacDetailView()
            }
            .navigationDestination(isPresented: $navigateToComingSoon) {
                ComingSoonView(title: comingSoonTitle, icon: comingSoonIcon)
            }
            .sheet(isPresented: $showAskAI) {
                ChatView()
            }
            .sheet(isPresented: $showProfileEdit) {
                ProfileEditView(existingProfile: editingProfile)
            }
            .onChange(of: profileManager.activeProfile?.id) { oldId, newId in
                // Auto-navigate to chart results when profile switches (including between profiles)
                if let newId = newId, newId != oldId {
                    print("[DEBUG] Active profile changed from \(String(describing: oldId)) to \(newId)")
                    navigateToChart = true
                }
            }
        }
    }
    
    // MARK: - Dashboard Content (when profiles exist)
    
    private var dashboardContent: some View {
        VStack(spacing: 20) {
            // Super Dashboard Card
            SuperDashboardCard(luckScore: luckScore)
                .padding(.horizontal)
            
            // 2x4 Feature Grid
            FeatureGridView { feature in
                handleFeatureTap(feature)
            }
            .padding(.horizontal)
            .padding(.top, 4)
        }
    }
    
    // MARK: - Feature Tap Handler
    
    private func handleFeatureTap(_ feature: FeatureType) {
        switch feature {
        case .chart:
            // Navigate to Bazi result with only chart/analysis tabs
            navigateToChart = true
        case .horoscope:
            // Navigate to zodiac view
            navigateToZodiac = true
        case .divination:
            // Navigate directly to divination
            navigateToDivination = true
        case .consultation:
            // Navigate directly to consultation
            navigateToConsultation = true
        default:
            // Show coming soon for other features
            comingSoonTitle = feature.label
            comingSoonIcon = feature.icon
            navigateToComingSoon = true
        }
    }
    
    // MARK: - Floating Action Button
    
    private var floatingActionButton: some View {
        Button {
            showAskAI = true
        } label: {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.4, green: 0.6, blue: 1.0),
                                Color(red: 0.3, green: 0.4, blue: 0.9)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 60, height: 60)
                    .shadow(color: .blue.opacity(0.4), radius: 8, y: 4)
                
                Text("问")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Background Gradient
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.85, green: 0.92, blue: 1.0),  // Light blue
                Color.white
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
    

}

// MARK: - Preview

#Preview {
    DashboardView()
        .environmentObject(ProfileManager())
}
