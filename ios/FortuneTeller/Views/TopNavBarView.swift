//
//  TopNavBarView.swift
//  FortuneTeller
//
//  Top navigation bar with avatar and search bar.
//

import SwiftUI

/// Top navigation bar with user avatar and search field
struct TopNavBarView: View {
    
    @State private var searchText = ""
    
    var body: some View {
        HStack(spacing: 12) {
            // User Avatar
            Image(systemName: "person.crop.circle")
                .font(.system(size: 36))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue.opacity(0.7), .purple.opacity(0.7)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            // Search Bar
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                
                TextField("搜索...", text: $searchText)
                    .textFieldStyle(.plain)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                Capsule()
                    .fill(Color(.systemGray6))
            )
        }
        .padding(.horizontal)
    }
}

// MARK: - Preview

#Preview {
    TopNavBarView()
        .padding()
        .background(Color(.systemBackground))
}
