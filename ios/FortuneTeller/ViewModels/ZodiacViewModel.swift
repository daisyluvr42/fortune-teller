//
//  ZodiacViewModel.swift
//  FortuneTeller
//
//  ViewModel for fetching zodiac fortune readings from AI.
//

import Foundation
import Combine

/// ViewModel for ZodiacDetailView
@MainActor
final class ZodiacViewModel: ObservableObject {
    
    // MARK: - Published State
    
    /// Fortune text for daily star sign
    @Published var dailyFortuneText: String = ""
    
    /// Fortune text for yearly Chinese zodiac
    @Published var yearlyFortuneText: String = ""
    
    /// Loading state
    @Published var isLoading: Bool = false
    
    /// Error state
    @Published var errorMessage: String?
    @Published var showError: Bool = false
    
    /// Whether fortune has been fetched
    @Published var hasFetched: Bool = false
    
    /// Whether fortune was loaded from cache
    @Published var isFromCache: Bool = false
    
    // MARK: - Private Properties
    
    private let networkManager = NetworkManager.shared
    private let defaults = UserDefaults.standard
    
    // Cache keys
    private enum CacheKeys {
        static let dailyFortune = "zodiac_daily_fortune"
        static let yearlyFortune = "zodiac_yearly_fortune"
        static let cacheDate = "zodiac_cache_date"
        static let cachedWesternSign = "zodiac_cached_western"
        static let cachedChineseSign = "zodiac_cached_chinese"
    }
    
    // MARK: - Public Methods
    
    /// Fetch fortune readings for both Western and Chinese zodiac
    /// Checks cache first; only calls API if cache is stale or for different signs
    /// - Parameters:
    ///   - westernSign: Western zodiac name (e.g., "白羊座")
    ///   - chineseSign: Chinese zodiac animal (e.g., "蛇")
    ///   - forceRefresh: If true, bypass cache and fetch fresh data
    func fetchFortune(westernSign: String, chineseSign: String, forceRefresh: Bool = false) async {
        // Check cache first (unless force refresh)
        if !forceRefresh && loadFromCacheIfValid(westernSign: westernSign, chineseSign: chineseSign) {
            return
        }
        
        isLoading = true
        isFromCache = false
        errorMessage = nil
        
        // Construct minimal prompt to save tokens
        let prompt = """
        请通过两个简短的段落，分别描述【\(westernSign)】的今日运势，和【属\(chineseSign)】的本年流年运势。
        格式要求：
        1. [今日星座]
        2. [本年属相]
        """
        
        do {
            // Create a minimal user input (we only need the prompt)
            let dummyInput = UserInput(
                birthYear: 2000,
                month: 1,
                day: 1,
                hour: 12,
                gender: "男"
            )
            
            let response = try await networkManager.fetchAnalysis(
                userData: dummyInput,
                questionType: "星座运势",
                customQuestion: prompt
            )
            
            // Parse the response to extract both fortunes
            parseFortuneResponse(response)
            hasFetched = true
            
            // Save to cache
            saveToCache(westernSign: westernSign, chineseSign: chineseSign)
            
        } catch {
            handleError(error)
        }
        
        isLoading = false
    }
    
    /// Reset the fortune to allow re-fetching
    func reset() {
        dailyFortuneText = ""
        yearlyFortuneText = ""
        hasFetched = false
        isFromCache = false
        errorMessage = nil
    }
    
    /// Clear the cache completely
    func clearCache() {
        defaults.removeObject(forKey: CacheKeys.dailyFortune)
        defaults.removeObject(forKey: CacheKeys.yearlyFortune)
        defaults.removeObject(forKey: CacheKeys.cacheDate)
        defaults.removeObject(forKey: CacheKeys.cachedWesternSign)
        defaults.removeObject(forKey: CacheKeys.cachedChineseSign)
    }
    
    // MARK: - Cache Methods
    
    /// Load from cache if valid (same day and same signs)
    /// - Returns: true if loaded from cache, false otherwise
    private func loadFromCacheIfValid(westernSign: String, chineseSign: String) -> Bool {
        guard let cacheDate = defaults.object(forKey: CacheKeys.cacheDate) as? Date,
              let cachedDaily = defaults.string(forKey: CacheKeys.dailyFortune),
              let cachedYearly = defaults.string(forKey: CacheKeys.yearlyFortune),
              let cachedWestern = defaults.string(forKey: CacheKeys.cachedWesternSign),
              let cachedChinese = defaults.string(forKey: CacheKeys.cachedChineseSign) else {
            return false
        }
        
        // Check if cache is from today and for the same signs
        let calendar = Calendar.current
        let isSameDay = calendar.isDateInToday(cacheDate)
        let isSameSigns = cachedWestern == westernSign && cachedChinese == chineseSign
        
        if isSameDay && isSameSigns {
            dailyFortuneText = cachedDaily
            yearlyFortuneText = cachedYearly
            hasFetched = true
            isFromCache = true
            print("[ZodiacVM] Loaded fortune from cache (cached at \(cacheDate))")
            return true
        }
        
        return false
    }
    
    /// Save current fortune to cache
    private func saveToCache(westernSign: String, chineseSign: String) {
        defaults.set(dailyFortuneText, forKey: CacheKeys.dailyFortune)
        defaults.set(yearlyFortuneText, forKey: CacheKeys.yearlyFortune)
        defaults.set(Date(), forKey: CacheKeys.cacheDate)
        defaults.set(westernSign, forKey: CacheKeys.cachedWesternSign)
        defaults.set(chineseSign, forKey: CacheKeys.cachedChineseSign)
        print("[ZodiacVM] Saved fortune to cache")
    }
    
    // MARK: - Private Methods
    
    private func parseFortuneResponse(_ response: String) {
        // Try to split by numbered sections
        let lines = response.components(separatedBy: "\n")
        var dailyLines: [String] = []
        var yearlyLines: [String] = []
        var currentSection = 0  // 0=none, 1=daily, 2=yearly
        
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            
            if trimmed.contains("1.") || trimmed.contains("今日") || trimmed.contains("星座") {
                currentSection = 1
                // If there's content after the header, include it
                if let afterNumber = trimmed.components(separatedBy: ".").last?.trimmingCharacters(in: .whitespaces),
                   !afterNumber.isEmpty && !afterNumber.contains("今日") && !afterNumber.contains("星座") {
                    dailyLines.append(afterNumber)
                }
            } else if trimmed.contains("2.") || trimmed.contains("本年") || trimmed.contains("属相") {
                currentSection = 2
                // If there's content after the header, include it
                if let afterNumber = trimmed.components(separatedBy: ".").last?.trimmingCharacters(in: .whitespaces),
                   !afterNumber.isEmpty && !afterNumber.contains("本年") && !afterNumber.contains("属相") {
                    yearlyLines.append(afterNumber)
                }
            } else if !trimmed.isEmpty {
                switch currentSection {
                case 1:
                    dailyLines.append(trimmed)
                case 2:
                    yearlyLines.append(trimmed)
                default:
                    // Before any section, assume it's preamble or put in daily
                    break
                }
            }
        }
        
        dailyFortuneText = dailyLines.joined(separator: "\n")
        yearlyFortuneText = yearlyLines.joined(separator: "\n")
        
        // Fallback: if parsing failed, put entire response in daily
        if dailyFortuneText.isEmpty && yearlyFortuneText.isEmpty {
            dailyFortuneText = response
        }
    }
    
    private func handleError(_ error: Error) {
        if let networkError = error as? NetworkError {
            errorMessage = networkError.errorDescription
        } else {
            errorMessage = error.localizedDescription
        }
        showError = true
    }
}
