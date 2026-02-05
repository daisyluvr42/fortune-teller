//
//  FortuneTellerApp.swift
//  FortuneTeller
//
//  Main entry point for the Fortune Teller iOS app.
//

import SwiftUI

@main
struct FortuneTellerApp: App {
    
    @StateObject private var profileManager = ProfileManager()
    
    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(profileManager)
        }
    }
}
