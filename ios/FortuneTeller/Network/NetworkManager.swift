//
//  NetworkManager.swift
//  FortuneTeller
//
//  Singleton network manager for API communication.
//

import Foundation

/// Singleton class for handling all network requests to the FastAPI backend
final class NetworkManager {
    
    // MARK: - Singleton
    
    static let shared = NetworkManager()
    
    private init() {}
    
    // MARK: - Configuration
    
    /// Base URL for the API (change to production URL when deploying)
    #if DEBUG
    private let baseURL = "http://127.0.0.1:8000"
    #else
    private let baseURL = "https://your-production-api.com"
    #endif
    
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        return URLSession(configuration: config)
    }()
    
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()
    
    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        return encoder
    }()
    
    // MARK: - Public API Methods
    
    /// Fetch Bazi chart data from the API
    /// - Parameter data: User's birth data
    /// - Returns: Structured Bazi chart response
    func fetchChart(data: UserInput) async throws -> BaziChartResponse {
        let url = try buildURL(endpoint: "/api/chart")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(data)
        
        return try await performRequest(request: request, responseType: BaziChartResponse.self)
    }
    
    /// Fetch fortune analysis from the API
    /// - Parameters:
    ///   - userData: User's birth data
    ///   - questionType: Type of analysis (e.g., "整体命格", "事业运势")
    ///   - customQuestion: Optional custom question for "大师解惑"
    /// - Returns: Analysis markdown content
    func fetchAnalysis(
        userData: UserInput,
        questionType: String,
        customQuestion: String? = nil,
        birthplace: String? = nil
    ) async throws -> String {
        let url = try buildURL(endpoint: "/api/analysis")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = AnalysisRequest(
            userData: userData,
            questionType: questionType,
            customQuestion: customQuestion,
            birthplace: birthplace
        )
        request.httpBody = try encoder.encode(requestBody)
        
        let response: AnalysisResponse = try await performRequest(request: request, responseType: AnalysisResponse.self)
        return response.markdownContent
    }
    
    /// Fetch compatibility analysis for two people
    /// - Parameters:
    ///   - userA: First person's birth data
    ///   - userB: Second person's birth data
    ///   - relationType: Relationship type (default: "恋人/伴侣")
    /// - Returns: Compatibility response with score and details
    func fetchCompatibility(
        userA: UserInput,
        userB: UserInput,
        relationType: String = "恋人/伴侣"
    ) async throws -> CompatibilityResponse {
        let url = try buildURL(endpoint: "/api/compatibility")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody: [String: Any] = [
            "user_a_data": [
                "birth_year": userA.birthYear,
                "month": userA.month,
                "day": userA.day,
                "hour": userA.hour,
                "minute": userA.minute,
                "gender": userA.gender
            ],
            "user_b_data": [
                "birth_year": userB.birthYear,
                "month": userB.month,
                "day": userB.day,
                "hour": userB.hour,
                "minute": userB.minute,
                "gender": userB.gender
            ],
            "relation_type": relationType
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        return try await performRequest(request: request, responseType: CompatibilityResponse.self)
    }
    
    /// Health check - verify the API is running
    func healthCheck() async -> Bool {
        guard let url = URL(string: baseURL) else { return false }
        
        do {
            let (_, response) = try await session.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse else { return false }
            return httpResponse.statusCode == 200
        } catch {
            return false
        }
    }
    
    // MARK: - Private Helpers
    
    private func buildURL(endpoint: String) throws -> URL {
        guard let url = URL(string: baseURL + endpoint) else {
            throw NetworkError.invalidURL
        }
        return url
    }
    
    private func performRequest<T: Decodable>(request: URLRequest, responseType: T.Type) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            // Check for successful status codes
            guard (200...299).contains(httpResponse.statusCode) else {
                let message = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NetworkError.serverError(statusCode: httpResponse.statusCode, message: message)
            }
            
            // Decode the response
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw NetworkError.decodingError(error)
            }
            
        } catch let error as NetworkError {
            throw error
        } catch {
            throw NetworkError.unknown(error)
        }
    }
}
