//
//  UserProfile.swift
//  FortuneTeller
//
//  User profile model for multi-profile management.
//

import Foundation

/// User profile for fortune analysis
struct UserProfile: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var name: String
    var avatar: String           // SF Symbol name
    var birthDate: Date
    var isLunar: Bool            // Whether birthDate is Lunar calendar
    var birthTime: String        // Chinese Shichen (e.g., "辰时")
    var gender: String           // "男" or "女"
    var location: String         // City name
    
    /// Default avatars for selection
    static let avatarOptions: [String] = [
        "person.circle.fill",
        "star.circle.fill",
        "heart.circle.fill",
        "moon.circle.fill",
        "sun.max.circle.fill",
        "leaf.circle.fill",
        "flame.circle.fill",
        "drop.circle.fill",
        "snowflake.circle.fill",
        "sparkle.magnifyingglass"
    ]
    
    /// Chinese Shichen (时辰) options
    static let shichenOptions: [(label: String, value: String, hours: String)] = [
        ("子时", "子时", "23:00-01:00"),
        ("丑时", "丑时", "01:00-03:00"),
        ("寅时", "寅时", "03:00-05:00"),
        ("卯时", "卯时", "05:00-07:00"),
        ("辰时", "辰时", "07:00-09:00"),
        ("巳时", "巳时", "09:00-11:00"),
        ("午时", "午时", "11:00-13:00"),
        ("未时", "未时", "13:00-15:00"),
        ("申时", "申时", "15:00-17:00"),
        ("酉时", "酉时", "17:00-19:00"),
        ("戌时", "戌时", "19:00-21:00"),
        ("亥时", "亥时", "21:00-23:00")
    ]
    
    /// Convert Shichen to approximate hour for API
    var approximateHour: Int {
        switch birthTime {
        case "子时": return 0
        case "丑时": return 2
        case "寅时": return 4
        case "卯时": return 6
        case "辰时": return 8
        case "巳时": return 10
        case "午时": return 12
        case "未时": return 14
        case "申时": return 16
        case "酉时": return 18
        case "戌时": return 20
        case "亥时": return 22
        default: return 12
        }
    }
    
    /// Extract birth components for API
    var birthYear: Int {
        Calendar.current.component(.year, from: birthDate)
    }
    
    var birthMonth: Int {
        Calendar.current.component(.month, from: birthDate)
    }
    
    var birthDay: Int {
        Calendar.current.component(.day, from: birthDate)
    }
    
    /// Create UserInput for API calls
    func toUserInput() -> UserInput {
        UserInput(
            birthYear: birthYear,
            month: birthMonth,
            day: birthDay,
            hour: approximateHour,
            gender: gender
        )
    }
    
    /// Mock Five Elements energy data (in production, calculate from Bazi)
    var fiveElementsEnergy: [ElementEnergy] {
        [
            ElementEnergy(element: .metal, score: 100, percentage: 0.125),
            ElementEnergy(element: .wood, score: 190, percentage: 0.238),
            ElementEnergy(element: .water, score: 110, percentage: 0.137),
            ElementEnergy(element: .fire, score: 200, percentage: 0.250),
            ElementEnergy(element: .earth, score: 200, percentage: 0.250)
        ]
    }
    
    /// Western Zodiac computed from birth date
    var westernZodiac: ZodiacInfo {
        ZodiacUtils.getWesternZodiac(date: birthDate)
    }
    
    /// Chinese Zodiac animal computed from birth year
    var chineseZodiac: String {
        ZodiacUtils.getChineseZodiac(year: birthYear)
    }
    
    /// Create a sample profile for previews
    static var sample: UserProfile {
        UserProfile(
            name: "张三",
            avatar: "person.circle.fill",
            birthDate: Calendar.current.date(from: DateComponents(year: 1990, month: 6, day: 15))!,
            isLunar: false,
            birthTime: "辰时",
            gender: "男",
            location: "北京"
        )
    }
}
