import Foundation

struct ZodiacInfo {
    let name: String
    let icon: String // 例如 "♈️"
    let element: String // 火/土/风/水
}

class ZodiacUtils {
    
    // MARK: - 西方星座 (Western Zodiac)
    static func getWesternZodiac(date: Date) -> ZodiacInfo {
        let calendar = Calendar.current
        let day = calendar.component(.day, from: date)
        let month = calendar.component(.month, from: date)
        
        switch month {
        case 1:  return day >= 20 ? Aquarius : Capricorn
        case 2:  return day >= 19 ? Pisces : Aquarius
        case 3:  return day >= 21 ? Aries : Pisces
        case 4:  return day >= 20 ? Taurus : Aries
        case 5:  return day >= 21 ? Gemini : Taurus
        case 6:  return day >= 22 ? Cancer : Gemini
        case 7:  return day >= 23 ? Leo : Cancer
        case 8:  return day >= 23 ? Virgo : Leo
        case 9:  return day >= 23 ? Libra : Virgo
        case 10: return day >= 24 ? Scorpio : Libra
        case 11: return day >= 23 ? Sagittarius : Scorpio
        case 12: return day >= 22 ? Capricorn : Sagittarius
        default: return Capricorn
        }
    }
    
    // MARK: - 中国属相 (Chinese Zodiac)
    static func getChineseZodiac(year: Int) -> String {
        // 简单算法（基于立春或农历新年的精确算法通常需要查表，但APP常用年份取余做近似展示）
        let animals = ["猴", "鸡", "狗", "猪", "鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊"]
        let index = year % 12
        return animals[index]
    }
    
    // MARK: - 预定义星座数据 (Predefined Zodiac Data)
    static let Aries = ZodiacInfo(name: "白羊座", icon: "♈️", element: "火")
    static let Taurus = ZodiacInfo(name: "金牛座", icon: "♉️", element: "土")
    static let Gemini = ZodiacInfo(name: "双子座", icon: "♊️", element: "风")
    static let Cancer = ZodiacInfo(name: "巨蟹座", icon: "♋️", element: "水")
    static let Leo = ZodiacInfo(name: "狮子座", icon: "♌️", element: "火")
    static let Virgo = ZodiacInfo(name: "处女座", icon: "♍️", element: "土")
    static let Libra = ZodiacInfo(name: "天秤座", icon: "♎️", element: "风")
    static let Scorpio = ZodiacInfo(name: "天蝎座", icon: "♏️", element: "水")
    static let Sagittarius = ZodiacInfo(name: "射手座", icon: "♐️", element: "火")
    static let Capricorn = ZodiacInfo(name: "摩羯座", icon: "♑️", element: "土")
    static let Aquarius = ZodiacInfo(name: "水瓶座", icon: "♒️", element: "风")
    static let Pisces = ZodiacInfo(name: "双鱼座", icon: "♓️", element: "水")
}
