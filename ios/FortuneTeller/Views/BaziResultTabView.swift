//
//  BaziResultTabView.swift
//  FortuneTeller
//
//  Tabbed result view with configurable hidden tabs.
//

import SwiftUI

/// Tab identifiers for result view
enum ResultTab: String, CaseIterable, Identifiable {
    case chart = "命盘"
    case analysis = "分析"
    case divination = "占卜"
    case consultation = "咨询"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .chart: return "list.bullet.clipboard"
        case .analysis: return "chart.bar"
        case .divination: return "hexagon"
        case .consultation: return "person.bubble"
        }
    }
}

/// Tabbed Bazi result view with configurable hidden tabs
struct BaziResultTabView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    @StateObject private var viewModel = HomeViewModel()
    
    /// Tabs to hide from the view
    var hiddenTabs: Set<ResultTab> = []
    
    @State private var selectedTab: ResultTab = .chart
    
    /// Visible tabs (all tabs minus hidden ones)
    private var visibleTabs: [ResultTab] {
        ResultTab.allCases.filter { !hiddenTabs.contains($0) }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Custom tab bar
            customTabBar
            
            // Tab content
            TabView(selection: $selectedTab) {
                ForEach(visibleTabs) { tab in
                    tabContent(for: tab)
                        .tag(tab)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .navigationTitle("命盘分析")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            // Set initial tab to first visible
            if let firstVisible = visibleTabs.first {
                selectedTab = firstVisible
            }
            
            // Auto-fetch if profile exists
            if let profile = profileManager.activeProfile {
                print("[DEBUG] BaziResultTabView loading profile: \(profile.name), birthTime: \(profile.birthTime)")
                viewModel.populate(from: profile)
                Task {
                    await viewModel.fetchChart()
                }
            }
        }
    }
    
    // MARK: - Custom Tab Bar
    
    private var customTabBar: some View {
        HStack(spacing: 0) {
            ForEach(visibleTabs) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 20))
                        Text(tab.rawValue)
                            .font(.caption)
                    }
                    .foregroundStyle(selectedTab == tab ? .purple : .secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        selectedTab == tab ?
                        Color.purple.opacity(0.1) :
                        Color.clear
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .background(Color(.systemGray6))
    }
    
    // MARK: - Tab Content
    
    @ViewBuilder
    private func tabContent(for tab: ResultTab) -> some View {
        switch tab {
        case .chart:
            chartTabContent
        case .analysis:
            analysisTabContent
        case .divination:
            DivinationView()
        case .consultation:
            MasterConsultationView()
        }
    }
    
    // MARK: - Chart Tab Content
    
    private var chartTabContent: some View {
        ScrollView {
            VStack(spacing: 20) {
                if viewModel.isLoading {
                    ProgressView("加载中...")
                        .padding(.top, 100)
                } else if let chartData = viewModel.chartResponse {
                    ChartGridView(chartData: chartData)
                        .padding(.horizontal)
                } else {
                    emptyChartState
                }
            }
            .padding(.vertical)
        }
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.95, blue: 0.98),
                    Color.white
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }
    
    // MARK: - Analysis Tab Content
    
    private var analysisTabContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                if viewModel.isLoading {
                    ProgressView("分析中...")
                        .padding(.top, 100)
                } else if !viewModel.analysisText.isEmpty {
                    Text(viewModel.analysisText)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.systemGray6))
                        )
                        .padding(.horizontal)
                } else {
                    VStack(spacing: 16) {
                        Text("选择分析类型")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        
                        analysisButtons
                    }
                    .padding(.top, 40)
                }
            }
            .padding(.vertical)
        }
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.95, blue: 0.98),
                    Color.white
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }
    
    // MARK: - Analysis Buttons
    
    private var analysisButtons: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                analysisButton(title: "整体命格", topic: "整体命格")
                analysisButton(title: "事业运势", topic: "事业运势")
            }
            HStack(spacing: 12) {
                analysisButton(title: "感情婚姻", topic: "感情婚姻")
                analysisButton(title: "财运分析", topic: "财运分析")
            }
        }
        .padding(.horizontal)
    }
    
    private func analysisButton(title: String, topic: String) -> some View {
        Button {
            Task {
                await viewModel.fetchAnalysis(topic: topic)
            }
        } label: {
            Text(title)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.purple.opacity(0.1))
                )
                .foregroundStyle(.purple)
        }
        .disabled(viewModel.isLoading)
    }
    
    // MARK: - Empty State
    
    private var emptyChartState: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.doc.horizontal")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            
            Text("暂无命盘数据")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Text("请先完善个人资料以生成八字命盘")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 60)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        BaziResultTabView(hiddenTabs: [.divination, .consultation])
            .environmentObject(ProfileManager())
    }
}
