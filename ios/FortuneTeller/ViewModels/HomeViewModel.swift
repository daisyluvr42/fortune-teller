//
//  HomeViewModel.swift
//  FortuneTeller
//
//  ViewModel for the Home screen following MVVM pattern.
//

import Foundation
import Combine

/// ViewModel for the HomeView
@MainActor
final class HomeViewModel: ObservableObject {
    
    // MARK: - Published State
    
    /// User input fields
    @Published var birthYear: Int = 1990
    @Published var birthMonth: Int = 1
    @Published var birthDay: Int = 1
    @Published var birthHour: Int = 12
    @Published var selectedGender: String = "男"
    @Published var isLunar: Bool = false  // Whether birth date is Lunar calendar
    
    /// API response state
    @Published var chartResponse: BaziChartResponse?
    @Published var analysisText: String = ""
    
    /// UI state
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showError: Bool = false
    
    /// Debug output
    @Published var debugOutput: String = "点击按钮获取数据..."
    
    // MARK: - Private Properties
    
    private let networkManager = NetworkManager.shared
    
    // MARK: - Computed Properties
    
    /// Current user input as UserInput struct
    var currentUserInput: UserInput {
        UserInput(
            birthYear: birthYear,
            month: birthMonth,
            day: birthDay,
            hour: birthHour,
            gender: selectedGender
        )
    }
    
    /// Available years for picker
    var availableYears: [Int] {
        Array(1920...2025)
    }
    
    /// Available months
    var availableMonths: [Int] {
        Array(1...12)
    }
    
    /// Available days
    var availableDays: [Int] {
        Array(1...31)
    }
    
    /// Available hours
    var availableHours: [Int] {
        Array(0...23)
    }
    
    // MARK: - Public Methods
    
    /// Fetch Bazi chart data from the API
    func fetchChart() async {
        isLoading = true
        errorMessage = nil
        debugOutput = "正在获取八字排盘..."
        
        do {
            let response = try await networkManager.fetchChart(data: currentUserInput)
            chartResponse = response
            
            // Format debug output
            debugOutput = """
            ✅ 获取成功!
            
            【四柱】
            年柱: \(response.yearPillar.fullName) (\(response.yearPillar.tenGod ?? "-"))
            月柱: \(response.monthPillar.fullName) (\(response.monthPillar.tenGod ?? "-"))
            日柱: \(response.dayPillar.fullName) (日主)
            时柱: \(response.hourPillar.fullName) (\(response.hourPillar.tenGod ?? "-"))
            
            【格局】\(response.patternName) (\(response.patternType))
            【日主】\(response.dayMaster)
            【身强/弱】\(response.strength)
            【喜用神】\(response.joyElements)
            """
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    /// Fetch fortune analysis for a specific topic
    func fetchAnalysis(topic: String) async {
        isLoading = true
        errorMessage = nil
        debugOutput = "正在获取 \(topic) 分析..."
        
        do {
            let markdown = try await networkManager.fetchAnalysis(
                userData: currentUserInput,
                questionType: topic
            )
            analysisText = markdown
            debugOutput = "✅ 分析完成!\n\n\(markdown)"
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    /// Populate input fields from a UserProfile (for auto-fill)
    func populate(from profile: UserProfile) {
        print("[DEBUG] Populating from profile: \(profile.name)")
        print("[DEBUG] birthTime (stored): \(profile.birthTime)")
        print("[DEBUG] approximateHour (converted): \(profile.approximateHour)")
        
        birthYear = profile.birthYear
        birthMonth = profile.birthMonth
        birthDay = profile.birthDay
        birthHour = profile.approximateHour
        selectedGender = profile.gender
        isLunar = profile.isLunar
        
        print("[DEBUG] Final birthHour set to: \(birthHour)")
    }
    
    /// Check API health
    func checkHealth() async {
        debugOutput = "正在检查 API 连接..."
        let isHealthy = await networkManager.healthCheck()
        
        if isHealthy {
            debugOutput = "✅ API 连接正常 (http://127.0.0.1:8000)"
        } else {
            debugOutput = "❌ API 连接失败\n请确保后端服务已启动"
        }
    }
    
    // MARK: - Private Methods
    
    private func handleError(_ error: Error) {
        if let networkError = error as? NetworkError {
            errorMessage = networkError.errorDescription
        } else {
            errorMessage = error.localizedDescription
        }
        showError = true
        debugOutput = "❌ 错误: \(errorMessage ?? "未知错误")"
    }
}
