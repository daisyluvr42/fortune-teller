//
//  Models.swift
//  FortuneTeller
//
//  Swift data models matching the FastAPI responses.
//

import Foundation

// MARK: - Request Models

/// User input for Bazi chart calculation
struct UserInput: Codable {
    let birthYear: Int
    let month: Int
    let day: Int
    let hour: Int
    let minute: Int
    let gender: String
    let longitude: Double?
    
    enum CodingKeys: String, CodingKey {
        case birthYear = "birth_year"
        case month
        case day
        case hour
        case minute
        case gender
        case longitude
    }
    
    init(birthYear: Int, month: Int, day: Int, hour: Int, minute: Int = 0, gender: String, longitude: Double? = nil) {
        self.birthYear = birthYear
        self.month = month
        self.day = day
        self.hour = hour
        self.minute = minute
        self.gender = gender
        self.longitude = longitude
    }
}

/// Request for analysis endpoint
struct AnalysisRequest: Codable {
    let userData: UserInput
    let questionType: String
    let customQuestion: String?
    let birthplace: String?
    
    enum CodingKeys: String, CodingKey {
        case userData = "user_data"
        case questionType = "question_type"
        case customQuestion = "custom_question"
        case birthplace
    }
}

// MARK: - Response Models

/// A single pillar (Heavenly Stem + Earthly Branch)
struct Pillar: Codable, Identifiable {
    let gan: String       // 天干 (Heavenly Stem)
    let zhi: String       // 地支 (Earthly Branch)
    let tenGod: String?   // 十神
    let hiddenStems: [String]?  // 藏干
    
    var id: String { "\(gan)\(zhi)" }
    
    enum CodingKeys: String, CodingKey {
        case gan
        case zhi
        case tenGod = "ten_god"
        case hiddenStems = "hidden_stems"
    }
    
    /// Full pillar string (e.g., "甲子")
    var fullName: String {
        "\(gan)\(zhi)"
    }
}

/// Response from /api/chart endpoint
struct BaziChartResponse: Codable {
    let yearPillar: Pillar
    let monthPillar: Pillar
    let dayPillar: Pillar
    let hourPillar: Pillar
    let patternName: String    // 格局名称
    let patternType: String    // 格局类型
    let dayMaster: String      // 日主
    let strength: String       // 身强/身弱
    let joyElements: String    // 喜用神
    let timeCorrection: String? // 真太阳时校正
    
    // Extended professional chart data
    let twelveStages: TwelveStages?  // 十二长生
    let kongWang: [String]?          // 空亡
    let nayin: NayinInfo?            // 纳音
    let shenSha: [String]?           // 神煞
    
    enum CodingKeys: String, CodingKey {
        case yearPillar = "year_pillar"
        case monthPillar = "month_pillar"
        case dayPillar = "day_pillar"
        case hourPillar = "hour_pillar"
        case patternName = "pattern_name"
        case patternType = "pattern_type"
        case dayMaster = "day_master"
        case strength
        case joyElements = "joy_elements"
        case timeCorrection = "time_correction"
        case twelveStages = "twelve_stages"
        case kongWang = "kong_wang"
        case nayin
        case shenSha = "shen_sha"
    }
    
    /// Array of all four pillars for easy iteration
    var allPillars: [(name: String, pillar: Pillar)] {
        [
            ("年柱", yearPillar),
            ("月柱", monthPillar),
            ("日柱", dayPillar),
            ("时柱", hourPillar)
        ]
    }
}

/// Twelve Life Stages (十二长生)
struct TwelveStages: Codable {
    let yearStage: String
    let monthStage: String
    let dayStage: String   // 自坐
    let hourStage: String
    
    enum CodingKeys: String, CodingKey {
        case yearStage = "year_stage"
        case monthStage = "month_stage"
        case dayStage = "day_stage"
        case hourStage = "hour_stage"
    }
    
    /// Array for easy iteration
    var allStages: [String] {
        [yearStage, monthStage, dayStage, hourStage]
    }
}

/// Nayin (纳音) for four pillars
struct NayinInfo: Codable {
    let year: String
    let month: String
    let day: String
    let hour: String
    
    /// Array for easy iteration
    var allNayin: [String] {
        [year, month, day, hour]
    }
}

/// Response from /api/analysis endpoint
struct AnalysisResponse: Codable {
    let topic: String
    let markdownContent: String
    
    enum CodingKeys: String, CodingKey {
        case topic
        case markdownContent = "markdown_content"
    }
}

/// Response from /api/compatibility endpoint
struct CompatibilityResponse: Codable {
    let baseScore: Int
    let details: [String]
    let userASummary: String
    let userBSummary: String
    
    enum CodingKeys: String, CodingKey {
        case baseScore = "base_score"
        case details
        case userASummary = "user_a_summary"
        case userBSummary = "user_b_summary"
    }
}

// MARK: - Error Types

/// Custom error types for network operations
enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(statusCode: Int, message: String)
    case decodingError(Error)
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "无效的请求地址"
        case .invalidResponse:
            return "服务器响应无效"
        case .serverError(let code, let message):
            return "服务器错误 (\(code)): \(message)"
        case .decodingError(let error):
            return "数据解析失败: \(error.localizedDescription)"
        case .unknown(let error):
            return "未知错误: \(error.localizedDescription)"
        }
    }
}
