//
//  ProfileManager.swift
//  FortuneTeller
//
//  Manages multiple user profiles with persistence.
//

import Foundation
import SwiftUI

/// Manages user profiles with persistence to UserDefaults
@MainActor
final class ProfileManager: ObservableObject {
    
    // MARK: - Published State
    
    @Published var profiles: [UserProfile] = [] {
        didSet {
            saveProfiles()
        }
    }
    
    // MARK: - Computed Properties
    
    /// The active profile is always the first in the array
    var activeProfile: UserProfile? {
        profiles.first
    }
    
    /// Check if there are any profiles
    var hasProfiles: Bool {
        !profiles.isEmpty
    }
    
    // MARK: - Private Properties
    
    private let storageKey = "fortune_teller_profiles"
    
    // MARK: - Initialization
    
    init() {
        loadProfiles()
    }
    
    // MARK: - Public Methods
    
    /// Set a profile as active by moving it to the front
    func setActive(_ profile: UserProfile) {
        guard let index = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        let selected = profiles.remove(at: index)
        profiles.insert(selected, at: 0)
    }
    
    /// Add a new profile (becomes active by default)
    func add(_ profile: UserProfile) {
        profiles.insert(profile, at: 0)
    }
    
    /// Update an existing profile
    func update(_ profile: UserProfile) {
        guard let index = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        profiles[index] = profile
    }
    
    /// Delete a profile by ID
    func delete(_ id: UUID) {
        profiles.removeAll { $0.id == id }
    }
    
    /// Delete the currently active profile
    func deleteActive() {
        guard !profiles.isEmpty else { return }
        profiles.removeFirst()
    }
    
    // MARK: - Persistence
    
    private func saveProfiles() {
        if let encoded = try? JSONEncoder().encode(profiles) {
            UserDefaults.standard.set(encoded, forKey: storageKey)
        }
    }
    
    private func loadProfiles() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let decoded = try? JSONDecoder().decode([UserProfile].self, from: data) {
            profiles = decoded
        }
    }
    
    /// Clear all profiles (for testing/reset)
    func clearAll() {
        profiles.removeAll()
        UserDefaults.standard.removeObject(forKey: storageKey)
    }
}
