//
//  FiveElementColor.swift
//  FortuneTeller
//
//  Five Element color definitions for Bazi chart styling.
//

import SwiftUI

/// Five Element (五行) color mapping
enum FiveElement: String, CaseIterable {
    case wood = "木"
    case fire = "火"
    case earth = "土"
    case metal = "金"
    case water = "水"
    
    /// Primary color for the element
    var color: Color {
        switch self {
        case .wood:  return Color(red: 0.2, green: 0.6, blue: 0.3)   // 翠绿
        case .fire:  return Color(red: 0.85, green: 0.2, blue: 0.2)  // 朱红
        case .earth: return Color(red: 0.7, green: 0.55, blue: 0.2)  // 土黄
        case .metal: return Color(red: 0.85, green: 0.7, blue: 0.2)  // 金色
        case .water: return Color(red: 0.2, green: 0.4, blue: 0.7)   // 湛蓝
        }
    }
    
    /// Background color (lighter version)
    var backgroundColor: Color {
        color.opacity(0.15)
    }
    
    /// Determine element from a Heavenly Stem (天干)
    static func fromStem(_ stem: String) -> FiveElement {
        switch stem {
        case "甲", "乙": return .wood
        case "丙", "丁": return .fire
        case "戊", "己": return .earth
        case "庚", "辛": return .metal
        case "壬", "癸": return .water
        default: return .earth
        }
    }
    
    /// Determine element from an Earthly Branch (地支)
    static func fromBranch(_ branch: String) -> FiveElement {
        switch branch {
        case "寅", "卯": return .wood
        case "巳", "午": return .fire
        case "辰", "戌", "丑", "未": return .earth
        case "申", "酉": return .metal
        case "亥", "子": return .water
        default: return .earth
        }
    }
}

/// Color utility for Bazi elements
struct FiveElementColor {
    
    /// Get color for a Heavenly Stem
    static func stemColor(_ stem: String) -> Color {
        FiveElement.fromStem(stem).color
    }
    
    /// Get color for an Earthly Branch
    static func branchColor(_ branch: String) -> Color {
        FiveElement.fromBranch(branch).color
    }
    
    /// Get background color for a Heavenly Stem
    static func stemBackground(_ stem: String) -> Color {
        FiveElement.fromStem(stem).backgroundColor
    }
    
    /// Get background color for an Earthly Branch
    static func branchBackground(_ branch: String) -> Color {
        FiveElement.fromBranch(branch).backgroundColor
    }
}
