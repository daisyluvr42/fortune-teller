//
//  ProfileEditView.swift
//  FortuneTeller
//
//  Form for creating or editing user profiles.
//

import SwiftUI

/// Profile creation/edit form
struct ProfileEditView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    @Environment(\.dismiss) private var dismiss
    
    /// Profile being edited (nil for new profile)
    let existingProfile: UserProfile?
    
    // MARK: - Form State
    
    @State private var name: String = ""
    @State private var avatar: String = "person.circle.fill"
    @State private var birthDate: Date = Date()
    @State private var isLunar: Bool = false
    @State private var birthTime: String = "辰时"
    @State private var gender: String = "男"
    @State private var location: String = ""
    
    var isEditing: Bool {
        existingProfile != nil
    }
    
    var body: some View {
        NavigationStack {
            Form {
                // MARK: - Avatar Section
                Section("头像") {
                    avatarPicker
                }
                
                // MARK: - Basic Info
                Section("基本信息") {
                    TextField("姓名", text: $name)
                    
                    Picker("性别", selection: $gender) {
                        Text("男").tag("男")
                        Text("女").tag("女")
                    }
                    .pickerStyle(.segmented)
                }
                
                // MARK: - Birth Info
                Section("出生信息") {
                    DatePicker("出生日期", selection: $birthDate, displayedComponents: .date)
                    
                    Toggle("是农历生日", isOn: $isLunar)
                    
                    Picker("出生时辰", selection: $birthTime) {
                        ForEach(UserProfile.shichenOptions, id: \.value) { option in
                            Text("\(option.label) (\(option.hours))")
                                .tag(option.value)
                        }
                    }
                }
                
                // MARK: - Location
                Section("出生地点") {
                    TextField("城市 (如: 北京)", text: $location)
                }
                
                // MARK: - Delete Button (for existing profiles)
                if isEditing {
                    Section {
                        Button(role: .destructive) {
                            if let profile = existingProfile {
                                profileManager.delete(profile.id)
                            }
                            dismiss()
                        } label: {
                            HStack {
                                Spacer()
                                Text("删除此档案")
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "编辑档案" : "新建档案")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        saveProfile()
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .onAppear {
                loadExistingProfile()
            }
        }
    }
    
    // MARK: - Avatar Picker
    
    private var avatarPicker: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
            ForEach(UserProfile.avatarOptions, id: \.self) { option in
                Button {
                    avatar = option
                } label: {
                    ZStack {
                        Circle()
                            .fill(avatar == option ? Color.blue.opacity(0.2) : Color(.systemGray6))
                            .frame(width: 50, height: 50)
                        
                        Image(systemName: option)
                            .font(.system(size: 22))
                            .foregroundStyle(avatar == option ? .blue : .gray)
                    }
                    .overlay(
                        Circle()
                            .stroke(avatar == option ? Color.blue : Color.clear, lineWidth: 2)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Actions
    
    private func loadExistingProfile() {
        guard let profile = existingProfile else { return }
        name = profile.name
        avatar = profile.avatar
        birthDate = profile.birthDate
        isLunar = profile.isLunar
        birthTime = profile.birthTime
        gender = profile.gender
        location = profile.location
    }
    
    private func saveProfile() {
        let profile = UserProfile(
            id: existingProfile?.id ?? UUID(),
            name: name,
            avatar: avatar,
            birthDate: birthDate,
            isLunar: isLunar,
            birthTime: birthTime,
            gender: gender,
            location: location
        )
        
        if isEditing {
            profileManager.update(profile)
        } else {
            profileManager.add(profile)
        }
    }
}

// MARK: - Preview

#Preview("New Profile") {
    ProfileEditView(existingProfile: nil)
        .environmentObject(ProfileManager())
}

#Preview("Edit Profile") {
    ProfileEditView(existingProfile: UserProfile.sample)
        .environmentObject(ProfileManager())
}
